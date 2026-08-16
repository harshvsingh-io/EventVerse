"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { db, Event, PingCategory, Club, User, generateUUID } from "@/lib/db";
import { Plus, Edit, Trash2, Calendar, MapPin, BarChart3, AlertCircle, RefreshCw, Send, CheckCircle } from "lucide-react";

export default function ClubDashboard() {
  const router = useRouter();
  
  // Session & database states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myClub, setMyClub] = useState<Club | null>(null);
  const [categories, setCategories] = useState<PingCategory[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Cooldown states
  const [cooldown, setCooldown] = useState({ remainingMs: 0, isBlocked: false, formatted: "" });

  // Event modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState("");
  const [catId, setCatId] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [regLink, setRegLink] = useState("");
  const [status, setStatus] = useState<'draft' | 'published'>("published");

  // Notification action states
  const [notifyWeb, setNotifyWeb] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [showPingModal, setShowPingModal] = useState(false);
  const [pingTargetEvent, setPingTargetEvent] = useState<Event | null>(null);
  const [testEmail, setTestEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const user = db.getCurrentUser();
    if (!user || user.role !== "club_admin") {
      router.push("/feed");
      return;
    }
    setCurrentUser(user);
    
    // Find the club managed by this user
    const clubs = db.getClubs();
    const club = clubs.find(c => c.adminUserId === user.id);
    if (!club) {
      setError("No club registered for this administrator.");
      setLoading(false);
      return;
    }
    setMyClub(club);

    // Initial load
    loadClubData(club.id, user.collegeId);
    
    // Set up cooldown live timer interval
    const timer = setInterval(() => {
      updateCooldownStatus(club.id);
    }, 1000);

    setLoading(false);
    return () => clearInterval(timer);
  }, []);

  const loadClubData = (clubId: string, collegeId: string) => {
    // Read operations
    const allEvents = db.getEvents();
    const clubEvents = allEvents.filter(e => e.clubId === clubId);
    const collegeCats = db.getIsolatedCategories(collegeId);

    setEvents(clubEvents);
    setCategories(collegeCats);
    updateCooldownStatus(clubId);
  };

  const updateCooldownStatus = (clubId: string) => {
    const status = db.getCooldownRemaining(clubId);
    setCooldown(status);
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingEventId(null);
    setTitle("");
    setCatId(categories[0]?.id || "");
    setBannerUrl("https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60");
    setDescription("");
    setVenue("");
    setDate("");
    setRegLink("");
    setStatus("published");
    setError("");
    setShowEventModal(true);
  };

  const handleOpenEditModal = (event: Event) => {
    setIsEditing(true);
    setEditingEventId(event.id);
    setTitle(event.title);
    setCatId(event.pingCategoryId);
    setBannerUrl(event.bannerImageUrl || "");
    setDescription(event.description || "");
    setVenue(event.venue);
    setDate(event.eventDate.split(".")[0]); // Remove milliseconds for datetime-local input
    setRegLink(event.registrationLink || "");
    setStatus(event.status);
    setError("");
    setShowEventModal(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!myClub || !currentUser) return;

    if (!title || !catId || !venue || !date) {
      setError("Please fill in all required fields (Title, Category, Venue, Date)");
      return;
    }

    const currentEvents = db.getEvents();

    if (isEditing && editingEventId) {
      const idx = currentEvents.findIndex(ev => ev.id === editingEventId);
      if (idx !== -1) {
        currentEvents[idx] = {
          ...currentEvents[idx],
          title,
          pingCategoryId: catId,
          bannerImageUrl: bannerUrl,
          description,
          venue,
          eventDate: new Date(date).toISOString(),
          registrationLink: regLink,
          status,
          updatedAt: new Date().toISOString()
        };
        db.setEvents(currentEvents);
        setSuccess("Event updated successfully!");
      }
    } else {
      const newEvent: Event = {
        id: generateUUID(),
        clubId: myClub.id,
        collegeId: currentUser.collegeId,
        pingCategoryId: catId,
        title,
        bannerImageUrl: bannerUrl,
        description,
        venue,
        eventDate: new Date(date).toISOString(),
        registrationLink: regLink,
        status,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      currentEvents.unshift(newEvent);
      db.setEvents(currentEvents);
      setSuccess("Event created successfully!");
    }

    setShowEventModal(false);
    loadClubData(myClub.id, currentUser.collegeId);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!myClub || !currentUser) return;
    if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      const allEvents = db.getEvents();
      const filtered = allEvents.filter(e => e.id !== eventId);
      db.setEvents(filtered);
      setSuccess("Event deleted successfully!");
      loadClubData(myClub.id, currentUser.collegeId);
    }
  };

  const handleOpenPingModal = (event: Event) => {
    setPingTargetEvent(event);
    setShowPingModal(true);
  };

  const handleSendPing = async () => {
    if (!myClub || !pingTargetEvent || !currentUser) return;
    setError("");
    setSuccess("");

    // 1. Trigger local database log
    const result = db.sendEventNotification(
      pingTargetEvent.id,
      pingTargetEvent.pingCategoryId,
      notifyWeb,
      notifyEmail
    );

    if (!result.success) {
      setError(result.error || "Failed to send notification.");
      return;
    }

    // 2. Dispatch real API requests for email notifications
    if (notifyEmail || testEmail.trim()) {
      const subs = db.getSubscriptions().filter(s => s.categoryId === pingTargetEvent.pingCategoryId);
      const subUserIds = new Set(subs.map(s => s.userId));
      const targetUsers = db.getUsers().filter(u => u.collegeId === pingTargetEvent.collegeId && subUserIds.has(u.id));
      const category = categories.find(c => c.id === pingTargetEvent.pingCategoryId);

      const recipientEmails = new Set<string>();
      if (notifyEmail) {
        targetUsers.forEach(u => recipientEmails.add(u.email));
      }
      if (testEmail.trim()) {
        recipientEmails.add(testEmail.trim());
      }

      try {
        const fetchPromises = Array.from(recipientEmails).map(email => 
          fetch("/api/send-ping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email,
              eventTitle: pingTargetEvent.title,
              clubName: myClub.name,
              categoryName: category?.name || "Campus Events",
              eventDescription: pingTargetEvent.description,
              venue: pingTargetEvent.venue,
              date: pingTargetEvent.eventDate,
              regLink: pingTargetEvent.registrationLink,
              bannerUrl: pingTargetEvent.bannerImageUrl,
              clubLogo: myClub.logoUrl,
              eventUrl: `${window.location.origin}/events/${pingTargetEvent.id}`
            })
          })
        );
        
        await Promise.all(fetchPromises);
        console.log(`[Announcements] Dispatched emails to ${recipientEmails.size} recipients:`, Array.from(recipientEmails));
      } catch (err) {
        console.error("Error triggering Resend email endpoint:", err);
      }
    }

    setSuccess(`Ping blast sent successfully via ${notifyWeb ? 'Web' : ''} ${(notifyEmail || testEmail.trim()) ? 'and Email' : ''}!`);
    setShowPingModal(false);
    loadClubData(myClub.id, currentUser.collegeId);
  };

  if (!currentUser || !myClub) return null;

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col">
      <Header />

      {/* Alert Messaging */}
      {(success || error) && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6">
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-semibold">{success}</p>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Col Span 2): Events Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-2xl text-white">My Managed Events</h2>
              <p className="text-xs text-gray-400">Club: {myClub.name}</p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl py-2.5 px-4 font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-primary/20 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          </div>

          {events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {events.map((event) => {
                const category = categories.find(c => c.id === event.pingCategoryId);
                return (
                  <div key={event.id} className="glass-card rounded-xl p-4.5 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      
                      {/* Banner Image & Badges */}
                      <div className="relative h-32 w-full rounded-lg overflow-hidden border border-white/5 bg-gray-900">
                        {event.bannerImageUrl && (
                          <img
                            src={event.bannerImageUrl}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          <span className={`text-[8px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full ${
                            event.status === 'published' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {event.status}
                          </span>
                        </div>
                        {category && (
                          <span
                            className="absolute bottom-2 right-2 text-[8px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded border"
                            style={{
                              borderColor: `${category.color}40`,
                              backgroundColor: `${category.color}15`,
                              color: category.color
                            }}
                          >
                            {category.name}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1 leading-snug">{event.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1.5">
                          <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                          <span>{new Date(event.eventDate).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit" })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-brand-secondary" />
                          <span className="truncate">{event.venue}</span>
                        </div>
                      </div>

                    </div>

                    {/* Footer Controls */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(event)}
                          className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-300 hover:text-white hover:border-white/10"
                          title="Edit Event"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-red-400 hover:border-red-500/20"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {event.status === "published" && (
                        <button
                          onClick={() => handleOpenPingModal(event)}
                          disabled={cooldown.isBlocked}
                          className={`flex items-center gap-1 py-1.5 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide cursor-pointer transition-all ${
                            cooldown.isBlocked
                              ? "bg-gray-800 border border-white/5 text-gray-500 cursor-not-allowed"
                              : "bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md shadow-brand-primary/10"
                          }`}
                        >
                          <Send className="w-3 h-3" />
                          <span>Blast Ping</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl space-y-3">
              <p className="text-sm text-gray-400">No events created by your club yet.</p>
              <button
                onClick={handleOpenCreateModal}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-xs py-2 px-4 rounded-xl"
              >
                Create Your First Event
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Cooldown & Analytics */}
        <div className="space-y-6">
          
          {/* Cooldown Tracker Widget */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <RefreshCw className="w-4 h-4 text-brand-secondary" />
              <span>Ping Broadcast Cooldown</span>
            </h3>
            {cooldown.isBlocked ? (
              <div className="space-y-2.5 bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-brand-primary">
                  <AlertCircle className="w-4.5 h-4.5" />
                  <span className="font-bold text-xs uppercase tracking-wide">Blast Locked</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Campus broadcasts are limited to once every 48 hours to protect student inboxes.
                </p>
                <div className="text-center pt-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Next blast available in</p>
                  <p className="text-2xl font-display font-bold text-white tracking-wider mt-1">{cooldown.formatted}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-4.5 h-4.5" />
                  <span className="font-bold text-xs uppercase tracking-wide">Blast Ready</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  You are cleared to send a notification blast to all subscribers for your published events.
                </p>
              </div>
            )}
            <div className="text-[10px] text-gray-500 leading-normal bg-white/5 p-3 rounded-lg border border-white/5">
              💡 <span className="font-semibold text-gray-400">Pro tip:</span> If you have multiple events queued, EventVerse automatically bundles them into a single email digest to respect subscribers!
            </div>
          </div>

          {/* SVG Analytics Bar Chart */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <BarChart3 className="w-4 h-4 text-brand-primary" />
              <span>Event Analytics</span>
            </h3>
            
            {/* SVG graph */}
            <div className="space-y-4">
              <p className="text-[10px] text-gray-400">Comparative student engagement (Likes vs. Comments count per event)</p>
              
              {events.length > 0 ? (
                <div className="h-48 w-full flex items-end justify-around border-b border-white/10 pb-2 pt-4">
                  {events.slice(0, 3).map((e, idx) => {
                    const l = db.getLikes().filter(lk => lk.eventId === e.id).length;
                    const c = db.getEventComments().filter(cm => cm.eventId === e.id).length;
                    
                    const maxVal = Math.max(1, ...events.map(ev => {
                      const lk = db.getLikes().filter(l => l.eventId === ev.id).length;
                      const cm = db.getEventComments().filter(c => c.eventId === ev.id).length;
                      return lk + cm;
                    }));

                    const likeHeight = Math.max(10, (l / maxVal) * 100);
                    const commentHeight = Math.max(10, (c / maxVal) * 100);

                    return (
                      <div key={e.id} className="flex flex-col items-center gap-2 w-16">
                        <div className="flex items-end gap-1.5 h-32">
                          {/* Like Bar */}
                          <div 
                            className="w-4 bg-gradient-to-t from-pink-600 to-pink-400 rounded-t-sm relative group cursor-help"
                            style={{ height: `${likeHeight}%` }}
                            title={`${l} Likes`}
                          ></div>
                          {/* Comment Bar */}
                          <div 
                            className="w-4 bg-gradient-to-t from-brand-secondary to-blue-400 rounded-t-sm relative group cursor-help"
                            style={{ height: `${commentHeight}%` }}
                            title={`${c} Comments`}
                          ></div>
                        </div>
                        <span className="text-[9px] text-gray-400 truncate w-full text-center" title={e.title}>
                          E{idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-gray-500">
                  Create events to see engagement graphs.
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-pink-500 rounded-sm"></span>
                  <span className="text-gray-400">Likes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-brand-secondary rounded-sm"></span>
                  <span className="text-gray-400">Comments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* EVENT FORM MODAL */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-2xl p-6 sm:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto relative">
            <h3 className="font-display font-bold text-xl text-white mb-6">
              {isEditing ? "Edit Event Details" : "Create New Event"}
            </h3>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Event Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. AstroCode Hackathon"
                    className="w-full glass-input rounded-xl p-3 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Ping Category *</label>
                  <select
                    value={catId}
                    onChange={(e) => setCatId(e.target.value)}
                    className="w-full glass-input rounded-xl p-3 text-xs bg-[#0c0c16]"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-[#0c0c16] text-white">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Banner Image URL</label>
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full glass-input rounded-xl p-3 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell students what this event is about..."
                  rows={4}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Venue *</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Labs Room 302"
                    className="w-full glass-input rounded-xl p-3 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full glass-input rounded-xl p-3 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">External Registration Link</label>
                  <input
                    type="url"
                    value={regLink}
                    onChange={(e) => setRegLink(e.target.value)}
                    placeholder="https://yourclub.dev/register"
                    className="w-full glass-input rounded-xl p-3 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Post Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                    className="w-full glass-input rounded-xl p-3 text-xs bg-[#0c0c16]"
                    required
                  >
                    <option value="published" className="bg-[#0c0c16] text-white">Published (Public)</option>
                    <option value="draft" className="bg-[#0c0c16] text-white">Draft (Internal Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4.5 py-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl py-2.5 px-5 font-semibold text-xs"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PING INBOX BLAST MODAL */}
      {showPingModal && pingTargetEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 sm:p-8 w-full max-w-md relative">
            <h3 className="font-display font-bold text-xl text-white mb-2 flex items-center gap-1.5">
              <Send className="w-5 h-5 text-brand-primary" />
              <span>Broadcasting Blast</span>
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Trigger instant notifications across campus to subscribers of <span className="text-white font-semibold">"{categories.find(c => c.id === pingTargetEvent.pingCategoryId)?.name}"</span>.
            </p>

            {/* Digest Preview */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3 mb-6">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Digest Preview</p>
              <div className="flex items-center gap-2.5">
                <img
                  src={myClub.logoUrl}
                  alt={myClub.name}
                  className="w-6 h-6 rounded-full object-cover border border-white/10"
                />
                <h5 className="font-bold text-xs text-white">{myClub.name}</h5>
              </div>
              <h4 className="font-bold text-sm text-gray-200 pl-8">📢 New Event Blast: {pingTargetEvent.title}</h4>
              <p className="text-[10px] text-gray-400 pl-8 leading-relaxed truncate">{pingTargetEvent.description}</p>
            </div>

            {/* Channels Select */}
            <div className="space-y-4.5 mb-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="notifyWeb"
                  checked={notifyWeb}
                  onChange={(e) => setNotifyWeb(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="notifyWeb" className="text-xs font-semibold text-gray-300">
                  Notify on Web (In-app Notification Bell)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="notifyEmail"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="notifyEmail" className="text-xs font-semibold text-gray-300">
                  Notify via Email (Resend API template)
                </label>
              </div>
            </div>

            {/* Test Email Input */}
            <div className="space-y-1.5 mb-6 pt-3 border-t border-white/5">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                Send Test Copy Directly (Optional)
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="e.g. judge-email@gmail.com"
                className="w-full glass-input rounded-xl p-2.5 text-xs text-white bg-white/5 border border-white/5 focus:border-brand-primary"
              />
              <p className="text-[9px] text-gray-500">
                Enter any email to receive a live announcement email directly, bypassing student subscription rules.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setTestEmail("");
                  setShowPingModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSendPing}
                disabled={!notifyWeb && !notifyEmail && !testEmail.trim()}
                className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Fire Broadcast</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
