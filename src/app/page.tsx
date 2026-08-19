"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { db, Event, PingCategory, Club, User } from "@/lib/db";
import { Search, MapPin, Calendar, Heart, MessageSquare, Share2, Bookmark, Check, ShieldAlert, ArrowUpRight, TrendingUp } from "lucide-react";

export default function FeedPage() {
  const router = useRouter();
  
  // Database states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<PingCategory[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [saves, setSaves] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [shareToast, setShareToast] = useState("");

  useEffect(() => {
    const user = db.getCurrentUser();
    if (!user) {
      router.push("/");
      return;
    }
    setCurrentUser(user);

    // Initial load
    loadData(user);
    setLoading(false);
  }, []);

  const loadData = (user: User) => {
    // Row Level Security Sim: only load events for current college
    const collegeEvents = db.getIsolatedEvents(user.collegeId).filter(e => e.status === "published");
    const collegeCats = db.getIsolatedCategories(user.collegeId);
    const collegeClubs = db.getIsolatedClubs(user.collegeId);
    
    // Load subscriptions
    const mySubs = db.getSubscriptions()
      .filter(s => s.userId === user.id)
      .map(s => s.categoryId);

    // Load likes
    const myLikes = db.getLikes()
      .filter(l => l.userId === user.id)
      .map(l => l.eventId);

    // Load saves
    const mySaves = db.getSaves()
      .filter(s => s.userId === user.id)
      .map(s => s.eventId);

    setEvents(collegeEvents);
    setCategories(collegeCats);
    setClubs(collegeClubs);
    setSubscriptions(mySubs);
    setLikes(myLikes);
    setSaves(mySaves);
  };

  const handleToggleLike = (eventId: string) => {
    if (!currentUser) return;
    const currentLikes = db.getLikes();
    const isLiked = likes.includes(eventId);
    
    let updatedLikes;
    if (isLiked) {
      updatedLikes = currentLikes.filter(l => !(l.userId === currentUser.id && l.eventId === eventId));
    } else {
      updatedLikes = [...currentLikes, { userId: currentUser.id, eventId }];
    }

    db.setLikes(updatedLikes);
    loadData(currentUser);
  };

  const handleToggleSave = (eventId: string) => {
    if (!currentUser) return;
    const currentSaves = db.getSaves();
    const isSaved = saves.includes(eventId);

    let updatedSaves;
    if (isSaved) {
      updatedSaves = currentSaves.filter(s => !(s.userId === currentUser.id && s.eventId === eventId));
    } else {
      updatedSaves = [...currentSaves, { userId: currentUser.id, eventId }];
    }

    db.setSaves(updatedSaves);
    loadData(currentUser);
  };

  const handleShare = (event: Event) => {
    const url = `${window.location.origin}/events/${event.id}`;
    navigator.clipboard.writeText(url);
    setShareToast(`Copied details link to clipboard!`);
    setTimeout(() => setShareToast(""), 3000);
  };

  // Filter logic
  const filteredEvents = events.filter(e => {
    // Search filter
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (clubs.find(c => c.id === e.clubId)?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory = selectedCategory ? e.pingCategoryId === selectedCategory : true;

    // Saved only filter
    const matchesSaved = showSavedOnly ? saves.includes(e.id) : true;

    return matchesSearch && matchesCategory && matchesSaved;
  });

  // Trending section data
  const trendingEvents = [...events]
    .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col">
      <Header />

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-brand-primary text-white text-xs font-semibold rounded-xl border border-white/10 shadow-2xl animate-bounce">
          {shareToast}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Feed Content */}
        <div className="flex-1 space-y-8">
          
          {/* Controls: Search and Filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search events, clubs, keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full glass-input rounded-xl py-3 pl-10 pr-4 text-xs font-medium"
                />
              </div>

              {/* Bookmark Filter Toggle */}
              <button
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  showSavedOnly
                    ? "bg-brand-primary/20 text-white border-brand-primary shadow-lg shadow-brand-primary/10"
                    : "bg-white/5 border-white/5 text-gray-400 hover:border-white/10 hover:text-white"
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${showSavedOnly ? 'fill-current' : ''}`} />
                <span>{showSavedOnly ? "Showing Saved" : "Saved Events"}</span>
              </button>
            </div>

            {/* Category selection chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === null
                    ? "bg-brand-primary/15 text-brand-primary border-brand-primary/30 shadow-lg shadow-brand-primary/5"
                    : "bg-white/5 text-gray-300 border-white/5 hover:border-white/10"
                }`}
              >
                All Universe
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer"
                  style={
                    selectedCategory === cat.id
                      ? {
                          borderColor: `${cat.color}50`,
                          backgroundColor: `${cat.color}15`,
                          color: cat.color,
                          boxShadow: `0 4px 12px 0 ${cat.color}10`
                        }
                      : {
                          borderColor: "rgba(255, 255, 255, 0.05)",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          color: "#d1d5db"
                        }
                  }
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Feed Title */}
          <div>
            <h2 className="font-display font-extrabold text-2xl tracking-tight text-white flex items-center gap-2">
              <span>🚀</span>
              <span>{showSavedOnly ? "Saved Event Universe" : "Chronological Space Feed"}</span>
            </h2>
          </div>

          {/* Loading Skeletal state */}
          {loading ? (
            <div className="space-y-6">
              {[1, 2].map(n => (
                <div key={n} className="glass-card rounded-2xl p-6 space-y-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-white/5 rounded w-1/4"></div>
                      <div className="h-3 bg-white/5 rounded w-1/6"></div>
                    </div>
                  </div>
                  <div className="h-40 bg-white/5 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="space-y-6">
              {filteredEvents.map((event) => {
                const club = clubs.find(c => c.id === event.clubId);
                const category = categories.find(c => c.id === event.pingCategoryId);
                const isLiked = likes.includes(event.id);
                const isSaved = saves.includes(event.id);

                return (
                  <article key={event.id} className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
                    {/* Header: Club info, Badge, Time */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={club?.logoUrl || "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=100&auto=format&fit=crop&q=60"}
                          alt={club?.name}
                          className="w-9 h-9 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <h4 className="font-semibold text-xs text-white">{club?.name || "College Club"}</h4>
                            <span className="w-3.5 h-3.5 rounded-full bg-brand-secondary/20 flex items-center justify-center border border-brand-secondary/30 text-brand-secondary" title="Official Verified Club">
                              <Check className="w-2 h-2 stroke-[3]" />
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {new Date(event.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>

                      {/* Category Badge */}
                      {category && (
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-semibold tracking-wider uppercase"
                          style={{
                            borderColor: `${category.color}40`,
                            backgroundColor: `${category.color}15`,
                            color: category.color
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }}></span>
                          <span>{category.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 
                      onClick={() => router.push(`/events/${event.id}`)}
                      className="font-display font-bold text-xl sm:text-2xl text-white hover:text-brand-secondary transition-colors cursor-pointer leading-snug"
                    >
                      {event.title}
                    </h3>

                    {/* Banner Image (1080x1350 aspect-[4/5]) */}
                    {event.bannerImageUrl && (
                      <div 
                        onClick={() => router.push(`/events/${event.id}`)}
                        className="relative aspect-[4/5] max-h-[550px] w-full rounded-xl overflow-hidden border border-white/5 cursor-pointer bg-gray-950 flex items-center justify-center group"
                      >
                        <img
                          src={event.bannerImageUrl}
                          alt={event.title}
                          className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#06060c]/40 via-transparent to-transparent"></div>
                      </div>
                    )}

                    {/* Description excerpt */}
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
                      {event.description}
                    </p>

                    {/* Metadata: Date & Venue */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-primary" />
                        <span>{new Date(event.eventDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-secondary" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      {/* Left: Like & Comment */}
                      <div className="flex items-center gap-4 sm:gap-6">
                        <button
                          onClick={() => handleToggleLike(event.id)}
                          className={`flex items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                            isLiked ? "text-pink-500" : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <Heart className={`w-4 h-4 transition-transform ${isLiked ? 'fill-current scale-110' : 'group-hover:scale-110'}`} />
                          <span>{event.likesCount || 0}</span>
                        </button>

                        <button
                          onClick={() => router.push(`/events/${event.id}`)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{event.commentsCount || 0}</span>
                        </button>

                        <button
                          onClick={() => handleShare(event)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>

                      {/* Right: Save & Register */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleSave(event.id)}
                          className={`p-2 rounded-lg border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                            isSaved
                              ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                              : "bg-transparent border-white/5 text-gray-400 hover:text-white hover:border-white/10"
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                        </button>

                        {event.registrationLink && (
                          <a
                            href={event.registrationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-nebula hover:bg-nebula-hover text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1"
                          >
                            <span>Register</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl space-y-4">
              <ShieldAlert className="w-12 h-12 text-gray-500 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-semibold text-white">No Campus Events found</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Try searching something else, changing categories, or wait for official club announcements!
                </p>
              </div>
            </div>
          )}

          {/* Row of dedicated category showcases below feed */}
          {!selectedCategory && !showSavedOnly && categories.length > 0 && (
            <div className="space-y-6 pt-4">
              <div className="border-t border-white/5 pt-8">
                <h3 className="font-display font-extrabold text-xl text-white mb-2">Category Showcases</h3>
                <p className="text-xs text-gray-400">Dedicated rows highlighting major channels on campus.</p>
              </div>

              {categories.slice(0, 3).map((category) => {
                const catEvents = events.filter(e => e.pingCategoryId === category.id).slice(0, 4);
                if (catEvents.length === 0) return null;
                
                return (
                  <div key={category.id} className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }}></span>
                        <h4 className="font-bold text-sm text-gray-200">{category.name}</h4>
                      </div>
                      <button
                        onClick={() => setSelectedCategory(category.id)}
                        className="text-xs text-brand-secondary hover:underline"
                      >
                        See all ({events.filter(e => e.pingCategoryId === category.id).length})
                      </button>
                    </div>

                    <div className="flex items-stretch gap-4 overflow-x-auto no-scrollbar py-1">
                      {catEvents.map(e => (
                        <div
                          key={e.id}
                          onClick={() => router.push(`/events/${e.id}`)}
                          className="flex-shrink-0 w-64 glass-card rounded-xl p-4 flex flex-col justify-between gap-3 cursor-pointer"
                        >
                          <div className="space-y-2">
                            <h5 className="font-bold text-xs text-white line-clamp-1 leading-snug">{e.title}</h5>
                            <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{e.description}</p>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-gray-500 border-t border-white/5 pt-2">
                            <span>{new Date(e.eventDate).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                            <span className="truncate max-w-[120px]">{e.venue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Sidebar Panels */}
        <aside className="w-full lg:w-80 space-y-6">
          
          {/* Trending Panel */}
          {trendingEvents.length > 0 && (
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-2">
                <TrendingUp className="w-4 h-4 text-brand-primary" />
                <span>Popular This Week</span>
              </h3>
              <div className="space-y-4">
                {trendingEvents.map((e, idx) => {
                  const club = clubs.find(c => c.id === e.clubId);
                  return (
                    <div
                      key={e.id}
                      onClick={() => router.push(`/events/${e.id}`)}
                      className="flex items-start gap-3 cursor-pointer group"
                    >
                      <span className="font-display font-extrabold text-base text-brand-primary opacity-60 group-hover:opacity-100 transition-opacity">
                        0{idx + 1}
                      </span>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="font-semibold text-xs text-gray-200 group-hover:text-white line-clamp-1 transition-colors leading-tight">
                          {e.title}
                        </h4>
                        <p className="text-[10px] text-gray-400 truncate">
                          by {club?.name || "Club"}
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] text-pink-500 pt-0.5">
                          <Heart className="w-2.5 h-2.5 fill-current" />
                          <span>{e.likesCount || 0} campus likes</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Club Directory Panel */}
          {clubs.length > 0 && (
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-2">
                <span>🏫</span>
                <span>Active Club Directory</span>
              </h3>
              <div className="space-y-3">
                {clubs.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={c.logoUrl}
                        alt={c.name}
                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white truncate">{c.name}</h4>
                        <p className="text-[9px] text-gray-400 truncate">{c.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>
      </div>
    );
  }
