"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, College, User, PingCategory, Club, generateUUID } from "@/lib/db";
import { Search, Compass, Rocket, Bell, ShieldCheck, Mail, UserCheck, ArrowRight, Check, Users, Shield, BookOpen, Sparkles } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  
  // Database states
  const [colleges, setColleges] = useState<College[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  
  // Form states
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

  useEffect(() => {
    db.syncFromSupabase().then(() => {
      // Check if user is already logged in
      const user = db.getCurrentUser();
      if (user) {
        redirectUser(user);
      }
      
      // Load colleges
      setColleges(db.getColleges().filter(c => c.status === "approved"));
    });
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
      setError(`Please use your official college email. Whitelisted domain: @${selectedCollege.domain} (Or use your personal Gmail/Outlook for testing).`);
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
    redirectUser(createdUser);
  };

  return (
    <div className="relative min-h-screen bg-[#06060c] text-white flex flex-col justify-between overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full bg-brand-primary/12 blur-[130px] animate-float-slow pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-brand-secondary/12 blur-[130px] animate-float-medium pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-brand-accent/5 blur-[120px] animate-float-fast pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <span className="font-display font-bold text-xl text-white tracking-widest">E</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight leading-none bg-gradient-to-r from-white via-[#f5f5f7] to-gray-500 bg-clip-text text-transparent">EventVerse</h1>
            <p className="text-[10px] text-brand-secondary uppercase tracking-widest font-semibold mt-0.5">Your Campus. Your Universe.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              // Direct login for demo users
              const testUser = db.getUsers().find(u => u.email === "kabir.verma@learner.manipal.edu");
              if (testUser) {
                db.setCurrentUser(testUser);
                router.push("/feed");
              }
            }}
            className="text-xs font-semibold text-gray-300 hover:text-white transition-all py-1.5 px-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-brand-secondary/30 active:scale-95 shadow-inner cursor-pointer"
          >
            Quick Guest Demo
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 py-12">
        {/* Left Side: Hero Brand Message */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner text-xs text-brand-secondary font-medium">
            <Compass className="w-3.5 h-3.5 text-brand-secondary" />
            <span>Multi-Tenant Campus Network</span>
          </div>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.15] text-white">
            Your Campus. <br />
            <span className="text-nebula">Your Universe of Events.</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
            College event info is scattered across WhatsApp groups and Instagram stories. EventVerse gives every campus its own isolated, notification-powered event hub.
          </p>
 
          {/* Core App Pitch Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto lg:mx-0 pt-6">
            <div className="flex items-start gap-3 text-left">
              <div className="p-2 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary mt-1">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-200">DB Tenant Isolation</h4>
                <p className="text-xs text-gray-400">Strict isolation guarantees data privacy per college.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-left">
              <div className="p-2 rounded-lg bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary mt-1">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-200">Zero Spam Rule</h4>
                <p className="text-xs text-gray-400">A strict 48-hour ping cooldown forces clubs to send high-value digest emails.</p>
              </div>
            </div>
          </div>
        </div>
 
        {/* Right Side: Onboarding Panel */}
        <div className="w-full max-w-md animate-float-medium">
          <div className="glass-glow-card rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            {/* Nebula Ambient Light behind card */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/20 rounded-full blur-2xl pointer-events-none"></div>

            {/* Wizard Stepper Progress Bar */}
            <div className="flex items-center gap-1.5 mb-6 px-0.5 pointer-events-none">
              <span className={`h-1 flex-1 rounded-full transition-all duration-500 ${['college', 'auth', 'otp', 'roles', 'club_setup', 'categories'].includes(step) ? 'bg-brand-primary' : 'bg-white/10'}`}></span>
              <span className={`h-1 flex-1 rounded-full transition-all duration-500 ${['auth', 'otp', 'roles', 'club_setup', 'categories'].includes(step) ? 'bg-brand-primary' : 'bg-white/10'}`}></span>
              <span className={`h-1 flex-1 rounded-full transition-all duration-500 ${['otp', 'roles', 'club_setup', 'categories'].includes(step) ? 'bg-brand-primary' : 'bg-white/10'}`}></span>
              <span className={`h-1 flex-1 rounded-full transition-all duration-500 ${['roles', 'club_setup', 'categories'].includes(step) ? 'bg-brand-primary' : 'bg-white/10'}`}></span>
            </div>
 
            {/* STEP 1: SELECT COLLEGE */}
            {step === "college" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-2xl text-white">Find Your Campus</h3>
                  <p className="text-sm text-gray-400">Select your college to enter your university's event universe.</p>
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by college name or domain..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full glass-input rounded-xl py-3 pl-10 pr-4 text-sm"
                  />
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredColleges.length > 0 ? (
                    filteredColleges.map((college) => (
                      <button
                        key={college.id}
                        onClick={() => handleSelectCollege(college)}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-brand-primary/30 transition-all text-left group"
                      >
                        <div>
                          <h4 className="font-semibold text-sm text-white group-hover:text-brand-primary transition-colors">{college.name}</h4>
                          <span className="text-xs text-gray-400">@{college.domain}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No registered colleges found. Contact platform admin to request onboarding.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: USER AUTH (LOGIN / SIGNUP) */}
            {step === "auth" && selectedCollege && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="font-display font-bold text-xl text-white">{isLogin ? "Log In" : "Sign Up"}</h3>
                    <p className="text-xs text-gray-400">Campus: {selectedCollege.name}</p>
                  </div>
                  <button
                    onClick={() => setStep("college")}
                    className="text-xs text-brand-secondary hover:underline"
                  >
                    Change College
                  </button>
                </div>

                <form onSubmit={handleSendOTP} className="space-y-4">
                  {error && (
                    <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                      {error}
                    </div>
                  )}

                  {!isLogin && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400 font-medium">Full Name</label>
                      <input
                        type="text"
                        placeholder="Aarav Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full glass-input rounded-xl p-3 text-sm"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-medium">College Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        placeholder={`you@${selectedCollege.domain}`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full glass-input rounded-xl py-3 pl-10 pr-4 text-sm"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 block leading-tight">
                      Must end in @{selectedCollege.domain} to verify domain whitelist.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-nebula hover:bg-nebula-hover text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-primary/20 transition-all active:scale-[0.98]"
                  >
                    <span>Receive OTP Code</span>
                    <Rocket className="w-4 h-4" />
                  </button>
                </form>

                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError("");
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {isLogin ? "Don't have an account? Sign Up" : "Already registered? Log In"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: OTP VERIFICATION */}
            {step === "otp" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-2xl text-white">Enter OTP</h3>
                  <p className="text-sm text-gray-400">We've sent a 6-digit code to <span className="text-gray-200">{email}</span></p>
                </div>

                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  {error && (
                    <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg font-medium">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-3 text-xs bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg leading-relaxed">
                      {success}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-medium">Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full glass-input rounded-xl p-3 text-center tracking-widest text-lg font-bold"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-nebula hover:bg-nebula-hover text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <span>Verify & Enter</span>
                    <UserCheck className="w-4 h-4" />
                  </button>
                </form>

                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setStep("auth");
                      setError("");
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Go Back / Edit Email
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: ROLE SELECTION */}
            {step === "roles" && (
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <h3 className="font-display font-bold text-xl text-white">Select Campus Role</h3>
                  <p className="text-xs text-gray-400">Choose your privilege level on campus. This shapes your dashboard access.</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => handleRoleSelect("student")}
                    className="w-full flex items-start gap-4 p-5 rounded-xl border border-white/5 bg-white/3 hover:bg-white/8 hover:border-brand-primary/40 hover:scale-[1.01] text-left transition-all duration-300 active:scale-[0.99] group cursor-pointer shadow-lg shadow-black/20"
                  >
                    <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary mt-0.5 group-hover:scale-105 transition-transform">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-brand-primary transition-colors">Campus Student</h4>
                      <p className="text-[11px] text-gray-400 leading-normal mt-0.5">
                        Subscribe to ping channels, save events, upvote on general forum boards, and receive DM digests.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleRoleSelect("club_admin")}
                    className="w-full flex items-start gap-4 p-5 rounded-xl border border-white/5 bg-white/3 hover:bg-white/8 hover:border-brand-secondary/40 hover:scale-[1.01] text-left transition-all duration-300 active:scale-[0.99] group cursor-pointer shadow-lg shadow-black/20"
                  >
                    <div className="p-2 rounded-lg bg-brand-secondary/10 text-brand-secondary mt-0.5 group-hover:scale-105 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-brand-secondary transition-colors">Club Leader / Representative</h4>
                      <p className="text-[11px] text-gray-400 leading-normal mt-0.5">
                        Register your club, create events with custom flyers, draft emails, and broadcast direct alerts to subscribers.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleRoleSelect("college_admin")}
                    className="w-full flex items-start gap-4 p-5 rounded-xl border border-white/5 bg-white/3 hover:bg-white/8 hover:border-pink-500/40 hover:scale-[1.01] text-left transition-all duration-300 active:scale-[0.99] group cursor-pointer shadow-lg shadow-black/20"
                  >
                    <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500 mt-0.5 group-hover:scale-105 transition-transform">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-pink-400 transition-colors">College Dean / Administrator</h4>
                      <p className="text-[11px] text-gray-400 leading-normal mt-0.5">
                        Moderate the campus, invite/approve registered clubs, configure categories, and reset broadcast cooldowns.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: CLUB SETUP DETAILS (FOR CLUB LEADERS) */}
            {step === "club_setup" && (
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <h3 className="font-display font-bold text-xl text-white">Create Club Profile</h3>
                  <p className="text-xs text-gray-400">Provide details to register your organization's campus profile.</p>
                </div>

                <form onSubmit={handleClubSetup} className="space-y-4">
                  {error && (
                    <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-medium">Club / Association Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. BITS Robotics Club"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="w-full glass-input rounded-xl p-3 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-medium">Club Logo URL</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={clubLogoUrl}
                      onChange={(e) => setClubLogoUrl(e.target.value)}
                      className="w-full glass-input rounded-xl p-3 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-medium">Short Description</label>
                    <textarea
                      placeholder="Describe your organization's theme, objectives, and events..."
                      value={clubDesc}
                      onChange={(e) => setClubDesc(e.target.value)}
                      rows={3}
                      className="w-full glass-input rounded-xl p-3 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-nebula hover:bg-nebula-hover text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-brand-primary/10 transition-all"
                  >
                    <span>Register Organization</span>
                    <Sparkles className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* STEP 6: FIRST-TIME PING ONBOARDING (FOR STUDENTS) */}
            {step === "pings" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-2xl text-white">Subscribe to Pings</h3>
                  <p className="text-sm text-gray-400">Choose which categories you want notifications for. You only get pinged when updates happen here.</p>
                </div>

                <div className="flex flex-wrap gap-2.5 py-4">
                  {categories.map((cat) => {
                    const isSelected = selectedPings.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handlePingToggle(cat.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                          isSelected
                            ? "bg-brand-primary/20 text-white border-brand-primary shadow-lg shadow-brand-primary/15 scale-105"
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
                  onClick={handleFinishOnboarding}
                  className="w-full bg-nebula hover:bg-nebula-hover text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Go to Dashboard Feed</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
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
