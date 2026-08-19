"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { db, User, Notification } from "@/lib/db";
import { Bell, User as UserIcon, LogOut, MessageSquare, Compass, Settings, Shield, PlusCircle, CheckSquare } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showInbox, setShowInbox] = useState(false);

  useEffect(() => {
    // 1. Initial background sync
    db.syncFromSupabase().then(() => {
      const user = db.getCurrentUser();
      if (!user) {
        router.push("/");
        return;
      }
      setCurrentUser(user);
      loadNotifications(user.id);
    });

    // 2. Poll Supabase for live updates every 10 seconds
    const interval = setInterval(() => {
      db.syncFromSupabase().then(() => {
        const user = db.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          loadNotifications(user.id);
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = (userId: string) => {
    const allNotifs = db.getNotifications();
    const myNotifs = allNotifs.filter(n => n.userId === userId);
    setNotifications(myNotifs);
  };

  const handleLogout = () => {
    db.setCurrentUser(null);
    router.push("/");
  };

  const handleMarkAllRead = () => {
    if (!currentUser) return;
    const allNotifs = db.getNotifications();
    const updated = allNotifs.map(n => n.userId === currentUser.id ? { ...n, read: true } : n);
    db.setNotifications(updated);
    loadNotifications(currentUser.id);
  };

  const handleNotifClick = (notif: Notification) => {
    if (!currentUser) return;
    
    // Mark as read
    const allNotifs = db.getNotifications();
    const updated = allNotifs.map(n => n.id === notif.id ? { ...n, read: true } : n);
    db.setNotifications(updated);
    loadNotifications(currentUser.id);
    setShowInbox(false);

    if (notif.eventId) {
      router.push(`/events/${notif.eventId}`);
    }
  };

  if (!currentUser) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="relative z-40 w-full border-b border-white/5 bg-[#06060c]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/feed")}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center">
            <span className="font-display font-bold text-lg text-white">E</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-display font-bold text-lg leading-none">EventVerse</h1>
            <p className="text-[9px] text-brand-secondary uppercase tracking-wider font-semibold">Campus Hub</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-white/3 border border-white/5 rounded-full p-1 text-xs shadow-inner">
          <button
            onClick={() => router.push("/feed")}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
              pathname === "/feed"
                ? "bg-gradient-to-r from-brand-primary to-brand-primary/80 text-white shadow-md shadow-brand-primary/10 scale-102"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/3"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Feed</span>
          </button>
          
          <button
            onClick={() => router.push("/community")}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
              pathname === "/community"
                ? "bg-gradient-to-r from-brand-primary to-brand-primary/80 text-white shadow-md shadow-brand-primary/10 scale-102"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/3"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Community</span>
          </button>

          <button
            onClick={() => router.push("/settings")}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
              pathname === "/settings"
                ? "bg-gradient-to-r from-brand-primary to-brand-primary/80 text-white shadow-md shadow-brand-primary/10 scale-102"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/3"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Action icons & User control */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          
          {/* Dashboard Shortcuts based on roles */}
          {currentUser.role === "club_admin" && (
            <button
              onClick={() => router.push("/dashboard/club")}
              className="hidden md:flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/8 text-gray-200 py-1.5 px-3.5 rounded-xl border border-white/10 transition-all hover:scale-102 active:scale-98 cursor-pointer hover:border-brand-primary/40 shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 text-brand-primary" />
              <span className="font-semibold">Club Panel</span>
            </button>
          )}

          {currentUser.role === "college_admin" && (
            <button
              onClick={() => router.push("/dashboard/college")}
              className="hidden md:flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/8 text-gray-200 py-1.5 px-3.5 rounded-xl border border-white/10 transition-all hover:scale-102 active:scale-98 cursor-pointer hover:border-brand-secondary/40 shadow-sm"
            >
              <Shield className="w-3.5 h-3.5 text-brand-secondary" />
              <span className="font-semibold">College Admin</span>
            </button>
          )}

          {currentUser.role === "super_admin" && (
            <button
              onClick={() => router.push("/dashboard/super")}
              className="hidden md:flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/8 text-gray-200 py-1.5 px-3.5 rounded-xl border border-white/10 transition-all hover:scale-102 active:scale-98 cursor-pointer hover:border-pink-500/40 shadow-sm"
            >
              <Shield className="w-3.5 h-3.5 text-pink-500" />
              <span className="font-semibold">Super Admin</span>
            </button>
          )}

          {/* Web Notification Inbox */}
          <div className="relative">
            <button
              onClick={() => setShowInbox(!showInbox)}
              className="relative p-2 rounded-full hover:bg-white/5 border border-white/5 text-gray-300 hover:text-white transition-all"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/30 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showInbox && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0c0c16] shadow-2xl shadow-black/80 p-4 z-50">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-brand-primary" />
                    <span>Notifications Inbox</span>
                  </h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-brand-secondary hover:underline flex items-center gap-1"
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all hover:bg-white/5 ${
                          notif.read
                            ? "bg-transparent border-white/5 text-gray-400"
                            : "bg-brand-primary/5 border-brand-primary/20 text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full ${
                            notif.channel === 'email' ? 'bg-orange-500/10 text-orange-400' : 'bg-brand-primary/10 text-brand-primary'
                          }`}>
                            {notif.channel}
                          </span>
                          <span className="text-[9px] text-gray-500">
                            {new Date(notif.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h5 className="font-semibold text-xs leading-tight mb-0.5">{notif.title}</h5>
                        <p className="text-[11px] leading-relaxed text-gray-400">{notif.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-gray-500">
                      No notifications yet. Subscribe to Pings to get updates!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Options */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="hidden lg:block text-right">
              <p className="text-xs font-semibold text-white leading-tight">{currentUser.name}</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">{currentUser.role.replace("_", " ")}</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-red-500/10 border border-white/5 text-gray-400 hover:text-red-400 transition-all cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
