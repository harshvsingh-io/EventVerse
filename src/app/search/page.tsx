"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Search as SearchIcon, User as UserIcon, Compass } from "lucide-react";

interface ProfileResult {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search trigger
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, role")
          .ilike("username", `%${query}%`)
          .limit(10);

        if (error) throw error;
        setResults((data as ProfileResult[]) || []);
      } catch (err) {
        console.error("Search profiles query error:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <div className="min-h-screen bg-[#06060c] text-white p-6 max-w-lg mx-auto space-y-6">
      {/* Page Title */}
      <div className="space-y-1">
        <h2 className="font-display font-extrabold text-2xl tracking-tight flex items-center gap-2">
          <Compass className="w-6 h-6 text-brand-primary" />
          <span>Explore Campus</span>
        </h2>
        <p className="text-xs text-gray-500">Find student profiles, club leaders, or administrators</p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <SearchIcon className="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder="Search by username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full glass-input rounded-xl py-3.5 pl-10 pr-4 text-xs font-semibold"
          autoFocus
        />
      </div>

      {/* Search Results List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-t-2 border-brand-primary rounded-full animate-spin"></div>
          </div>
        ) : results.length > 0 ? (
          <div className="glass-card rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            {results.map((profile) => (
              <div
                key={profile.id}
                onClick={() => router.push(`/profile/${profile.username}`)}
                className="flex items-center justify-between p-4 hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
                    alt={profile.username}
                    className="w-10 h-10 rounded-full object-cover border border-white/10"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-brand-primary transition-colors">
                      {profile.full_name || profile.username}
                    </h4>
                    <span className="text-[10px] text-gray-500">@{profile.username}</span>
                  </div>
                </div>

                {/* Role indicator tag */}
                <span className={`text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
                  profile.role === "club_admin" 
                    ? "text-brand-secondary border-brand-secondary/30 bg-brand-secondary/5"
                    : profile.role === "college_admin"
                    ? "text-pink-400 border-pink-400/30 bg-pink-400/5"
                    : "text-gray-400 border-white/5 bg-white/5"
                }`}>
                  {profile.role.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="text-center py-10 text-xs text-gray-500 space-y-1">
            <UserIcon className="w-8 h-8 mx-auto text-gray-600 mb-1" />
            <p className="font-semibold text-gray-400">No profiles found</p>
            <p>Try matching spelling or searching another name.</p>
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-gray-600">
            Start typing to discover campus profiles...
          </div>
        )}
      </div>
    </div>
  );
}
