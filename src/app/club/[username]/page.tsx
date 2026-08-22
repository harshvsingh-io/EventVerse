"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, Club, User, Event, Follow } from "@/lib/db";
import { 
  Users, 
  Calendar, 
  MapPin, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  Globe, 
  ShieldCheck, 
  Clock, 
  Bell, 
  BellRing
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function ClubPublicProfile() {
  const params = useParams();
  const router = useRouter();
  const clubUsername = params?.username as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clubAdminProfile, setClubAdminProfile] = useState<User | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    db.syncFromSupabase().then(() => {
      const current = db.getCurrentUser();
      setCurrentUser(current);

      if (current && (current as any).is_guest_demo) {
        setIsGuest(true);
      }

      // Find the club admin profile by username
      const users = db.getUsers();
      const admin = users.find(u => u.username?.toLowerCase() === clubUsername?.toLowerCase() && u.role === "club_admin");
      
      if (admin) {
        setClubAdminProfile(admin);
        
        // Find club linked to this admin
        const clubs = db.getClubs();
        const foundClub = clubs.find(c => c.adminUserId === admin.id);
        
        if (foundClub) {
          setClub(foundClub);

          // Get club events
          const clubEvents = db.getEvents()
            .filter(e => e.clubId === foundClub.id)
            .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
          setEvents(clubEvents);

          // Calculate follower stats
          const allFollows = (db as any).getFollows() as Follow[];
          const followersList = allFollows.filter(f => f.followingClubId === foundClub.id);
          setFollowerCount(followersList.length);

          if (current) {
            setIsFollowing(allFollows.some(f => f.followerId === current.id && f.followingClubId === foundClub.id));
          }

          // Following stats for the club
          const followingList = allFollows.filter(f => f.followerId === admin.id);
          setFollowingCount(followingList.length);
        }
      }
    });
  }, [clubUsername]);

  const handleFollowToggle = () => {
    if (!currentUser) {
      router.push("/");
      return;
    }
    if (isGuest) {
      alert("Guest Demo limit: Please register a real account to follow clubs!");
      return;
    }
    if (!club) return;

    // Toggle follow in database
    (db as any).toggleFollow(currentUser.id, club.id, true);
    
    // Refresh stats locally
    const newFollowingState = !isFollowing;
    setIsFollowing(newFollowingState);
    setFollowerCount(prev => newFollowingState ? prev + 1 : prev - 1);
  };

  if (!club || !clubAdminProfile) {
    return (
      <div className="min-h-screen bg-[#030307] text-white flex flex-col items-center justify-center p-6">
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">EventVerse Constellations</p>
          <h2 className="font-display font-extrabold text-2xl text-white uppercase">Club Profile Not Found</h2>
          <button 
            onClick={() => router.push("/feed")}
            className="text-[10px] font-bold tracking-widest uppercase bg-white/5 border border-white/5 hover:bg-white/10 text-white py-3 px-6 rounded-xl transition-all"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030307] text-[#f5f5f7] flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-10 space-y-10 pb-24 md:pb-10">
        
        {/* Guest Banner */}
        {isGuest && (
          <div className="w-full p-3.5 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold rounded-2xl flex items-center justify-between">
            <span>You're viewing a Guest Demo — Get Started to create a real account.</span>
            <button 
              onClick={() => router.push("/")}
              className="text-[9px] font-bold tracking-widest uppercase bg-brand-primary text-white py-1.5 px-3 rounded-lg hover:bg-brand-primary/95 transition-all"
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Back Link */}
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* ==========================================
            INSTAGRAM PROFILE HEADER BLOCK
            ========================================== */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 border-b border-white/5 pb-10">
          
          {/* Glowing Avatar Ring */}
          <div className="relative flex-shrink-0 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-full blur-[8px] opacity-75 group-hover:scale-105 transition-all duration-300"></div>
            <div className="relative w-28 h-28 rounded-full p-[3px] bg-[#030307]">
              <img 
                src={club.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop"} 
                alt={club.name} 
                className="w-full h-full rounded-full object-cover border border-white/10"
              />
            </div>
          </div>

          {/* Profile details */}
          <div className="flex-1 space-y-5 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="font-display font-black text-2xl tracking-tight text-white uppercase">{club.name}</h2>
                {clubAdminProfile.isVerified && (
                  <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0" />
                )}
              </div>
              
              <button
                onClick={handleFollowToggle}
                className={`text-[9px] font-bold tracking-widest uppercase py-2 px-5 rounded-xl transition-all cursor-pointer ${
                  isFollowing 
                    ? "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                    : "bg-brand-primary hover:bg-brand-primary/95 text-white shadow-lg shadow-brand-primary/10"
                }`}
              >
                {isFollowing ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <BellRing className="w-3.5 h-3.5" /> Subscribed
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 justify-center">
                    <Bell className="w-3.5 h-3.5" /> Follow & Ping
                  </span>
                )}
              </button>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-center sm:justify-start gap-8 text-xs">
              <div>
                <span className="font-bold text-white text-sm">{events.length}</span>
                <span className="text-gray-500 ml-1.5 uppercase font-bold text-[10px] tracking-wider">Events</span>
              </div>
              <div>
                <span className="font-bold text-white text-sm">{followerCount}</span>
                <span className="text-gray-500 ml-1.5 uppercase font-bold text-[10px] tracking-wider">Followers</span>
              </div>
              <div>
                <span className="font-bold text-white text-sm">{followingCount}</span>
                <span className="text-gray-500 ml-1.5 uppercase font-bold text-[10px] tracking-wider">Following</span>
              </div>
            </div>

            {/* Bio & Metadata */}
            <div className="space-y-2 text-xs">
              <p className="text-white/80 leading-relaxed max-w-lg">{club.description}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-gray-500 font-bold uppercase tracking-wider text-[10px] pt-1">
                <span className="flex items-center gap-1">📍 {clubAdminProfile.collegeId ? db.getColleges().find(c=>c.id===clubAdminProfile.collegeId)?.name : "Campus Affiliate"}</span>
                <span className="flex items-center gap-1">🔗 @{clubAdminProfile.username}</span>
              </div>
            </div>

          </div>

        </div>

        {/* ==========================================
            EVENTS POSTED GRID
            ========================================== */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60">
            <Calendar className="w-4 h-4 text-brand-primary" />
            <span>Club Event Posts ({events.length})</span>
          </div>

          {events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {events.map((event) => (
                <div 
                  key={event.id}
                  onClick={() => router.push(`/feed` /* or event details route */)}
                  className="glass-card rounded-2xl overflow-hidden cursor-pointer group border border-white/5 flex flex-col justify-between h-[360px]"
                >
                  {event.bannerImageUrl && (
                    <div className="aspect-[16/10] overflow-hidden bg-neutral-900 border-b border-white/5">
                      <img 
                        src={event.bannerImageUrl} 
                        alt={event.title} 
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h4 className="font-display font-bold text-md text-white group-hover:text-brand-secondary transition-colors line-clamp-1">{event.title}</h4>
                      <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{event.description}</p>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-widest border-t border-white/5 pt-3 mt-3">
                      <span className="flex items-center gap-1">📅 {new Date(event.eventDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      <span className="flex items-center gap-1 truncate max-w-[120px]">📍 {event.venue}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white/3 rounded-2xl border border-dashed border-white/5 text-xs text-gray-500">
              No event announcements posted yet by this constellation club.
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
