"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db, User, Event, Club, Follow } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { 
  User as UserIcon, 
  Calendar, 
  MapPin, 
  Edit3, 
  LogOut, 
  CheckCircle, 
  Info, 
  Upload, 
  Camera, 
  Plus, 
  Check, 
  Users, 
  Award,
  BellRing
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const username = resolvedParams.username;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  
  // Follower stats states
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    db.syncFromSupabase().then(() => {
      // 1. Fetch current logged in session
      const current = db.getCurrentUser();
      setCurrentUser(current);

      if (current && (current as any).is_guest_demo) {
        setIsGuest(true);
      }

      // 2. Load profiles & search matching username
      const allUsers = db.getUsers();
      const matchedProfile = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

      if (matchedProfile) {
        setProfile(matchedProfile);
        setEditName(matchedProfile.name);
        setEditBio(matchedProfile.bio || "");
        setEditAvatarUrl(matchedProfile.avatarUrl || "");

        // 3. Get clubs of this user (if club representative)
        const allClubs = db.getClubs();
        setClubs(allClubs);

        // 4. Get events of this user's clubs
        const allEvents = db.getEvents();
        
        if (matchedProfile.role === "club_admin") {
          const clubAdminClubs = allClubs.filter(c => c.adminUserId === matchedProfile.id);
          const clubIds = clubAdminClubs.map(c => c.id);
          const matchedEvents = allEvents.filter(e => clubIds.includes(e.clubId));
          setEvents(matchedEvents);
        } else {
          // Student / observer gets their RSVP'd saved events
          const savedEventIds = db.getSaves()
            .filter(s => s.userId === matchedProfile.id)
            .map(s => s.eventId);
          const matchedEvents = allEvents.filter(e => savedEventIds.includes(e.id));
          setEvents(matchedEvents);
        }

        // 5. Follow calculations
        const allFollows = (db as any).getFollows() as Follow[];
        const followersList = allFollows.filter(f => f.followingUserId === matchedProfile.id);
        setFollowerCount(followersList.length);

        if (current) {
          setIsFollowing(allFollows.some(f => f.followerId === current.id && f.followingUserId === matchedProfile.id));
        }

        const followingList = allFollows.filter(f => f.followerId === matchedProfile.id);
        setFollowingCount(followingList.length);
      }
      
      setLoading(false);
    });
  }, [username]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    db.setCurrentUser(null);
    router.push("/");
  };

  const handleFollowToggle = () => {
    if (!currentUser) {
      router.push("/");
      return;
    }
    if (isGuest) {
      alert("Guest Demo limit: Please register a real account to follow users!");
      return;
    }
    if (!profile) return;

    // Toggle follow in database
    (db as any).toggleFollow(currentUser.id, profile.id, false);
    
    // Refresh stats locally
    const newFollowingState = !isFollowing;
    setIsFollowing(newFollowingState);
    setFollowerCount(prev => newFollowingState ? prev + 1 : prev - 1);
  };

  // Avatar file upload handler to Supabase storage bucket
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatar-${fileName}`;

      if (!supabase) throw new Error("Supabase client is not available.");

      const { data, error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadErr) throw uploadErr;

      // Get public URL from avatars bucket
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setEditAvatarUrl(publicUrl);
    } catch (err: any) {
      console.error(err);
      alert("Avatar upload failed: " + (err.message || err.error_description));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || submitting) return;

    setSubmitting(true);
    try {
      if (supabase) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            full_name: editName.trim(),
            bio: editBio.trim(),
            avatar_url: editAvatarUrl.trim()
          })
          .eq("id", currentUser.id);

        if (profileErr) throw profileErr;
      }

      const updatedUser = {
        ...currentUser,
        name: editName.trim(),
        bio: editBio.trim(),
        avatarUrl: editAvatarUrl.trim()
      };
      
      db.setCurrentUser(updatedUser);
      
      const allUsers = db.getUsers();
      const idx = allUsers.findIndex(u => u.id === currentUser.id);
      if (idx !== -1) {
        allUsers[idx] = updatedUser;
        db.setUsers(allUsers);
      }

      setProfile(updatedUser);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030307] flex items-center justify-center">
        <div className="w-6 h-6 border-t-2 border-brand-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#030307] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <UserIcon className="w-12 h-12 text-gray-500" />
        <div className="space-y-1">
          <h3 className="font-bold text-lg">Profile Not Found</h3>
          <p className="text-xs text-gray-400">The username "{username}" is not registered on this campus network.</p>
        </div>
        <button
          onClick={() => router.push("/feed")}
          className="text-xs font-bold bg-brand-primary px-4 py-2 rounded-lg"
        >
          Return to Space Feed
        </button>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser.id === profile.id;

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

        {/* ==========================================
            INSTAGRAM PROFILE HEADER BLOCK
            ========================================== */}
        <div className="glass-glow-card rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Profile Avatar with Static Violet Ring */}
          <div className="relative flex-shrink-0 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-full blur-[6px] opacity-70 group-hover:scale-105 transition-all duration-300"></div>
            <div className="relative w-28 h-28 rounded-full p-[3px] bg-[#030307]">
              <img
                src={profile.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
                alt={profile.name}
                className="w-full h-full rounded-full object-cover border border-white/10"
              />
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 className="font-display font-black text-2xl tracking-tight text-white uppercase">{profile.name}</h2>
                {profile.isVerified && (
                  <CheckCircle className="w-5 h-5 text-brand-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-gray-500 font-semibold">@{profile.username}</p>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-center sm:justify-start gap-8 text-xs">
              <div>
                <span className="font-bold text-white text-sm">{events.length}</span>
                <span className="text-gray-500 ml-1.5 uppercase font-bold text-[10px] tracking-wider">
                  {profile.role === "club_admin" ? "Events" : "RSVPs"}
                </span>
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

            <p className="text-xs text-white/70 max-w-md leading-relaxed">
              {profile.bio || "No bio description written yet."}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[9px] uppercase font-bold tracking-widest text-gray-500">
              <span className="flex items-center gap-1.5">📍 {profile.collegeId ? db.getColleges().find(c=>c.id===profile.collegeId)?.name : "Campus Affiliate"}</span>
              <span className="flex items-center gap-1.5">🛡️ {profile.role.replace("_", " ")}</span>
            </div>
          </div>

          {/* Action Controllers */}
          <div className="flex sm:flex-col gap-3.5 w-full sm:w-auto self-stretch sm:self-center shrink-0">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase bg-white/5 hover:bg-white/10 border border-white/5 px-5 py-3.5 rounded-xl cursor-pointer transition-all active:scale-[0.97]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 px-5 py-3.5 rounded-xl cursor-pointer transition-all active:scale-[0.97]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleFollowToggle}
                className={`text-[9px] font-bold tracking-widest uppercase py-3 px-6 rounded-xl transition-all cursor-pointer ${
                  isFollowing 
                    ? "bg-white/5 border border-white/10 text-white/85"
                    : "bg-brand-primary hover:bg-brand-primary/95 text-white shadow-lg shadow-brand-primary/10"
                }`}
              >
                {isFollowing ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <Check className="w-3.5 h-3.5" /> Following
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 justify-center">
                    <Plus className="w-3.5 h-3.5" /> Follow User
                  </span>
                )}
              </button>
            )}
          </div>

        </div>

        {/* ==========================================
            EVENTS GRID / ACTIVITY RECORD
            ========================================== */}
        <div className="space-y-6">
          <h3 className="font-display font-extrabold text-lg text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-brand-primary" />
            <span>
              {profile.role === "club_admin" ? "Published Campus Events" : "Activity & Event RSVPs"} ({events.length})
            </span>
          </h3>

          {events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {events.map((e) => (
                <div
                  key={e.id}
                  onClick={() => router.push(`/feed`)}
                  className="glass-card rounded-2xl overflow-hidden cursor-pointer border border-white/5 pb-5 flex flex-col justify-between h-[360px] group"
                >
                  {e.bannerImageUrl && (
                    <div className="aspect-[16/10] overflow-hidden bg-neutral-900 border-b border-white/5">
                      <img
                        src={e.bannerImageUrl}
                        alt={e.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h4 className="font-display font-bold text-md text-white group-hover:text-brand-secondary transition-colors line-clamp-1">{e.title}</h4>
                      <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{e.description}</p>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-widest border-t border-white/5 pt-3 mt-3">
                      <span className="flex items-center gap-1">📅 {new Date(e.eventDate).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                      <span className="flex items-center gap-1 truncate max-w-[120px]">📍 {e.venue}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white/3 rounded-2xl border border-dashed border-white/5 text-xs text-gray-500 space-y-1">
              <Info className="w-7 h-7 text-gray-600 mx-auto mb-1" />
              <p className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">No events found</p>
              <p className="text-gray-500">This user hasn't published or RSVP'd to any active events.</p>
            </div>
          )}
        </div>

      </main>

      {/* ==========================================
          EDIT PROFILE MODAL DIALOG
          ========================================== */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0a14] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-28 h-28 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-white uppercase">Edit Profile Info</h3>
              <p className="text-xs text-gray-500">Update your public details and avatar</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              
              {/* Profile Photo Uploader (Crop/Preview) */}
              <div className="flex items-center gap-4.5 bg-white/3 p-4 rounded-2xl border border-white/5">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                  <img
                    src={editAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="w-4 h-4 border-t border-brand-primary rounded-full animate-spin"></span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="text-[10px] font-bold tracking-widest uppercase bg-white/5 border border-white/10 hover:bg-white/10 text-white py-2 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <p className="text-[9px] text-gray-500">Square PNG/JPG, max 2MB (Supabase Storage)</p>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                  required
                />
              </div>

              {/* Bio */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Biography</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-white/5 text-white py-3.5 rounded-xl border border-white/5 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-brand-primary hover:bg-brand-primary/95 text-white py-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
