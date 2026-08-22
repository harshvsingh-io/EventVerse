"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, College, User, PingCategory, Club, generateUUID } from "@/lib/db";
import { 
  Search, 
  Compass, 
  Rocket, 
  Bell, 
  ShieldCheck, 
  Mail, 
  UserCheck, 
  ArrowRight, 
  Check, 
  Users, 
  Shield, 
  BookOpen, 
  Sparkles,
  ArrowUpRight,
  Globe,
  Clock,
  ChevronRight,
  X,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConstellationCanvas from "@/components/ConstellationCanvas";

export default function LandingPage() {
  const router = useRouter();
  
  // Database states
  const [colleges, setColleges] = useState<College[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  
  // Form/Modal states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"college" | "auth" | "otp" | "roles" | "club_setup" | "pings">("college");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdUser, setCreatedUser] = useState<User | null>(null);

  // Club setup states
  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [clubLogoUrl, setClubLogoUrl] = useState("https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=100&auto=format&fit=crop&q=60");

  // Ping selection states (for onboarding)
  const [categories, setCategories] = useState<PingCategory[]>([]);
  const [selectedPings, setSelectedPings] = useState<string[]>([]);

  // Featured showcase events (static for visual storytelling)
  const [sampleEvents, setSampleEvents] = useState<any[]>([]);

  useEffect(() => {
    db.syncFromSupabase().then(() => {
      // Check if user is already logged in
      const user = db.getCurrentUser();
      if (user) {
        redirectUser(user);
      }
      
      // Load colleges
      const approvedColleges = db.getColleges().filter(c => c.status === "approved");
      setColleges(approvedColleges);

      // Load 3 events for visual showcases
      setSampleEvents(db.getEvents().slice(0, 3));
    });
  }, []);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("campus-search-input");
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredColleges = colleges.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const redirectUser = (user: User) => {
    if (user.role === "super_admin") {
      router.push("/dashboard/super");
    } else if (user.role === "college_admin") {
      router.push("/dashboard/college");
    } else if (user.role === "club_admin") {
      router.push("/dashboard/club");
    } else {
      router.push("/feed");
    }
  };

  const handleSelectCollege = (college: College) => {
    setSelectedCollege(college);
    setStep("auth");
    setShowOnboarding(true);
    setError("");
  };

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!isLogin && !name) {
      setError("Name is required for Sign Up");
      return;
    }

    // Domain verification check (personal email accepted for demo testing)
    const emailDomain = email.split("@")[1].toLowerCase();
    const isPersonalEmail = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"].includes(emailDomain);
    
    if (
      selectedCollege &&
      emailDomain !== selectedCollege.domain.toLowerCase() &&
      !email.endsWith(".manipal.edu") && // Support MUJ domain
      !email.endsWith("eventverse.com") && // Support super admin testing
      !isPersonalEmail
    ) {
      setError(`Please use your official college email. Whitelisted domain: @${selectedCollege.domain} (Or use personal Gmail for testing).`);
      return;
    }

    // Simulation: check if user exists for login
    if (isLogin) {
      const users = db.getUsers();
      const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (!userExists) {
        setError("Email not registered. Please sign up instead!");
        return;
      }
    }

    // Success - trigger mock OTP
    setSuccess(`OTP sent successfully to ${email}! (Use "123456" for demo)`);
    setStep("otp");
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp !== "123456") {
      setError("Invalid OTP. Please enter '123456' for the demo.");
      return;
    }

    if (isLogin) {
      const result = db.login(email, otp);
      if (result.success && result.user) {
        setShowOnboarding(false);
        redirectUser(result.user);
      } else {
        setError(result.error || "Login failed");
      }
    } else {
      if (selectedCollege) {
        const result = db.signup(name, email, selectedCollege.id);
        if (result.success && result.user) {
          setCreatedUser(result.user);
          // Go to select roles page
          setStep("roles");
        } else {
          setError(result.error || "Signup failed");
        }
      }
    }
  };

  const handleRoleSelect = (role: "student" | "club_admin" | "college_admin") => {
    if (!createdUser || !selectedCollege) return;
    setError("");

    const allUsers = db.getUsers();
    const idx = allUsers.findIndex(u => u.id === createdUser.id);
    if (idx !== -1) {
      // Modify user role in local database
      allUsers[idx].role = role;
      db.setUsers(allUsers);

      const updatedUser = { ...createdUser, role };
      setCreatedUser(updatedUser);
      db.setCurrentUser(updatedUser);

      if (role === "student") {
        const cats = db.getIsolatedCategories(selectedCollege.id);
        setCategories(cats);
        setStep("pings");
      } else if (role === "club_admin") {
        setStep("club_setup");
      } else {
        // College admin goes straight to college dashboard
        setShowOnboarding(false);
        redirectUser(updatedUser);
      }
    }
  };

  const handleClubSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdUser || !selectedCollege) return;
    setError("");

    if (!clubName) {
      setError("Club name is required");
      return;
    }

    const clubs = db.getClubs();
    const newClub: Club = {
      id: generateUUID(),
      collegeId: selectedCollege.id,
      name: clubName,
      logoUrl: clubLogoUrl,
      description: clubDesc || "Official campus club profile.",
      adminUserId: createdUser.id,
      lastPingSentAt: null,
      createdAt: new Date().toISOString()
    };

    clubs.push(newClub);
    db.setClubs(clubs);

    setSuccess("Club registered and configured!");
    setShowOnboarding(false);
    redirectUser(createdUser);
  };

  const handlePingToggle = (id: string) => {
    if (selectedPings.includes(id)) {
      setSelectedPings(selectedPings.filter(p => p !== id));
    } else {
      setSelectedPings([...selectedPings, id]);
    }
  };

  const handleFinishOnboarding = () => {
    if (!createdUser) return;

    // Save subscriptions
    const allSubs = db.getSubscriptions();
    const cleanSubs = allSubs.filter(s => s.userId !== createdUser.id);
    selectedPings.forEach(catId => {
      cleanSubs.push({ userId: createdUser.id, categoryId: catId });
    });
    db.setSubscriptions(cleanSubs);

    // Redirect
    setShowOnboarding(false);
    redirectUser(createdUser);
  };

  return (
    <div className="relative min-h-screen bg-[#030307] text-[#f5f5f7] flex flex-col justify-between overflow-x-hidden font-sans select-none selection:bg-brand-primary/20">
      
      {/* 1. Interactive Constellation Particles Layer */}
      <ConstellationCanvas />

      {/* Grid Overlay Lines (Linear-look details) */}
      <div className="absolute inset-0 line-grid-x opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 line-grid-y opacity-20 pointer-events-none"></div>

      {/* Radial Spotlights (Color Depth) */}
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full glow-spotlight-violet pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full glow-spotlight-blue pointer-events-none"></div>

      {/* ==========================================
          HEADER NAVBAR (Transparent -> Blur Scroll)
          ========================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#030307]/10 backdrop-blur-md transition-all py-5">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/")}>
            <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/10">
              <span className="font-display font-black text-md text-white tracking-widest">E</span>
            </div>
            <div>
              <h1 className="font-display font-black text-sm tracking-widest leading-none bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">EVENTVERSE</h1>
              <p className="text-[8px] tracking-wider text-brand-secondary uppercase font-bold mt-0.5">Your Campus. Your Universe.</p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold tracking-widest uppercase text-white/50">
            <a href="#hero" className="hover:text-white transition-colors">Explore</a>
            <a href="#search" className="hover:text-white transition-colors">Campuses</a>
            <a href="#features" className="hover:text-white transition-colors">Safety</a>
            <a href="#showcase" className="hover:text-white transition-colors">Constellations</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const testUser = db.getUsers().find(u => u.email === "kabir.verma@learner.manipal.edu");
                if (testUser) {
                  db.setCurrentUser(testUser);
                  router.push("/feed");
                }
              }}
              className="text-[10px] font-bold tracking-widest uppercase text-white/70 hover:text-white transition-all py-2.5 px-4.5 rounded-xl border border-white/5 bg-white/3 hover:bg-white/8 active:scale-95 cursor-pointer"
            >
              Guest Demo
            </button>
            <button 
              onClick={() => {
                setStep("college");
                setShowOnboarding(true);
              }}
              className="text-[10px] font-bold tracking-widest uppercase bg-brand-primary hover:bg-brand-primary/95 text-white py-2.5 px-5 rounded-xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-brand-primary/15"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================
          HERO SECTION
          ========================================== */}
      <section id="hero" className="relative z-10 max-w-7xl mx-auto w-full px-6 pt-20 pb-24 flex flex-col items-center text-center space-y-10">
        
        {/* Animated Eyebrow */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/3 border border-white/5 text-[9px] font-bold uppercase tracking-[0.25em] text-brand-secondary"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-secondary" />
          <span>The Campus Event Network</span>
        </motion.div>

        {/* Cinematic Headline */}
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-[0.95] text-gradient-expensive"
        >
          YOUR CAMPUS.<br />
          YOUR UNIVERSE.
        </motion.h2>

        {/* Cinematic Supporting Text */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-white/60 text-sm sm:text-base max-w-xl mx-auto leading-relaxed tracking-wide"
        >
          Discover events, constellation channels, and official announcements happening across your university — all synced into one secure, noise-free network.
        </motion.p>

        {/* Call to Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center gap-4 justify-center"
        >
          <a
            href="#search"
            className="w-full sm:w-auto text-[10px] font-bold tracking-widest uppercase bg-white hover:bg-neutral-100 text-black py-4 px-8 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-xl shadow-white/5"
          >
            <span>Explore Your Campus</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
          
          <button
            onClick={() => {
              setStep("college");
              setShowOnboarding(true);
            }}
            className="w-full sm:w-auto text-[10px] font-bold tracking-widest uppercase bg-white/3 hover:bg-white/5 border border-white/5 text-white py-4 px-8 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Open Entry Portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* Scroll Indicator */}
        <div className="pt-16 animate-bounce opacity-30 pointer-events-none">
          <div className="w-5 h-9 rounded-full border border-white/30 flex items-start justify-center p-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          </div>
        </div>
      </section>

      {/* ==========================================
          CAMPUS SELECTOR (Cmd+K styled)
          ========================================== */}
      <section id="search" className="relative z-10 max-w-4xl mx-auto w-full px-6 py-20 border-t border-white/5">
        <div className="glass-glow-card rounded-3xl p-8 sm:p-12 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-20 h-20 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="space-y-2 text-center sm:text-left">
            <h3 className="font-display font-extrabold text-2xl tracking-tight text-white uppercase">Find Your Campus</h3>
            <p className="text-xs text-white/50 leading-relaxed max-w-md">
              Enter your college name or official domain to enter its isolated event universe.
            </p>
          </div>

          {/* Command Search Console */}
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="campus-search-input"
              type="text"
              placeholder="Search by college name or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input rounded-2xl py-4.5 pl-11 pr-24 text-xs font-semibold focus:border-brand-primary/60 placeholder-gray-600"
            />
            {/* Cmd+K visual key indicator */}
            <div className="absolute right-3.5 top-3.5 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-gray-500 pointer-events-none">
              <span>⌘</span>
              <span>K</span>
            </div>
          </div>

          {/* Selector Results list */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {filteredColleges.length > 0 ? (
              filteredColleges.map((college) => (
                <div
                  key={college.id}
                  onClick={() => handleSelectCollege(college)}
                  className="w-full flex items-center justify-between p-4.5 rounded-2xl border border-white/5 bg-white/3 hover:bg-brand-primary/5 hover:border-brand-primary/30 transition-all text-left group cursor-pointer active:scale-[0.99]"
                >
                  <div>
                    <h4 className="font-bold text-xs text-white group-hover:text-brand-primary transition-colors">{college.name}</h4>
                    <span className="text-[10px] text-gray-500">@{college.domain}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-brand-secondary/80 opacity-0 group-hover:opacity-100 transition-all">Enter</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-white/3 rounded-2xl border border-dashed border-white/5 text-xs text-gray-500 space-y-2">
                <p className="font-semibold text-gray-400">Your campus hasn't joined the universe yet.</p>
                <a 
                  href="mailto:support@eventverse.com?subject=Onboard Request for Campus"
                  className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-brand-secondary hover:underline"
                >
                  <span>Request campus onboarding</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==========================================
          EDITORIAL FEATURE SHOWCASE SECTION
          ========================================== */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto w-full px-6 py-24 border-t border-white/5 space-y-16">
        
        <div className="space-y-3.5 text-center max-w-xl mx-auto">
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-brand-secondary">Core Architecture</span>
          <h3 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight uppercase leading-none">Built for every campus.</h3>
          <p className="text-xs text-white/50 leading-relaxed">
            Strict isolation guidelines and structural design guarantees event announcements remain high-signal.
          </p>
        </div>

        {/* Asymmetric Editorial layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Feature 1 */}
          <div className="lg:col-span-7 glass-card rounded-3xl p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
            <span className="font-display font-black text-6xl text-white/5 tracking-tighter self-end absolute top-6 right-6">01</span>
            <div className="space-y-4 max-w-sm mt-12">
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-primary">RLS Network Protection</span>
              <h4 className="font-display font-bold text-xl text-white">Your campus, isolated.</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Strict multi-tenant row level security constraints prevent cross-college details leak. Your university network remains entirely private.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="lg:col-span-5 glass-card rounded-3xl p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
            <span className="font-display font-black text-6xl text-white/5 tracking-tighter self-end absolute top-6 right-6">02</span>
            <div className="space-y-4 max-w-xs mt-12">
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-secondary">Blast Rate Cooldowns</span>
              <h4 className="font-display font-bold text-xl text-white">Less noise. More signal.</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                A hard 48-hour email notification cooldown on club accounts forces organizers to publish meaningful, combined digests rather than spamming student inboxes.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="lg:col-span-12 glass-card rounded-3xl p-8 sm:p-10 relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 min-h-[220px]">
            <span className="font-display font-black text-6xl text-white/5 tracking-tighter absolute top-6 right-6 lg:static">03</span>
            <div className="space-y-4 max-w-lg">
              <span className="text-[9px] font-bold uppercase tracking-widest text-pink-500">Decentralized Channels</span>
              <h4 className="font-display font-bold text-xl text-white">Everything happening around you in one place.</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Subscribe directly to constellation categories like Tech Talks, Hackathons, or Music sunset jams. Receive DMs when clubs announce verified agendas.
              </p>
            </div>
            <button
              onClick={() => {
                setStep("college");
                setShowOnboarding(true);
              }}
              className="text-[10px] font-bold tracking-widest uppercase bg-white hover:bg-neutral-100 text-black py-4.5 px-8 rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 shrink-0 self-stretch lg:self-auto text-center justify-center"
            >
              <span>Explore Network</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ==========================================
          CONSTELLATION CARD SHOWCASE (Visual Storytelling)
          ========================================== */}
      <section id="showcase" className="relative z-10 max-w-7xl mx-auto w-full px-6 py-20 border-t border-white/5 space-y-12">
        <div className="space-y-3.5 text-center sm:text-left">
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-brand-secondary">Explore Constellations</span>
          <h3 className="font-display font-extrabold text-2xl sm:text-4xl uppercase leading-none">Active Constellation stars</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sampleEvents.map((item, idx) => (
            <div 
              key={item.id || idx}
              onClick={() => {
                setStep("college");
                setShowOnboarding(true);
              }}
              className="glass-card rounded-2xl overflow-hidden cursor-pointer group border border-white/5 pb-5 flex flex-col justify-between h-[360px]"
            >
              {item.bannerImageUrl && (
                <div className="aspect-[16/10] overflow-hidden bg-neutral-900 border-b border-white/5">
                  <img
                    src={item.bannerImageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[8px] font-bold tracking-widest uppercase text-brand-primary">CONSTELLATION STAR</span>
                  <h4 className="font-display font-bold text-md text-white group-hover:text-brand-secondary transition-colors line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider border-t border-white/5 pt-3 mt-3">
                  <span>📅 {new Date(item.eventDate).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                  <span className="truncate max-w-[120px]">📍 {item.venue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==========================================
          INTERACTIVE ONBOARDING WIZARD OVERLAY MODAL
          ========================================== */}
      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md bg-[#0a0a14] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden space-y-6"
            >
              {/* Nebula light flare in modal */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none"></div>

              {/* Close Button */}
              <button 
                onClick={() => setShowOnboarding(false)}
                className="absolute top-4.5 right-4.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 cursor-pointer text-gray-400 hover:text-white"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              {/* Wizard Stepper progress */}
              <div className="flex items-center gap-1.5 px-0.5 pointer-events-none">
                <span className={`h-1 flex-1 rounded-full transition-all duration-500 ${['college', 'auth', 'otp', 'roles', 'club_setup', 'pings'].includes(step) ? 'bg-brand-primary' : 'bg-white/10'}`}></span>
                <span className={`h-1 flex-1 rounded-full transition-all duration-500 ${['auth', 'otp', 'roles', 'club_setup', 'pings'].includes(step) ? 'bg-brand-primary' : 'bg-white/10'}`}></span>
                <span className={`h-1 flex-1 rounded-full transition-all duration-500 ${['otp', 'roles', 'club_setup', 'pings'].includes(step) ? 'bg-brand-primary' : 'bg-white/10'}`}></span>
                <span className={`h-1 flex-1 rounded-full transition-all duration-500 ${['roles', 'club_setup', 'pings'].includes(step) ? 'bg-brand-primary' : 'bg-white/10'}`}></span>
              </div>

              {/* STEP 1: SELECT CAMPUS */}
              {step === "college" && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h3 className="font-display font-bold text-xl text-white uppercase">Choose Campus</h3>
                    <p className="text-xs text-gray-400">Select campus domain to verify whitelists</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by college name or domain..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full glass-input rounded-xl p-3 text-xs"
                  />
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {filteredColleges.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCollege(c)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/3 hover:bg-white/8 transition-all text-left text-xs"
                      >
                        <div>
                          <h4 className="font-bold text-white">{c.name}</h4>
                          <span className="text-[10px] text-gray-500">@{c.domain}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: USER AUTH (LOGIN / SIGNUP) */}
              {step === "auth" && selectedCollege && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white uppercase">{isLogin ? "Log In" : "Sign Up"}</h3>
                      <p className="text-[10px] text-gray-500">Campus: {selectedCollege.name}</p>
                    </div>
                    <button onClick={() => setStep("college")} className="text-[10px] text-brand-secondary hover:underline">Change</button>
                  </div>

                  <form onSubmit={handleSendOTP} className="space-y-4">
                    {error && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}
                    {!isLogin && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Full Name</label>
                        <input
                          type="text"
                          placeholder="Aarav Sharma"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full glass-input rounded-xl p-3 text-xs"
                          required
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">College Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                        <input
                          type="email"
                          placeholder={`you@${selectedCollege.domain}`}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full glass-input rounded-xl py-3 pl-10 pr-4 text-xs"
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-nebula hover:bg-nebula-hover text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-primary/15 transition-all">
                      <span>Receive OTP Code</span>
                      <Rocket className="w-4 h-4" />
                    </button>
                  </form>
                  <div className="text-center">
                    <button onClick={() => { setIsLogin(!isLogin); setError(""); }} className="text-[10px] text-gray-400 hover:text-white transition-colors">
                      {isLogin ? "Don't have an account? Sign Up" : "Already registered? Log In"}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: OTP CODE VERIFICATION */}
              {step === "otp" && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h3 className="font-display font-bold text-xl text-white uppercase">Enter OTP</h3>
                    <p className="text-xs text-gray-400">We've sent a demo code to <span className="text-gray-200 font-semibold">{email}</span></p>
                  </div>

                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    {error && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}
                    {success && <div className="p-3 text-xs bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl leading-normal">{success}</div>}
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Verification Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full glass-input rounded-xl p-3 text-center tracking-widest text-base font-bold"
                        required
                      />
                    </div>

                    <button type="submit" className="w-full bg-nebula hover:bg-nebula-hover text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all">
                      <span>Verify & Enter</span>
                      <UserCheck className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 4: ROLE SELECTOR */}
              {step === "roles" && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-lg text-white uppercase">Select Campus Role</h3>
                    <p className="text-xs text-gray-400">Shape your dashboard and publication levels</p>
                  </div>
                  <div className="space-y-3">
                    <button onClick={() => handleRoleSelect("student")} className="w-full flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/3 hover:bg-white/8 hover:border-brand-primary/30 text-left transition-all active:scale-[0.99] cursor-pointer">
                      <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary mt-0.5"><BookOpen className="w-4.5 h-4.5" /></div>
                      <div>
                        <h4 className="font-bold text-xs text-white">Campus Student</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Subscribe to categories and save events.</p>
                      </div>
                    </button>
                    <button onClick={() => handleRoleSelect("club_admin")} className="w-full flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/3 hover:bg-white/8 hover:border-brand-secondary/30 text-left transition-all active:scale-[0.99] cursor-pointer">
                      <div className="p-2 rounded-lg bg-brand-secondary/10 text-brand-secondary mt-0.5"><Users className="w-4.5 h-4.5" /></div>
                      <div>
                        <h4 className="font-bold text-xs text-white">Club Leader</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Register club and publish announcement pings.</p>
                      </div>
                    </button>
                    <button onClick={() => handleRoleSelect("college_admin")} className="w-full flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/3 hover:bg-white/8 hover:border-pink-500/30 text-left transition-all active:scale-[0.99] cursor-pointer">
                      <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500 mt-0.5"><Shield className="w-4.5 h-4.5" /></div>
                      <div>
                        <h4 className="font-bold text-xs text-white">College Administrator</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Moderate campus database and approve clubs.</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: CLUB SETUP DETAILS */}
              {step === "club_setup" && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-lg text-white uppercase">Register Club</h3>
                    <p className="text-xs text-gray-400">Configure your organization's campus profile</p>
                  </div>
                  <form onSubmit={handleClubSetup} className="space-y-4">
                    {error && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Club Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. BITS Robotics Club"
                        value={clubName}
                        onChange={(e) => setClubName(e.target.value)}
                        className="w-full glass-input rounded-xl p-3 text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Logo URL</label>
                      <input
                        type="url"
                        value={clubLogoUrl}
                        onChange={(e) => setClubLogoUrl(e.target.value)}
                        className="w-full glass-input rounded-xl p-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Description</label>
                      <textarea
                        value={clubDesc}
                        onChange={(e) => setClubDesc(e.target.value)}
                        className="w-full glass-input rounded-xl p-3 text-xs"
                        rows={2}
                      />
                    </div>
                    <button type="submit" className="w-full bg-nebula hover:bg-nebula-hover text-white rounded-xl py-3 text-xs font-bold cursor-pointer">
                      Create Organization Profile
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 6: SUBSCRIBED CATEGORIES */}
              {step === "pings" && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h3 className="font-display font-bold text-lg text-white uppercase">Subscribe to Pings</h3>
                    <p className="text-xs text-gray-400 font-semibold">Select interests to verify push frequency DMs</p>
                  </div>
                  <div className="flex flex-wrap gap-2 py-2">
                    {categories.map((c) => {
                      const isSel = selectedPings.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => handlePingToggle(c.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold cursor-pointer transition-all ${
                            isSel 
                              ? "bg-brand-primary/20 text-white border-brand-primary scale-105"
                              : "bg-white/3 text-gray-400 border-white/5 hover:bg-white/8 hover:text-white"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={handleFinishOnboarding} className="w-full bg-nebula hover:bg-nebula-hover text-white rounded-xl py-3 text-xs font-bold cursor-pointer">
                    Finish Onboarding
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          FOOTER (Premium Editorial Footer)
          ========================================== */}
      <footer className="relative z-10 border-t border-white/5 bg-[#030307]/50 pt-20 pb-8 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 pb-16">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center">
                <span className="font-display font-black text-sm text-white">E</span>
              </div>
              <h2 className="font-display font-black text-sm tracking-widest text-white">EVENTVERSE</h2>
            </div>
            <p className="text-[11px] text-white/40 max-w-sm leading-relaxed">
              EventVerse isolates and registers official college channels into neat, noise-free student networks. Keep campus coordination high-signal.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold tracking-widest uppercase text-white">Constellations</h4>
            <div className="flex flex-col gap-2.5 text-[11px]">
              <a href="#hero" className="hover:text-white transition-colors">Explore</a>
              <a href="#search" className="hover:text-white transition-colors">Campuses</a>
              <a href="#features" className="hover:text-white transition-colors">Safety Policies</a>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold tracking-widest uppercase text-white">Support</h4>
            <div className="flex flex-col gap-2.5 text-[11px]">
              <a href="mailto:support@eventverse.com" className="hover:text-white transition-colors">Developer Contact</a>
              <a href="mailto:support@eventverse.com" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-semibold">
          <p>&copy; {new Date().getFullYear()} EventVerse Campus Networks. Built for College Hackathons.</p>
          <p className="text-brand-secondary tracking-widest uppercase">Every Campus is a Small Universe.</p>
        </div>
      </footer>

    </div>
  );
}
