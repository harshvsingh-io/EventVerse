"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { db, User, generateUUID } from "@/lib/db";
import { AlertCircle, CheckCircle, Search, Rocket } from "lucide-react";

export default function UsernameOnboardingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 1. Recover active auth session
    supabase.auth.getUser().then(async ({ data: { user }, error: authErr }) => {
      if (authErr || !user) {
        router.push("/");
        return;
      }
      setCurrentUser(user);

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        // Clean default random username
        const cleanName = profile.username.split("_")[0];
        setUsername(cleanName);
      }
      setLoading(false);
    });
  }, []);

  // Live debounced check
  useEffect(() => {
    if (!username) {
      setIsAvailable(null);
      setValidationError("");
      return;
    }

    const reg = /^[a-z0-9_]+$/;
    if (!reg.test(username)) {
      setValidationError("Username must be lowercase, alphanumeric and underscores only.");
      setIsAvailable(null);
      return;
    }
    setValidationError("");
    setIsChecking(true);

    const delayDebounce = setTimeout(async () => {
      try {
        const { data: available, error: rpcErr } = await supabase.rpc(
          "check_username_available",
          { username_to_check: username.toLowerCase() }
        );
        if (rpcErr) throw rpcErr;
        setIsAvailable(available);
      } catch (err) {
        console.error("Error checking username availability:", err);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || submitting) return;
    if (isAvailable === false || validationError) {
      setError("Please choose a valid and available username.");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const lowerUsername = username.toLowerCase();
      
      // 1. Process onboarding metadata from localStorage
      const tempClub = localStorage.getItem("temp_club_registration");
      const tempOther = localStorage.getItem("temp_other_registration");

      let finalRole = "student";
      let collegeId = null;

      // Extract details from db if already mapped by Postgres trigger
      const { data: profile } = await supabase
        .from("profiles")
        .select("college_id, role")
        .eq("id", currentUser.id)
        .single();
      
      if (profile) {
        finalRole = profile.role;
        collegeId = profile.college_id;
      }

      if (tempClub) {
        const clubData = JSON.parse(tempClub);
        finalRole = "club_admin";
        collegeId = clubData.collegeId;

        // Upsert club details
        const { error: clubErr } = await supabase.from("clubs").upsert({
          id: generateUUID(),
          college_id: clubData.collegeId,
          name: clubData.clubName,
          logo_url: clubData.clubLogoUrl,
          description: clubData.clubDesc,
          admin_user_id: currentUser.id,
          created_at: new Date().toISOString()
        });
        if (clubErr) throw clubErr;
        localStorage.removeItem("temp_club_registration");

      } else if (tempOther) {
        finalRole = "other";
        localStorage.removeItem("temp_other_registration");
      }

      // 2. Update user profile details
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: currentUser.id,
        username: lowerUsername,
        full_name: fullName.trim(),
        role: finalRole as any,
        college_id: collegeId,
        auth_provider: currentUser.app_metadata?.provider || "email",
        email: currentUser.email
      });
      if (profileErr) throw profileErr;

      setSuccess("Profile registered successfully!");

      // 3. Update local storage session data to force immediate re-render
      const mappedUser: User = {
        id: currentUser.id,
        collegeId: collegeId || "",
        name: fullName.trim() || lowerUsername,
        email: currentUser.email || "",
        role: finalRole as any,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        username: lowerUsername,
        avatarUrl: currentUser.user_metadata?.avatar_url || null,
        bio: "",
        authProvider: currentUser.app_metadata?.provider || "email",
        isVerified: true
      };
      
      db.setCurrentUser(mappedUser);

      // 4. Route redirection
      setTimeout(() => {
        if (finalRole === "super_admin") {
          router.push("/dashboard/super");
        } else if (finalRole === "college_admin") {
          router.push("/dashboard/college");
        } else if (finalRole === "club_admin") {
          router.push("/dashboard/club");
        } else {
          router.push("/feed");
        }
      }, 1000);

    } catch (err: any) {
      setError(err.message || "Failed to finalize profile registry.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060c] text-white flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-t-2 border-brand-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500 tracking-widest uppercase">Syncing account details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#06060c] text-white flex flex-col justify-between overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full bg-brand-primary/12 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-brand-secondary/12 blur-[130px] pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center">
            <span className="font-display font-bold text-xl text-white">E</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-xl bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">EventVerse</h1>
            <p className="text-[10px] text-brand-secondary uppercase tracking-widest font-semibold mt-0.5">Onboarding Portal</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md glass-glow-card rounded-2xl p-6 sm:p-8 relative overflow-hidden space-y-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="space-y-1.5 text-center">
            <h3 className="font-display font-bold text-xl text-white">Choose Your Profile Details</h3>
            <p className="text-xs text-gray-400">Establish your unique identifier inside EventVerse</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl flex items-center gap-2 text-xs">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Kabir Verma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-xs"
                required
              />
            </div>

            {/* Username Input */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Username *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. kabir_v"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full glass-input rounded-xl p-3 pr-10 text-xs ${
                    isAvailable === true ? "border-green-500/30" : isAvailable === false ? "border-red-500/30" : ""
                  }`}
                  required
                />
                <div className="absolute right-3 top-3.5 flex items-center">
                  {isChecking ? (
                    <div className="w-3.5 h-3.5 border-t-2 border-brand-primary rounded-full animate-spin"></div>
                  ) : isAvailable === true ? (
                    <CheckCircle className="w-4.5 h-4.5 text-green-500" />
                  ) : isAvailable === false ? (
                    <AlertCircle className="w-4.5 h-4.5 text-red-500" />
                  ) : null}
                </div>
              </div>
              
              {/* Feedback messages */}
              {validationError && (
                <p className="text-[10px] text-red-400">{validationError}</p>
              )}
              {!validationError && isAvailable === true && (
                <p className="text-[10px] text-green-400">Username is available!</p>
              )}
              {!validationError && isAvailable === false && (
                <p className="text-[10px] text-red-400">Username is already taken.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || isAvailable === false || !!validationError || !username}
              className="w-full bg-nebula hover:bg-nebula-hover text-white rounded-xl py-3 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              <span>Finalize & Enter Space</span>
              <Rocket className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-6 border-t border-white/5 bg-[#040408]/60 text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} EventVerse Campus Networks. Built for College Hackathons.</p>
      </footer>
    </div>
  );
}
