"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { db, Event, PingCategory, Club, User, EventComment, generateUUID } from "@/lib/db";
import { MapPin, Calendar, Heart, Share2, Bookmark, ArrowLeft, Send, ArrowUpRight } from "lucide-react";

export default function EventDetailPage({ params }: { params: any }) {
  const router = useRouter();
  
  // Dynamic Route resolution (Next.js 15 handles params as a promise sometimes)
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    // Resolve dynamic params safely
    if (params) {
      Promise.resolve(params).then((resolved) => {
        setEventId(resolved.id);
      });
    }
  }, [params]);

  // Database states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [category, setCategory] = useState<PingCategory | null>(null);
  
  // Comments state
  const [comments, setComments] = useState<EventComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  
  // Likes & Saves state
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const [shareToast, setShareToast] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const user = db.getCurrentUser();
    if (!user) {
      router.push("/");
      return;
    }
    setCurrentUser(user);
    loadEventData(user, eventId);
    setLoading(false);
  }, [eventId]);

  const loadEventData = (user: User, id: string) => {
    const allEvents = db.getEvents();
    const ev = allEvents.find(e => e.id === id);
    if (!ev) {
      setEvent(null);
      return;
    }

    // Row Level Security Sim: enforce college isolation
    if (ev.collegeId !== user.collegeId) {
      setEvent(null);
      return;
    }

    setEvent(ev);

    const cl = db.getClubs().find(c => c.id === ev.clubId) || null;
    const cat = db.getCategories().find(c => c.id === ev.pingCategoryId) || null;
    setClub(cl);
    setCategory(cat);

    // Likes count
    const allLikes = db.getLikes();
    const evLikes = allLikes.filter(l => l.eventId === ev.id);
    setLikesCount(evLikes.length);
    setIsLiked(evLikes.some(l => l.userId === user.id));

    // Saves status
    const allSaves = db.getSaves();
    setIsSaved(allSaves.some(s => s.userId === user.id && s.eventId === ev.id));

    // Comments
    const evComments = db.getEventComments()
      .filter(c => c.eventId === ev.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    setComments(evComments);
  };

  const handleToggleLike = () => {
    if (!currentUser || !event) return;
    const currentLikes = db.getLikes();
    
    let updatedLikes;
    if (isLiked) {
      updatedLikes = currentLikes.filter(l => !(l.userId === currentUser.id && l.eventId === event.id));
    } else {
      updatedLikes = [...currentLikes, { userId: currentUser.id, eventId: event.id }];
    }

    db.setLikes(updatedLikes);
    loadEventData(currentUser, event.id);
  };

  const handleToggleSave = () => {
    if (!currentUser || !event) return;
    const currentSaves = db.getSaves();

    let updatedSaves;
    if (isSaved) {
      updatedSaves = currentSaves.filter(s => !(s.userId === currentUser.id && s.eventId === event.id));
    } else {
      updatedSaves = [...currentSaves, { userId: currentUser.id, eventId: event.id }];
    }

    db.setSaves(updatedSaves);
    loadEventData(currentUser, event.id);
  };

  const handleShare = () => {
    if (!event) return;
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShareToast("Copied event link!");
    setTimeout(() => setShareToast(""), 3000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !event || !commentBody.trim()) return;

    const allComments = db.getEventComments();
    const newComment: EventComment = {
      id: generateUUID(),
      eventId: event.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      body: commentBody.trim(),
      createdAt: new Date().toISOString()
    };

    allComments.push(newComment);
    db.setEventComments(allComments);
    setCommentBody("");
    loadEventData(currentUser, event.id);
  };

  // .ICS file generator client-side
  const handleDownloadICS = () => {
    if (!event) return;

    // Build standard ICS syntax string
    const titleClean = event.title.replace(/[,;]/g, "\\$1");
    const descClean = (event.description || "").replace(/\n/g, "\\n").replace(/[,;]/g, "\\$1");
    const venueClean = event.venue.replace(/[,;]/g, "\\$1");
    
    // Formatting date helper for ICS
    const formatICSDate = (dateStr: string) => {
      return new Date(dateStr).toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const dtStart = formatICSDate(event.eventDate);
    // Assumes event duration of 2 hours
    const dtEnd = formatICSDate(new Date(new Date(event.eventDate).getTime() + 2 * 60 * 60 * 1000).toISOString());
    const dtStamp = formatICSDate(new Date().toISOString());

    const icsString = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//EventVerse//Campus Network//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@eventverse.com`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${titleClean}`,
      `DESCRIPTION:${descClean}`,
      `LOCATION:${venueClean}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${event.title.replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060c] text-white flex flex-col items-center justify-center">
        <p className="text-sm text-gray-400">Loading Campus Space...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#06060c] text-white flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <p className="text-gray-400 text-sm">Event not found or belongs to another campus universe.</p>
          <button
            onClick={() => router.push("/feed")}
            className="text-xs text-brand-secondary border border-brand-secondary/30 rounded-xl px-4 py-2 hover:bg-brand-secondary/10"
          >
            Back to Universe Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col">
      <Header />

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-brand-primary text-white text-xs font-semibold rounded-xl border border-white/10 shadow-2xl animate-bounce">
          {shareToast}
        </div>
      )}

      {/* Content wrapper */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        
        {/* Back button */}
        <button
          onClick={() => router.push("/feed")}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors py-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

        {/* Detailed Event Panel */}
        <article className="glass-card rounded-2xl p-5 sm:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={club?.logoUrl || "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=100&auto=format&fit=crop&q=60"}
                alt={club?.name}
                className="w-10 h-10 rounded-full object-cover border border-white/10"
              />
              <div>
                <h4 className="font-bold text-sm text-white">{club?.name || "Official Club"}</h4>
                <p className="text-[10px] text-gray-500">Announced {new Date(event.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</p>
              </div>
            </div>

            {category && (
              <span
                className="self-start sm:self-center text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full border"
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

          {/* Title */}
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight leading-snug">
            {event.title}
          </h2>

          {/* Banner image (1080x1350 aspect-[4/5]) */}
          {event.bannerImageUrl && (
            <div className="relative aspect-[4/5] max-h-[600px] w-full rounded-xl overflow-hidden border border-white/5 bg-gray-950 flex items-center justify-center">
              <img
                src={event.bannerImageUrl}
                alt={event.title}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 border border-white/5 rounded-xl p-4.5">
            <div className="flex items-center gap-3.5">
              <Calendar className="w-5 h-5 text-brand-primary" />
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wide">Date & Time</p>
                <p className="text-xs font-semibold text-gray-200">
                  {new Date(event.eventDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <MapPin className="w-5 h-5 text-brand-secondary" />
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wide">Venue Location</p>
                <p className="text-xs font-semibold text-gray-200 truncate max-w-[280px]">
                  {event.venue}
                </p>
              </div>
            </div>
          </div>

          {/* Event description */}
          <div className="space-y-2">
            <h4 className="font-display font-bold text-sm text-gray-200 uppercase tracking-wide">About this Event</h4>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Call-to-action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
            
            {/* Liking / Saving */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleLike}
                className={`flex items-center gap-1.5 py-2.5 px-4 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                  isLiked
                    ? "bg-pink-500/10 border-pink-500 text-pink-500"
                    : "bg-transparent border-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likesCount} Likes</span>
              </button>

              <button
                onClick={handleToggleSave}
                className={`p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  isSaved
                    ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                    : "bg-transparent border-white/5 text-gray-400 hover:text-white"
                }`}
                title={isSaved ? "Saved" : "Save Event"}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={handleShare}
                className="p-2.5 rounded-xl border border-white/5 bg-transparent text-gray-400 hover:text-white cursor-pointer"
                title="Share Event"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* ICS calendar / External registration link */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadICS}
                className="bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Add to Calendar (.ics)
              </button>

              {event.registrationLink && (
                <a
                  href={event.registrationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-nebula hover:bg-nebula-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1 shadow-lg shadow-brand-primary/15 transition-all"
                >
                  <span>Register →</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              )}
            </div>

          </div>
        </article>

        {/* Comment Thread */}
        <section className="glass-card rounded-2xl p-5 sm:p-8 space-y-6">
          <h3 className="font-display font-extrabold text-lg text-white">Campus Discussion ({comments.length})</h3>
          
          {/* Write comment form */}
          <form onSubmit={handleAddComment} className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 text-brand-primary border border-brand-primary/30 flex items-center justify-center font-bold text-xs uppercase">
              {currentUser?.name[0]}
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Write a public comment..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                className="w-full glass-input rounded-xl py-3 pl-4 pr-12 text-xs font-medium"
              />
              <button
                type="submit"
                disabled={!commentBody.trim()}
                className="absolute right-2 top-2 p-1 text-brand-primary hover:text-white disabled:text-gray-600 disabled:hover:text-gray-600 transition-colors"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
          </form>

          {/* List of comments */}
          <div className="space-y-4">
            {comments.length > 0 ? (
              comments.map((comment) => {
                const commentUserIcon = comment.userName[0];
                return (
                  <div key={comment.id} className="flex items-start gap-3 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs uppercase text-gray-400">
                      {commentUserIcon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-gray-200">{comment.userName}</span>
                        <span className={`text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                          comment.userRole === 'student' ? 'bg-white/5 text-gray-400' : 'bg-brand-primary/20 text-brand-primary'
                        }`}>
                          {comment.userRole.replace("_", " ")}
                        </span>
                        <span className="text-[9px] text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed font-medium">
                        {comment.body}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-gray-500">
                No comments on this announcement yet. Be the first to start the discussion!
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
