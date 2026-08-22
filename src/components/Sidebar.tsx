"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { db, User } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { 
  Home, 
  Search, 
  Bell, 
  PlusSquare, 
  LogOut, 
  Compass, 
  MessageSquare,
  Sparkles,
  ShieldAlert
} from "lucide-react";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 1. Initial sync
    setCurrentUser(db.getCurrentUser());

    // 2. Poll for updates (notifications & session)
    const interval = setInterval(() => {
      const user = db.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        const notifs = db.getNotifications() || [];
        setUnreadCount(notifs.filter(n => !n.read).length);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    db.setCurrentUser(null);
    router.push("/");
  };

  if (!currentUser) return null;

  const menuItems = [
    { label: "Home", icon: Home, route: "/feed" },
    { label: "Search", icon: Search, route: "/search" },
    { 
      label: "Notifications", 
      icon: Bell, 
      route: currentUser.role === "student" ? "/feed" : `/dashboard/${currentUser.role === "club_admin" ? "club" : currentUser.role === "college_admin" ? "college" : "super"}`,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { label: "Community", icon: MessageSquare, route: "/community" }
  ];

  // Only Club Admins can see the direct "Create Event" sidebar item
  const canCreate = currentUser.role === "club_admin";

  return (
    <>
      {/* LEFT SIDEBAR (Desktop/Large Screens) */}
      <aside className="hidden md:flex flex-col justify-between w-64 h-screen sticky top-0 left-0 bg-[#06060c]/80 backdrop-blur-md border-r border-white/5 px-4 py-8 flex-shrink-0 z-40">
        <div className="space-y-8">
          {/* Brand Logo Header */}
          <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => router.push("/feed")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/10">
              <span className="font-display font-black text-lg text-white">E</span>
            </div>
            <div>
              <h2 className="font-display font-extrabold text-md tracking-tight leading-none bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">EventVerse</h2>
              <span className="text-[9px] uppercase tracking-wider text-brand-secondary font-bold">Campus Network</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {menuItems.map((item, idx) => {
              const isActive = pathname === item.route;
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => router.push(item.route)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all group active:scale-[0.98] cursor-pointer ${
                    isActive
                      ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? "text-brand-primary" : "text-gray-400 group-hover:text-white"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-brand-primary text-white rounded-full leading-none animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Create Event (Club Admin Only) */}
            {canCreate && (
              <button
                onClick={() => router.push("/dashboard/club")}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group active:scale-[0.98] cursor-pointer ${
                  pathname.startsWith("/dashboard/club")
                    ? "bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <PlusSquare className="w-5 h-5 text-brand-secondary transition-transform group-hover:scale-105" />
                <span>Create Event</span>
              </button>
            )}

            {/* General Dashboard Routing (Faculty / Club Representative / Admin Panel shortcut) */}
            {currentUser.role !== "student" && (
              <button
                onClick={() => router.push(`/dashboard/${currentUser.role === "club_admin" ? "club" : currentUser.role === "college_admin" ? "college" : "super"}`)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group active:scale-[0.98] cursor-pointer ${
                  pathname.startsWith("/dashboard/") && !pathname.includes("club")
                    ? "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                    : "text-gray-400 hover:text-white hover:bg-pink-500/5 border border-transparent"
                }`}
              >
                <Sparkles className="w-5 h-5 text-pink-500" />
                <span>Dashboard</span>
              </button>
            )}
          </nav>
        </div>

        {/* Profile Avatar / Settings & Logout */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          {/* Own Profile Tab Link */}
          <button
            onClick={() => router.push(`/profile/${currentUser.username}`)}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              pathname.includes(`/profile/${currentUser.username}`)
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <img 
              src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`} 
              alt={currentUser.name} 
              className="w-7 h-7 rounded-full border border-white/10 object-cover flex-shrink-0"
            />
            <div className="min-w-0 text-left">
              <h4 className="font-bold text-xs text-white truncate leading-none mb-0.5">{currentUser.name}</h4>
              <p className="text-[9px] text-gray-500 truncate">@{currentUser.username}</p>
            </div>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5 text-red-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR (Mobile Screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#06060c]/90 backdrop-blur-lg border-t border-white/5 flex items-center justify-around px-4 z-40">
        {menuItems.map((item, idx) => {
          const isActive = pathname === item.route;
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => router.push(item.route)}
              className={`relative p-2.5 rounded-lg active:scale-95 cursor-pointer ${isActive ? "text-brand-primary" : "text-gray-400"}`}
            >
              <Icon className="w-5.5 h-5.5" />
              {item.badge !== undefined && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-primary rounded-full animate-ping"></span>
              )}
            </button>
          );
        })}

        {canCreate && (
          <button
            onClick={() => router.push("/dashboard/club")}
            className={`p-2.5 rounded-lg active:scale-95 cursor-pointer ${pathname.startsWith("/dashboard/club") ? "text-brand-secondary" : "text-gray-400"}`}
          >
            <PlusSquare className="w-5.5 h-5.5" />
          </button>
        )}

        <button
          onClick={() => router.push(`/profile/${currentUser.username}`)}
          className={`p-1.5 rounded-full border active:scale-95 cursor-pointer ${pathname.includes(`/profile/${currentUser.username}`) ? "border-brand-primary" : "border-white/10"}`}
        >
          <img 
            src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`} 
            alt={currentUser.name} 
            className="w-5.5 h-5.5 rounded-full object-cover"
          />
        </button>
      </nav>
    </>
  );
}
