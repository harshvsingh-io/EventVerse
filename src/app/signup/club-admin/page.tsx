"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { db, College } from "@/lib/db";
import { Sparkles, AlertCircle, Building, Info, FileText } from "lucide-react";

export default function ClubAdminSignupPage() {
  const router = useRouter();
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [clubLogoUrl, setClubLogoUrl] = useState("https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=100&auto=format&fit=crop&q=60");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    db.syncFromSupabase().then(() => {
      setColleges(db.getColleges().filter(c => c.status === "approved"));
    });
  }, []);

  const handleOAuthSignup = async (provider: "google" | "azure") => {
    setError("");
    setSuccess("");

    if (!selectedCollegeId) {
      setError("Please select your college campus.");
      return;
    }
    if (!clubName.trim()) {
      setError("Please enter your club organization name.");
      return;
    }

    setLoading(true);

    try {
      // Store temporary registration details in localStorage to recover after OAuth redirect
      const tempReg = {
        collegeId: selectedCollegeId,
        clubName: clubName.trim(),
        clubDesc: clubDesc.trim() || "Official campus organization profile.",
        clubLogoUrl: clubLogoUrl.trim(),
        requestedRole: "club_admin"
      };
      localStorage.setItem("temp_club_registration", JSON.stringify(tempReg));

      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/onboarding/username`
        }
      });
      if (err) throw err;
    } catch (err: any) {
      setError(err.message || "Failed to initiate registration flow.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#06060c] text-white flex flex-col justify-between overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full bg-brand-primary/12 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-brand-secondary/12 blur-[130px] pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center">
            <span className="font-display font-bold text-xl text-white">E</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-xl bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">EventVerse</h1>
            <p className="text-[10px] text-brand-secondary uppercase tracking-widest font-semibold mt-0.5">Club Administration</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md glass-glow-card rounded-2xl p-6 sm:p-8 relative overflow-hidden space-y-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-secondary/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="space-y-1.5 text-center">
            <h3 className="font-display font-bold text-xl text-white">Register Club Representative</h3>
            <p className="text-xs text-gray-400">Apply for official publishing credentials on campus</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* College Selection */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Select Campus *</label>
              <select
                value={selectedCollegeId}
                onChange={(e) => setSelectedCollegeId(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-xs bg-[#0c0c16]"
                required
              >
                <option value="" className="bg-[#0c0c16] text-gray-500">Choose your university...</option>
                {colleges.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#0c0c16] text-white">{c.name}</option>
                ))}
              </select>
            </div>

            {/* Club Name */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Club / Association Name *</label>
              <input
                type="text"
                placeholder="e.g. AstroCode Robotics Club"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-xs"
                required
              />
            </div>

            {/* Club Description */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Short Description</label>
              <textarea
                placeholder="Describe your organization's objectives and event scopes..."
                value={clubDesc}
                onChange={(e) => setClubDesc(e.target.value)}
                rows={3}
                className="w-full glass-input rounded-xl p-3 text-xs"
              />
            </div>

            {/* Club Logo URL */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Logo Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={clubLogoUrl}
                onChange={(e) => setClubLogoUrl(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-xs"
              />
            </div>

            <div className="flex items-center justify-center gap-3 text-xs text-gray-500 my-4 uppercase tracking-widest font-bold">
              <span className="h-[1px] flex-1 bg-white/5"></span>
              <span>Register via OAuth</span>
              <span className="h-[1px] flex-1 bg-white/5"></span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Google OAuth Signup */}
              <button
                onClick={() => handleOAuthSignup("google")}
                disabled={loading}
                className="bg-white/5 hover:bg-white/10 text-white rounded-xl py-3 border border-white/10 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-.113 2.76-.99 3.76v3.13h1.61c.94-.87 1.68-2.15 2.13-3.66.45-1.51.52-3.13.31-5.06z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.13-2.42c-.87.58-1.99.93-3.23.93-2.48 0-4.58-1.68-5.33-3.95H1.61v2.5C3.21 21.09 7.36 24 12 24z"/>
                  <path fill="#FBBC05" d="M6.67 15.65c-.19-.58-.3-1.2-.3-1.84s.11-1.26.3-1.84V9.47H1.61A11.96 11.96 0 000 13.81c0 1.55.3 3.06.87 4.46l5.8-4.62z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.36 0 3.21 2.91 1.61 6.81l5.06 4.03c.75-2.27 2.85-3.95 5.33-3.95z"/>
                </svg>
                <span>Google</span>
              </button>

              {/* Microsoft OAuth Signup */}
              <button
                onClick={() => handleOAuthSignup("azure")}
                disabled={loading}
                className="bg-white/5 hover:bg-white/10 text-white rounded-xl py-3 border border-white/10 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 23 23">
                  <path fill="#f35022" d="M0 0h11v11H0z"/>
                  <path fill="#7fba00" d="M12 0h11v11H12z"/>
                  <path fill="#00a4ef" d="M0 12h11v11H0z"/>
                  <path fill="#ffb900" d="M12 12h11v11H12z"/>
                </svg>
                <span>Microsoft</span>
              </button>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 leading-normal bg-white/3 p-3 rounded-lg border border-white/5 space-y-1">
            <div className="flex items-center gap-1 text-gray-400 font-semibold">
              <Info className="w-3 h-3 text-brand-secondary" />
              <span>Pending Review Policy:</span>
            </div>
            <p>
              Newly registered Club Admins and their organizations enter a "Pending Approval" state. You will gain event publishing access once your campus dean approves your profile.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-6 border-t border-white/5 bg-[#040408]/60 text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} EventVerse Campus Networks. Built for College Hackathons.</p>
      </footer>
    </div>
  );
}
