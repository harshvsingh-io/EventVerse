"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, User, Event, Club } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { User as UserIcon, Calendar, MapPin, Edit3, LogOut, CheckCircle, Info } from "lucide-react";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const username = resolvedParams.username;

  const [profile, setProfile] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  
  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch current logged in session
    const current = db.getCurrentUser();
    setCurrentUser(current);

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
      const clubAdminClubs = allClubs.filter(c => c.adminUserId === matchedProfile.id);
      const clubIds = clubAdminClubs.map(c => c.id);
      
      const matchedEvents = allEvents.filter(e => 
        clubIds.includes(e.clubId) || e.createdBy === matchedProfile.id
      );
      setEvents(matchedEvents);
    }
    
    setLoading(false);
  }, [username]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    db.setCurrentUser(null);
    router.push("/");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || submitting) return;

    setSubmitting(true);
    try {
      // 1. Update Supabase public.profiles table
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim(),
          bio: editBio.trim(),
          avatar_url: editAvatarUrl.trim()
        })
        .eq("id", currentUser.id);

      if (profileErr) throw profileErr;

      // 2. Propagate to local state
      const updatedUser = {
        ...currentUser,
        name: editName.trim(),
        bio: editBio.trim(),
        avatarUrl: editAvatarUrl.trim()
      };
      
      db.setCurrentUser(updatedUser);
      
      // Update in local users array
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
      <div className="min-h-screen bg-[#06060c] flex items-center justify-center">
        <div className="w-6 h-6 border-t-2 border-brand-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#06060c] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
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
    <div className="min-h-screen bg-[#06060c] text-white p-6 max-w-4xl mx-auto space-y-8">
      {/* 1. Header Profile Box */}
      <div className="glass-glow-card rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Profile Avatar */}
        <img
          src={profile.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
          alt={profile.name}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-white/10 object-cover bg-neutral-900 shadow-xl"
        />

        {/* User Details */}
        <div className="flex-1 text-center sm:text-left space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="font-display font-extrabold text-2xl text-white">{profile.name}</h2>
              {profile.isVerified && (
                <span className="w-5 h-5 rounded-full bg-brand-secondary/20 flex items-center justify-center border border-brand-secondary/30 text-brand-secondary" title="Verified Campus Student">
                  <CheckCircle className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-semibold">@{profile.username}</p>
          </div>

          <p className="text-xs text-gray-300 max-w-md leading-relaxed">
            {profile.bio || "No bio description written yet."}
          </p>

          <div className="flex items-center justify-center sm:justify-start gap-4 text-[10px] uppercase font-bold tracking-wider text-gray-500">
            <span>Role: <strong className="text-brand-secondary">{profile.role.replace("_", " ")}</strong></span>
            <span>Joined: <strong className="text-gray-400">{new Date(profile.createdAt).toLocaleDateString([], { month: "short", year: "numeric" })}</strong></span>
          </div>
        </div>

        {/* Profile Control Actions */}
        {isOwnProfile && (
          <div className="flex sm:flex-col gap-3.5 w-full sm:w-auto">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs font-bold border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 px-4.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.97]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs font-bold bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 px-4.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.97]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Events/Posts Section */}
      <div className="space-y-4">
        <h3 className="font-display font-extrabold text-lg text-white border-b border-white/5 pb-2">
          {profile.role === "club_admin" ? "Published Campus Events" : "Activity & Event RSVPs"}
        </h3>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((e) => (
              <div
                key={e.id}
                onClick={() => router.push(`/events/${e.id}`)}
                className="glass-card rounded-2xl p-4 flex gap-4 cursor-pointer hover:border-brand-primary/30 transition-all border border-white/5 group"
              >
                {e.bannerImageUrl && (
                  <img
                    src={e.bannerImageUrl}
                    alt={e.title}
                    className="w-20 h-24 rounded-lg object-cover bg-neutral-900 border border-white/10 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-white group-hover:text-brand-primary transition-colors truncate">{e.title}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{e.description}</p>
                  </div>

                  <div className="text-[10px] text-gray-500 space-y-0.5 font-semibold">
                    <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-brand-secondary" /> {new Date(e.eventDate).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-pink-500" /> {e.venue}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-xs text-gray-500 space-y-1">
            <Info className="w-8 h-8 text-gray-600 mx-auto mb-1" />
            <p className="font-semibold text-gray-400">No events found</p>
            <p>This user hasn't published or RSVP'd to any active events.</p>
          </div>
        )}
      </div>

      {/* 3. Edit Profile Modal Dialog */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0a14] border border-white/10 rounded-2xl p-6 relative">
            <h3 className="font-display font-bold text-lg text-white mb-4">Edit Profile Info</h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold block">Full Name</label>
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
                <label className="text-xs text-gray-400 font-semibold block">Biography</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                  rows={3}
                />
              </div>

              {/* Avatar URL */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold block">Avatar Image URL</label>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-white/5 text-white py-2.5 rounded-xl border border-white/5 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-brand-primary hover:bg-brand-primary/95 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
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
