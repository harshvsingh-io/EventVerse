"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { db, Event, PingCategory, Club, User, CommunityPost, generateUUID } from "@/lib/db";
import { Shield, Users, RefreshCw, Layers, Check, Trash2, ShieldAlert, Plus, Award, AlertTriangle, BarChart3 } from "lucide-react";

export default function CollegeDashboard() {
  const router = useRouter();
  
  // Session & database states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<PingCategory[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [flaggedPosts, setFlaggedPosts] = useState<CommunityPost[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"moderation" | "clubs" | "categories" | "analytics">("moderation");
  const [loading, setLoading] = useState(true);

  // Form states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#8B5CF6");
  const [newCatIcon, setNewCatIcon] = useState("tag");

  // Invite club admin states
  const [showClubModal, setShowClubModal] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [newClubDesc, setNewClubDesc] = useState("");
  const [newClubEmail, setNewClubEmail] = useState("");
  const [newClubAdminName, setNewClubAdminName] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const user = db.getCurrentUser();
    if (!user || user.role !== "college_admin") {
      router.push("/feed");
      return;
    }
    setCurrentUser(user);
    loadData(user);
    setLoading(false);
  }, []);

  const loadData = (user: User) => {
    // Isolated reads for that college
    const collegeCats = db.getIsolatedCategories(user.collegeId);
    const collegeClubs = db.getIsolatedClubs(user.collegeId);
    const collegeEvents = db.getIsolatedEvents(user.collegeId);
    const collegePosts = db.getIsolatedPosts(user.collegeId).filter(p => p.flagged);
    const allUsers = db.getUsers().filter(u => u.collegeId === user.collegeId);

    setCategories(collegeCats);
    setClubs(collegeClubs);
    setEvents(collegeEvents);
    setFlaggedPosts(collegePosts);
    setUsers(allUsers);
  };

  // Override cooldown
  const handleOverrideCooldown = (clubId: string) => {
    if (!currentUser) return;
    const currentClubs = db.getClubs();
    const idx = currentClubs.findIndex(c => c.id === clubId);
    if (idx !== -1) {
      currentClubs[idx] = {
        ...currentClubs[idx],
        lastPingSentAt: null // clear cooldown
      };
      db.setClubs(currentClubs);
      setSuccess(`Emergency Override: Cooldown reset successfully for ${currentClubs[idx].name}.`);
      loadData(currentUser);
    }
  };

  // Add ping category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newCatName) return;

    const currentCats = db.getCategories();
    const exists = currentCats.some(c => c.collegeId === currentUser.collegeId && c.name.toLowerCase() === newCatName.toLowerCase());
    if (exists) {
      setError("Category with this name already exists in this college.");
      return;
    }

    const newCat: PingCategory = {
      id: generateUUID(),
      collegeId: currentUser.collegeId,
      name: newCatName,
      color: newCatColor,
      icon: newCatIcon,
      createdAt: new Date().toISOString()
    };

    currentCats.push(newCat);
    db.setCategories(currentCats);
    setShowCategoryModal(false);
    setNewCatName("");
    setSuccess("Category added successfully!");
    loadData(currentUser);
  };

  const handleDeleteCategory = (catId: string) => {
    if (!currentUser) return;
    if (confirm("Are you sure? Events under this category will remain, but the category itself will be deleted.")) {
      const currentCats = db.getCategories();
      const filtered = currentCats.filter(c => c.id !== catId);
      db.setCategories(filtered);
      setSuccess("Category deleted successfully.");
      loadData(currentUser);
    }
  };

  // Add new club & admin user
  const handleCreateClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newClubName || !newClubEmail || !newClubAdminName) return;

    // Check if user exists
    const currentUsers = db.getUsers();
    if (currentUsers.some(u => u.email.toLowerCase() === newClubEmail.toLowerCase())) {
      setError("An administrator with this email is already registered.");
      return;
    }

    const newUserId = generateUUID();
    const newAdmin: User = {
      id: newUserId,
      collegeId: currentUser.collegeId,
      name: newClubAdminName,
      email: newClubEmail,
      role: 'club_admin',
      emailVerified: true,
      createdAt: new Date().toISOString()
    };

    const newClubId = generateUUID();
    const newClub: Club = {
      id: newClubId,
      collegeId: currentUser.collegeId,
      name: newClubName,
      logoUrl: 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=100&auto=format&fit=crop&q=60',
      description: newClubDesc || "Official campus club.",
      adminUserId: newUserId,
      lastPingSentAt: null,
      createdAt: new Date().toISOString()
    };

    currentUsers.push(newAdmin);
    db.setUsers(currentUsers);

    const currentClubs = db.getClubs();
    currentClubs.push(newClub);
    db.setClubs(currentClubs);

    setShowClubModal(false);
    setNewClubName("");
    setNewClubDesc("");
    setNewClubEmail("");
    setNewClubAdminName("");
    setSuccess("Club registered and Club Admin credentials generated!");
    loadData(currentUser);
  };

  const handleRemoveClub = (clubId: string, adminUserId: string) => {
    if (!currentUser) return;
    if (confirm("Are you sure you want to remove this club and its administrator?")) {
      const currentClubs = db.getClubs().filter(c => c.id !== clubId);
      db.setClubs(currentClubs);

      const currentUsers = db.getUsers().filter(u => u.id !== adminUserId);
      db.setUsers(currentUsers);

      setSuccess("Club and its admin removed.");
      loadData(currentUser);
    }
  };

  // Moderate flagged post
  const handleResolveFlag = (postId: string, keep: boolean) => {
    if (!currentUser) return;
    const currentPosts = db.getPosts();
    const idx = currentPosts.findIndex(p => p.id === postId);
    
    if (idx !== -1) {
      if (keep) {
        // Resolve without action: unflag
        currentPosts[idx].flagged = false;
      } else {
        // Remove post entirely
        currentPosts.splice(idx, 1);
      }
      db.setPosts(currentPosts);
      setSuccess(keep ? "Flag resolved (post kept)." : "Flagged post deleted successfully.");
      loadData(currentUser);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col">
      <Header />

      {/* Messages banner */}
      {(success || error) && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6">
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">
              <p className="text-xs font-semibold flex items-center gap-1.5"><Check className="w-4 h-4" /> {success}</p>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
              <p className="text-xs font-semibold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {error}</p>
            </div>
          )}
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        
        {/* Top summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Active Clubs</p>
              <h3 className="text-2xl font-display font-bold text-white mt-0.5">{clubs.length}</h3>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Campus Students</p>
              <h3 className="text-2xl font-display font-bold text-white mt-0.5">{users.filter(u => u.role === "student").length}</h3>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-500">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Events</p>
              <h3 className="text-2xl font-display font-bold text-white mt-0.5">{events.length}</h3>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Flagged Posts</p>
              <h3 className="text-2xl font-display font-bold text-white mt-0.5">{flaggedPosts.length}</h3>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/5 pb-2 gap-4">
          {[
            { id: "moderation", label: "Moderation Queue", icon: ShieldAlert },
            { id: "clubs", label: "Club Management", icon: Users },
            { id: "categories", label: "Ping Categories", icon: Layers },
            { id: "analytics", label: "Campus Analytics", icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 pb-2 text-xs font-semibold tracking-wide border-b-2 cursor-pointer transition-all ${
                  activeTab === tab.id
                    ? "border-brand-primary text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}

        {/* TAB 1: MODERATION QUEUE */}
        {activeTab === "moderation" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Community Flagged Feed</h3>
                <p className="text-xs text-gray-400">Review Reddit-style posts reported by students.</p>
              </div>
            </div>

            {flaggedPosts.length > 0 ? (
              <div className="space-y-4">
                {flaggedPosts.map((post) => (
                  <div key={post.id} className="glass-card rounded-xl p-5 space-y-4 border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-200">{post.userName}</span>
                        <span className="text-[10px] text-gray-400 bg-white/5 py-0.5 px-2 rounded-full uppercase">{post.userRole}</span>
                      </div>
                      <span className="text-gray-500">{new Date(post.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-white">{post.title}</h4>
                      <p className="text-xs text-gray-300 leading-relaxed">{post.body}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Flagged by community review</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolveFlag(post.id, true)}
                          className="bg-green-500/10 hover:bg-green-500/20 text-green-400 py-1.5 px-3 rounded-lg border border-green-500/20 text-xs font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Keep</span>
                        </button>
                        <button
                          onClick={() => handleResolveFlag(post.id, false)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 px-3 rounded-lg border border-red-500/20 text-xs font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Post</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl">
                <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Moderation queue is clean. No flagged community posts!</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CLUB MANAGEMENT & COOLDOWNS */}
        {activeTab === "clubs" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Campus Clubs & Broadcasters</h3>
                <p className="text-xs text-gray-400">Oversee club administrators and manage their cooldown override statuses.</p>
              </div>
              <button
                onClick={() => {
                  setError("");
                  setShowClubModal(true);
                }}
                className="bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl py-2 px-4 font-semibold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Club</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clubs.map((club) => {
                const admin = users.find(u => u.id === club.adminUserId);
                const cdStatus = db.getCooldownRemaining(club.id);

                return (
                  <div key={club.id} className="glass-card rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={club.logoUrl}
                        alt={club.name}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-white">{club.name}</h4>
                        <p className="text-[10px] text-gray-400">Admin: {admin?.name || "Unassigned"} ({admin?.email})</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Broadcast Status</span>
                        {cdStatus.isBlocked ? (
                          <span className="text-xs font-semibold text-orange-400">Locked ({cdStatus.formatted})</span>
                        ) : (
                          <span className="text-xs font-semibold text-green-400">Cleared</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {club.lastPingSentAt && (
                          <button
                            onClick={() => handleOverrideCooldown(club.id)}
                            className="bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary py-1.5 px-3 rounded-lg border border-brand-secondary/20 text-[10px] uppercase font-bold flex items-center gap-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Reset Cooldown</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleRemoveClub(club.id, club.adminUserId)}
                          className="bg-transparent border border-white/5 text-gray-500 hover:text-red-400 hover:border-red-500/20 p-2 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Uploaded Events Log */}
            <div className="space-y-4 pt-6 border-t border-white/5">
              <div>
                <h4 className="font-display font-bold text-base text-white">Recent Club Uploads & Broadcast Activity</h4>
                <p className="text-xs text-gray-400">Track which club uploaded what event, who posted it, and reset their cooldown limits.</p>
              </div>

              {events.length > 0 ? (
                <div className="glass-card rounded-xl overflow-hidden border border-white/5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/2">
                          <th className="p-3 font-semibold text-gray-400">Event Title</th>
                          <th className="p-3 font-semibold text-gray-400">Club</th>
                          <th className="p-3 font-semibold text-gray-400">Uploaded On</th>
                          <th className="p-3 font-semibold text-gray-400">Posted By</th>
                          <th className="p-3 font-semibold text-gray-400">Status</th>
                          <th className="p-3 font-semibold text-gray-400 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-y-white/5">
                        {events.map((event) => {
                          const eventClub = clubs.find(c => c.id === event.clubId);
                          const creator = users.find(u => u.id === event.createdBy);
                          return (
                            <tr key={event.id} className="hover:bg-white/1 text-gray-300">
                              <td className="p-3 font-semibold text-white">{event.title}</td>
                              <td className="p-3">{eventClub?.name || "Unknown Club"}</td>
                              <td className="p-3">{new Date(event.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="p-3">{creator?.name || "Club Representative"}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${event.status === 'published' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                                  {event.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                {eventClub?.lastPingSentAt && (
                                  <button
                                    onClick={() => handleOverrideCooldown(eventClub.id)}
                                    className="bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary py-1 px-2.5 rounded-lg border border-brand-secondary/20 text-[9px] uppercase font-bold inline-flex items-center gap-1"
                                    title="Reset this club's cooldown"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Reset Cooldown</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-white/5 rounded-xl">
                  <p className="text-xs text-gray-500">No events uploaded by any club yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Ping Categories</h3>
                <p className="text-xs text-gray-400">Configure notification channels whitelisted on campus.</p>
              </div>
              <button
                onClick={() => {
                  setError("");
                  setShowCategoryModal(true);
                }}
                className="bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl py-2 px-4 font-semibold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="glass-card rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: cat.color }}></span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{cat.name}</h4>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Award className="w-3 h-3 text-brand-primary" />
                        <span>Subscribed: {db.getSubscriptions().filter(s => s.categoryId === cat.id).length} users</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CAMPUS ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Subscriber Growth per Ping */}
            <div className="glass-card rounded-xl p-5 space-y-4">
              <h4 className="font-display font-bold text-sm text-white border-b border-white/5 pb-2">Category Subscriptions distribution</h4>
              
              <div className="space-y-4">
                {categories.map((cat) => {
                  const subCount = db.getSubscriptions().filter(s => s.categoryId === cat.id).length;
                  const totalUsers = users.filter(u => u.role === "student").length || 1;
                  const percent = Math.min(100, Math.max(5, (subCount / totalUsers) * 100));

                  return (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-200">{cat.name}</span>
                        <span className="text-gray-400">{subCount} subs ({Math.round((subCount/totalUsers)*100)}%)</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: cat.color,
                            boxShadow: `0 0 8px ${cat.color}60`
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Most Active Clubs */}
            <div className="glass-card rounded-xl p-5 space-y-4">
              <h4 className="font-display font-bold text-sm text-white border-b border-white/5 pb-2">Clubs Event Announcements count</h4>
              
              {clubs.length > 0 ? (
                <div className="h-48 w-full flex items-end justify-around border-b border-white/10 pb-2 pt-4">
                  {clubs.map((club, idx) => {
                    const cEvents = events.filter(e => e.clubId === club.id).length;
                    const maxEvents = Math.max(1, ...clubs.map(c => events.filter(e => e.clubId === c.id).length));
                    const barHeight = Math.max(10, (cEvents / maxEvents) * 100);

                    return (
                      <div key={club.id} className="flex flex-col items-center gap-2 w-20">
                        <div className="flex items-end h-32 w-full justify-center">
                          <div
                            className="w-6 bg-gradient-to-t from-brand-primary to-brand-secondary rounded-t-md relative group cursor-help"
                            style={{ height: `${barHeight}%` }}
                            title={`${cEvents} Events`}
                          ></div>
                        </div>
                        <span className="text-[9px] text-gray-400 truncate w-full text-center" title={club.name}>
                          {club.name.split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-gray-500">
                  No clubs found.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CATEGORY DIALOG */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-display font-bold text-lg text-white mb-4">Add Notification Channel</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Channel Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Esports"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Badges Accent Color</label>
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-full glass-input rounded-xl p-2 h-10"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-xs border border-white/5 bg-white/5 hover:bg-white/10 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold py-2 px-4 rounded-lg"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLUB DIALOG */}
      {showClubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-xl p-6 sm:p-8 w-full max-w-md">
            <h3 className="font-display font-bold text-lg text-white mb-6">Register Campus Club</h3>
            <form onSubmit={handleCreateClub} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Club Name *</label>
                <input
                  type="text"
                  placeholder="e.g. MUJ Gaming Guild"
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Description</label>
                <textarea
                  placeholder="What is this club's role?"
                  value={newClubDesc}
                  onChange={(e) => setNewClubDesc(e.target.value)}
                  rows={2}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                />
              </div>

              <div className="border-t border-white/5 pt-4 my-2">
                <p className="text-[10px] text-brand-secondary uppercase font-semibold tracking-wider mb-2">Club Administrator Credentials</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-medium">Admin Full Name *</label>
                    <input
                      type="text"
                      placeholder="Pranav Goel"
                      value={newClubAdminName}
                      onChange={(e) => setNewClubAdminName(e.target.value)}
                      className="w-full glass-input rounded-xl p-3 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-medium">Admin Email Address *</label>
                    <input
                      type="email"
                      placeholder="admin@college.domain"
                      value={newClubEmail}
                      onChange={(e) => setNewClubEmail(e.target.value)}
                      className="w-full glass-input rounded-xl p-3 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowClubModal(false)}
                  className="px-4 py-2.5 text-xs border border-white/5 bg-white/5 hover:bg-white/10 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold py-2.5 px-4 rounded-lg"
                >
                  Save & Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
