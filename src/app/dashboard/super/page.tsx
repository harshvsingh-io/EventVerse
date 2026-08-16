"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { db, College, User, generateUUID } from "@/lib/db";
import { Shield, Check, X, RefreshCw, Mail, Plus, AlertCircle, Calendar } from "lucide-react";

export default function SuperDashboard() {
  const router = useRouter();
  
  // Session & database states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);

  // New college request states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState("");
  const [newCollegeDomain, setNewCollegeDomain] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const user = db.getCurrentUser();
    if (!user || user.role !== "super_admin") {
      router.push("/feed");
      return;
    }
    setCurrentUser(user);
    loadSuperData();
    setLoading(false);
  }, []);

  const loadSuperData = () => {
    // Super admins can see all colleges but no event/user data of specific colleges
    const allColleges = db.getColleges();
    setColleges(allColleges);
  };

  const handleApproveCollege = (id: string) => {
    const currentColleges = db.getColleges();
    const idx = currentColleges.findIndex(c => c.id === id);
    if (idx !== -1) {
      currentColleges[idx] = {
        ...currentColleges[idx],
        status: 'approved'
      };
      db.setColleges(currentColleges);
      setSuccess(`Campus "${currentColleges[idx].name}" approved and onboarded!`);
      loadSuperData();
    }
  };

  const handleRejectCollege = (id: string) => {
    const currentColleges = db.getColleges();
    const filtered = currentColleges.filter(c => c.id !== id);
    db.setColleges(filtered);
    setSuccess("Request rejected.");
    loadSuperData();
  };

  const handleOnboardCollege = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newCollegeName || !newCollegeDomain || !adminName || !adminEmail) {
      setError("Please fill in all fields.");
      return;
    }

    const currentColleges = db.getColleges();
    if (currentColleges.some(c => c.domain.toLowerCase() === newCollegeDomain.toLowerCase())) {
      setError("A college with this domain already exists.");
      return;
    }

    const newCollegeId = generateUUID();
    const newCollege: College = {
      id: newCollegeId,
      name: newCollegeName,
      domain: newCollegeDomain,
      status: 'approved', // Auto-approved when created by Super Admin
      createdAt: new Date().toISOString()
    };

    // Create the College Admin user for that college
    const currentUsers = db.getUsers();
    const newAdmin: User = {
      id: generateUUID(),
      collegeId: newCollegeId,
      name: adminName,
      email: adminEmail,
      role: 'college_admin',
      emailVerified: true,
      createdAt: new Date().toISOString()
    };

    currentColleges.push(newCollege);
    db.setColleges(currentColleges);

    currentUsers.push(newAdmin);
    db.setUsers(currentUsers);

    setShowAddModal(false);
    setNewCollegeName("");
    setNewCollegeDomain("");
    setAdminName("");
    setAdminEmail("");
    setSuccess("College onboarded and Admin credentials created successfully!");
    loadSuperData();
  };

  if (!currentUser) return null;

  const pendingColleges = colleges.filter(c => c.status === 'pending');
  const approvedColleges = colleges.filter(c => c.status === 'approved');

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col">
      <Header />

      {/* Messages Banner */}
      {(success || error) && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6">
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">
              <p className="text-xs font-semibold">{success}</p>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-white">EventVerse Cloud Core</h2>
            <p className="text-xs text-gray-400">Platform Super Administrator Console</p>
          </div>
          <button
            onClick={() => {
              setError("");
              setShowAddModal(true);
            }}
            className="bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl py-2.5 px-4 font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-brand-primary/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard College</span>
          </button>
        </div>

        {/* Isolation Alert */}
        <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-brand-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-gray-200">Strict Data Privacy Guard (Tenancy Rules)</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Super Admins only oversee registered campuses, whitelist domain configurations, and central billing contacts. 
              Row Level Security policies prevent Super Admins from querying event logs, student email databases, or forum content of any college.
            </p>
          </div>
        </div>

        {/* Grid: Pending vs Active */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pending requests */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-base text-white border-b border-white/5 pb-2">
              Onboarding Requests ({pendingColleges.length})
            </h3>
            {pendingColleges.length > 0 ? (
              <div className="space-y-3">
                {pendingColleges.map((college) => {
                  return (
                    <div key={college.id} className="glass-card rounded-xl p-5 flex items-center justify-between">
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">{college.name}</h4>
                        <p className="text-[10px] text-gray-400">Whitelist Domain: @{college.domain}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveCollege(college.id)}
                          className="bg-green-500/10 hover:bg-green-500/20 text-green-400 p-2 rounded-lg border border-green-500/20 transition-colors"
                          title="Approve College"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectCollege(college.id)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg border border-red-500/20 transition-colors"
                          title="Reject Request"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-xl text-xs text-gray-500">
                No pending college requests at this time.
              </div>
            )}
          </div>

          {/* Active Campuses */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-base text-white border-b border-white/5 pb-2">
              Active Campus Networks ({approvedColleges.length})
            </h3>
            {approvedColleges.length > 0 ? (
              <div className="space-y-3">
                {approvedColleges.map((college) => {
                  // Find admin contact
                  const adminUser = db.getUsers().find(u => u.collegeId === college.id && u.role === 'college_admin');

                  return (
                    <div key={college.id} className="glass-card rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-white">{college.name}</h4>
                        <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                          Active
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px] text-gray-400 border-t border-white/5 pt-3">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-brand-secondary" />
                          <span className="truncate">{adminUser ? adminUser.email : "No admin assigned"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                          <span>Onboarded: {new Date(college.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-xl text-xs text-gray-500">
                No active campuses yet.
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ONBOARDING MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 sm:p-8 w-full max-w-md">
            <h3 className="font-display font-bold text-lg text-white mb-6">Onboard College Network</h3>
            <form onSubmit={handleOnboardCollege} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">College Name *</label>
                <input
                  type="text"
                  placeholder="e.g. BITS Pilani"
                  value={newCollegeName}
                  onChange={(e) => setNewCollegeName(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Email Whitelist Domain *</label>
                <input
                  type="text"
                  placeholder="e.g. bits-pilani.ac.in"
                  value={newCollegeDomain}
                  onChange={(e) => setNewCollegeDomain(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs"
                  required
                />
              </div>

              <div className="border-t border-white/5 pt-4 my-2">
                <p className="text-[10px] text-brand-secondary uppercase font-semibold tracking-wider mb-2">College Administrator Details</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-medium">Admin Full Name *</label>
                    <input
                      type="text"
                      placeholder="Prof. Joshi"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full glass-input rounded-xl p-3 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-medium">Admin Contact Email *</label>
                    <input
                      type="email"
                      placeholder="joshi@bits-pilani.ac.in"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full glass-input rounded-xl p-3 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs border border-white/5 bg-white/5 hover:bg-white/10 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold py-2.5 px-4 rounded-lg"
                >
                  Confirm & Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
