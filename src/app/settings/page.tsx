"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { db, User, PingCategory } from "@/lib/db";
import { Settings, ShieldCheck, Mail, Bell, Check, Layers } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  
  // Session & database states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<PingCategory[]>([]);
  const [selectedPings, setSelectedPings] = useState<string[]>([]);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const user = db.getCurrentUser();
    if (!user) {
      router.push("/");
      return;
    }
    setCurrentUser(user);

    // Load college categories
    const collegeCats = db.getIsolatedCategories(user.collegeId);
    setCategories(collegeCats);

    // Load active subscriptions
    const mySubs = db.getSubscriptions()
      .filter(s => s.userId === user.id)
      .map(s => s.categoryId);
    setSelectedPings(mySubs);
  }, []);

  const handlePingToggle = (catId: string) => {
    if (selectedPings.includes(catId)) {
      setSelectedPings(selectedPings.filter(id => id !== catId));
    } else {
      setSelectedPings([...selectedPings, catId]);
    }
  };

  const handleSaveSettings = () => {
    if (!currentUser) return;

    // Update subscriptions
    const allSubs = db.getSubscriptions();
    // Clear existing for this user
    const cleanSubs = allSubs.filter(s => s.userId !== currentUser.id);
    
    // Add selected
    selectedPings.forEach(catId => {
      cleanSubs.push({ userId: currentUser.id, categoryId: catId });
    });

    db.setSubscriptions(cleanSubs);
    setSuccess("Your notification subscription preferences have been updated!");
    setTimeout(() => setSuccess(""), 4000);
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col">
      <Header />

      {/* Share Toast */}
      {success && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-green-500 text-white text-xs font-semibold rounded-xl border border-white/10 shadow-2xl animate-bounce">
          {success}
        </div>
      )}

      {/* Container */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        
        <div className="space-y-1">
          <h2 className="font-display font-extrabold text-2xl text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-primary" />
            <span>Preferences & Settings</span>
          </h2>
          <p className="text-xs text-gray-400">Control your universe. Choose what notifications reach your mailbox.</p>
        </div>

        {/* Profile Card */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
          <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-2">
            <ShieldCheck className="w-4 h-4 text-brand-secondary" />
            <span>User Profile Credentials</span>
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500 uppercase tracking-wider text-[9px]">Full Name</p>
              <p className="font-semibold text-gray-200 mt-1">{currentUser.name}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-wider text-[9px]">Email Address</p>
              <p className="font-semibold text-gray-200 mt-1">{currentUser.email}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-wider text-[9px]">Role Group</p>
              <p className="font-semibold text-brand-secondary uppercase mt-1 tracking-wider">{currentUser.role.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-wider text-[9px]">Verification Status</p>
              <p className="font-semibold text-green-400 mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Whitelisted User
              </p>
            </div>
          </div>
        </div>

        {/* Ping Subscriptions Panel */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="space-y-1.5">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <Bell className="w-4 h-4 text-brand-primary" />
              <span>Campus Ping Notifications</span>
            </h3>
            <p className="text-[11px] text-gray-400 leading-normal">
              Select which event channels you want to subscribe to. You will receive in-app notification alerts and email updates only when a club publishes a matching category blast.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {categories.map((cat) => {
              const isSelected = selectedPings.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => handlePingToggle(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                    isSelected
                      ? "bg-brand-primary/20 text-white border-brand-primary shadow-lg shadow-brand-primary/10"
                      : "bg-white/5 text-gray-300 border-white/5 hover:border-white/10 hover:bg-white/10"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  ></span>
                  <span>{cat.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 ml-1 text-brand-primary" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleSaveSettings}
            className="w-full bg-nebula hover:bg-nebula-hover text-white rounded-xl py-3 font-semibold text-sm cursor-pointer shadow-lg shadow-brand-primary/15 transition-all"
          >
            Save Subscription Preferences
          </button>
        </div>

      </main>
    </div>
  );
}
