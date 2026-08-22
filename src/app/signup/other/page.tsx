"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AlertCircle } from "lucide-react";

export default function GuestSignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOAuthSignup = async (provider: "google" | "azure") => {
    setError("");
    setLoading(true);

    try {
      // Store role mapping in localStorage to handle onboarding after redirect
      localStorage.setItem("temp_other_registration", "other");

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
            <p className="text-[10px] text-brand-secondary uppercase tracking-widest font-semibold mt-0.5">Faculty & Guest Portals</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md glass-glow-card rounded-2xl p-8 relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="space-y-2 text-center">
            <h3 className="font-display font-bold text-2xl text-white">Guest Registration</h3>
            <p className="text-sm text-gray-400">Join as an observer, coordinator, or guest viewer</p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Google Login Button */}
            <button
              onClick={() => handleOAuthSignup("google")}
              disabled={loading}
              className="w-full bg-white hover:bg-neutral-100 text-black rounded-xl py-3.5 px-4 font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-lg"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-.113 2.76-.99 3.76v3.13h1.61c.94-.87 1.68-2.15 2.13-3.66.45-1.51.52-3.13.31-5.06z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.13-2.42c-.87.58-1.99.93-3.23.93-2.48 0-4.58-1.68-5.33-3.95H1.61v2.5C3.21 21.09 7.36 24 12 24z"/>
                <path fill="#FBBC05" d="M6.67 15.65c-.19-.58-.3-1.2-.3-1.84s.11-1.26.3-1.84V9.47H1.61A11.96 11.96 0 000 13.81c0 1.55.3 3.06.87 4.46l5.8-4.62z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.36 0 3.21 2.91 1.61 6.81l5.06 4.03c.75-2.27 2.85-3.95 5.33-3.95z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Microsoft Azure Login Button */}
            <button
              onClick={() => handleOAuthSignup("azure")}
              disabled={loading}
              className="w-full bg-white/5 hover:bg-white/10 text-white rounded-xl py-3.5 px-4 font-semibold text-sm border border-white/10 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 23 23">
                <path fill="#f35022" d="M0 0h11v11H0z"/>
                <path fill="#7fba00" d="M12 0h11v11H12z"/>
                <path fill="#00a4ef" d="M0 12h11v11H0z"/>
                <path fill="#ffb900" d="M12 12h11v11H12z"/>
              </svg>
              <span>Continue with Microsoft</span>
            </button>
          </div>

          <div className="text-[10px] text-gray-500 leading-relaxed text-center bg-white/3 p-3 rounded-lg border border-white/5">
            ℹ️ <span className="font-semibold text-gray-400">Notice:</span> Observer profiles do not receive publishing credentials or category subscriptions. Permissions are strictly read-only.
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
