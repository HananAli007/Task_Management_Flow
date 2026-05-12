"use client";

import React, { useState, useEffect } from "react";
import { Settings, User, Bell, Shield, Palette, Database, ExternalLink, Sun, Moon, Check, Loader2 } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const sections = [
  { id: "profile",       label: "Profile Settings",  icon: User,     description: "Update your personal information and profile picture." },
  { id: "notifications", label: "Notifications",     icon: Bell,     description: "Manage how you receive alerts and communications." },
  { id: "security",      label: "Security",           icon: Shield,   description: "Configure two-factor authentication and password updates." },
  { id: "appearance",   label: "Appearance",          icon: Palette,  description: "Customize themes, colors, and layout preferences." },
  { id: "data",          label: "Data & Storage",    icon: Database, description: "Manage your project data and export options." },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("profile");
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const isDark = theme === "dark";

  // Form State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [storageSize, setStorageSize] = useState("0 KB");
  const [storagePercentage, setStoragePercentage] = useState(0);
  
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    jobRole: "Software Architect",
    location: "New York, USA",
    bio: "Building scalable systems and modern user experiences."
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    pushNotifications: false,
    taskUpdates: true,
    weeklyDigest: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("projectflow-profile");
    if (saved) {
      setProfileData(JSON.parse(saved));
    } else if (user) {
      setProfileData(prev => ({
        ...prev,
        fullName: user.name,
        email: user.email,
        jobRole: user.role === "admin" ? "Administrator" : "Team Member"
      }));
    }

    const savedNotifs = localStorage.getItem("projectflow-notifications");
    if (savedNotifs) {
      setNotificationSettings(JSON.parse(savedNotifs));
    }

    const savedAvatar = localStorage.getItem("projectflow-avatar");
    if (savedAvatar) setAvatarPreview(savedAvatar);

    const saved2fa = localStorage.getItem("projectflow-2fa");
    if (saved2fa === "true") setTwoFactorEnabled(true);

    calculateStorage();
  }, [user]);

  const calculateStorage = () => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += localStorage.getItem(key)?.length || 0;
      }
    }
    const bytes = total * 2;
    const kb = bytes / 1024;
    
    if (kb > 1024) {
      setStorageSize((kb / 1024).toFixed(2) + " MB");
    } else {
      setStorageSize(kb.toFixed(2) + " KB");
    }
    const percentage = Math.min((bytes / (5 * 1024 * 1024)) * 100, 100);
    setStoragePercentage(percentage);
  };

  const handleSaveProfile = () => {
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem("projectflow-profile", JSON.stringify(profileData));
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      calculateStorage();
    }, 800);
  };

  const handleSaveNotifications = () => {
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem("projectflow-notifications", JSON.stringify(notificationSettings));
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      calculateStorage();
    }, 800);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarPreview(base64);
        localStorage.setItem("projectflow-avatar", base64);
        calculateStorage();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setAvatarPreview(null);
    localStorage.removeItem("projectflow-avatar");
    calculateStorage();
  };

  const toggle2FA = () => {
    const newVal = !twoFactorEnabled;
    setTwoFactorEnabled(newVal);
    localStorage.setItem("projectflow-2fa", String(newVal));
  };

  const handleExportData = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("projectflow")) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projectflow-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setPasswordError("Please fill in all fields.");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsSaving(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const response = await api.post("/api/v1/auth/change-password", {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });

      if (response.data.success) {
        setPasswordSuccess("Password updated successfully!");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => setPasswordSuccess(""), 5000);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || "Failed to update password.";
      setPasswordError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete all local data and sign out? This cannot be undone.")) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith("projectflow")) {
          localStorage.removeItem(key);
        }
      }
      logout();
      router.push("/login");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Settings
        </h1>
        <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
          Manage your account preferences and application configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar nav */}
        <div className="lg:col-span-1 space-y-2">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                  isActive ? "border-blue-500/30" : ""
                }`}
                style={{
                  background: isActive ? "rgba(59,130,246,0.1)" : "var(--bg-card)",
                  borderColor: isActive ? "rgba(59,130,246,0.3)" : "var(--border-color)",
                  color: isActive ? "#3b82f6" : "var(--text-secondary)",
                }}
              >
                <div
                  className="p-2 rounded-xl transition-all"
                  style={{
                    background: isActive ? "#3b82f6" : "var(--bg-input)",
                    color: isActive ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  <section.icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: isActive ? "#3b82f6" : "var(--text-primary)" }}>
                    {section.label}
                  </p>
                  <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>
                    {section.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div className="lg:col-span-2 space-y-6">

          {/* Profile Section */}
          {activeSection === "profile" && (
            <div className="glass-card p-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
                  <User size={24} className="text-blue-500" />
                  Profile Information
                </h2>
                {saveSuccess && (
                  <span className="flex items-center gap-1 text-sm font-medium text-green-500 animate-in fade-in">
                    <Check size={16} /> Saved Successfully
                  </span>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8">
                  <div className="relative group">
                    <div 
                      className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-blue-500/20 overflow-hidden bg-cover bg-center"
                      style={{ backgroundImage: avatarPreview ? `url(${avatarPreview})` : undefined }}
                    >
                      {!avatarPreview && (profileData.fullName ? profileData.fullName.substring(0, 2).toUpperCase() : "JD")}
                    </div>
                    <button
                      className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-xl text-white hover:scale-110 transition-transform shadow-lg"
                      style={{ border: "4px solid var(--bg-primary)" }}
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                  <div className="flex-1 space-y-1 text-center md:text-left">
                    <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>Your Photo</h3>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>This will be displayed on your profile.</p>
                    <div className="flex gap-4 mt-4 justify-center md:justify-start">
                      <label className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors cursor-pointer">
                        Upload New
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      <button onClick={handleRemoveImage} className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors">Remove</button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: "var(--text-secondary)" }}>Full Name</label>
                    <input type="text" value={profileData.fullName} onChange={e => setProfileData({...profileData, fullName: e.target.value})} className="input-field w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: "var(--text-secondary)" }}>Email Address</label>
                    <input type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} className="input-field w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: "var(--text-secondary)" }}>Job Role</label>
                    <input type="text" value={profileData.jobRole} onChange={e => setProfileData({...profileData, jobRole: e.target.value})} className="input-field w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: "var(--text-secondary)" }}>Location</label>
                    <input type="text" value={profileData.location} onChange={e => setProfileData({...profileData, location: e.target.value})} className="input-field w-full" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: "var(--text-secondary)" }}>Bio</label>
                  <textarea rows={4} value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} className="input-field w-full resize-none" />
                </div>

                <div className="pt-6 flex justify-end gap-4">
                  <button className="btn-primary px-8 flex items-center gap-2" onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <div className="glass-card p-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
                  <Bell size={24} className="text-blue-500" />
                  Notification Preferences
                </h2>
                {saveSuccess && (
                  <span className="flex items-center gap-1 text-sm font-medium text-green-500 animate-in fade-in">
                    <Check size={16} /> Saved
                  </span>
                )}
              </div>

              <div className="space-y-6">
                {[
                  { id: "emailAlerts", label: "Email Alerts", desc: "Receive important updates via email" },
                  { id: "pushNotifications", label: "Push Notifications", desc: "Show desktop notifications for mentions" },
                  { id: "taskUpdates", label: "Task Updates", desc: "Get notified when a task is assigned to you" },
                  { id: "weeklyDigest", label: "Weekly Digest", desc: "Receive a weekly summary of project activity" }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: "var(--border-color)", background: "var(--bg-input)" }}>
                    <div>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{item.label}</p>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotificationSettings(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof notificationSettings] }))}
                      className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${
                        notificationSettings[item.id as keyof typeof notificationSettings] ? "bg-blue-500" : "bg-gray-600"
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                        notificationSettings[item.id as keyof typeof notificationSettings] ? "translate-x-6" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                ))}

                <div className="pt-6 flex justify-end gap-4">
                  <button className="btn-primary px-8 flex items-center gap-2" onClick={handleSaveNotifications} disabled={isSaving}>
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Save Preferences"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <div className="glass-card p-8 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
                <Shield size={24} className="text-blue-500" />
                Security Settings
              </h2>

              <div className="space-y-6">
                <div className="space-y-2 border-b pb-6" style={{ borderColor: "var(--border-color)" }}>
                  <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>Change Password</h3>
                  <div className="space-y-4 mt-4">
                    {passwordError && (
                      <div className="bg-red-500/10 border-l-4 border-red-500 p-3 rounded-r-lg text-xs font-semibold text-red-400">
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="bg-green-500/10 border-l-4 border-green-500 p-3 rounded-r-lg text-xs font-semibold text-green-400">
                        {passwordSuccess}
                      </div>
                    )}
                    <input 
                      type="password" 
                      placeholder="Current Password" 
                      className="input-field w-full"
                      value={passwordData.currentPassword}
                      onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    />
                    <input 
                      type="password" 
                      placeholder="New Password" 
                      className="input-field w-full" 
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                    />
                    <input 
                      type="password" 
                      placeholder="Confirm New Password" 
                      className="input-field w-full" 
                      value={passwordData.confirmPassword}
                      onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    />
                    <button 
                      className="btn-primary w-auto flex items-center gap-2"
                      onClick={handleUpdatePassword}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Update Password"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: "var(--border-color)", background: "var(--bg-input)" }}>
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Two-Factor Authentication</p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Add an extra layer of security to your account.</p>
                  </div>
                  <button onClick={toggle2FA} className={`text-sm px-4 py-1.5 font-bold rounded-lg transition-colors border ${twoFactorEnabled ? "bg-green-500/10 text-green-500 border-green-500/20" : "btn-primary"}`}>
                    {twoFactorEnabled ? "Enabled" : "Enable"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data & Storage Section */}
          {activeSection === "data" && (
            <div className="glass-card p-8 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
                <Database size={24} className="text-blue-500" />
                Data & Storage
              </h2>

              <div className="space-y-6">
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--border-color)", background: "var(--bg-input)" }}>
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Local Storage Usage</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "var(--text-secondary)" }}>Used: {storageSize}</span>
                      <span style={{ color: "var(--text-secondary)" }}>Total limit: 5.0 MB</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${storagePercentage}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border-color)" }}>
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Export Data</p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Download your local settings and mock data as JSON.</p>
                  </div>
                  <button onClick={handleExportData} className="btn-secondary text-sm">Export</button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-red-500">Delete Account & Data</p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Permanently remove your local data and sign out.</p>
                  </div>
                  <button onClick={handleDeleteAccount} className="text-sm font-semibold px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">Delete</button>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === "appearance" && (
            <div className="glass-card p-8 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
                <Palette size={24} className="text-blue-500" />
                Appearance
              </h2>

              <div className="space-y-6">
                <div>
                  <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Theme</p>
                  <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                    Choose between dark and light mode.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Dark card */}
                    <button
                      onClick={() => !isDark && toggleTheme()}
                      className={`p-4 rounded-2xl border-2 transition-all ${isDark ? "border-blue-500" : "border-transparent"}`}
                      style={{ background: "#050510" }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Moon size={16} className="text-indigo-400" />
                        <span className="text-sm font-semibold text-white">Dark</span>
                        {isDark && (
                          <span className="ml-auto text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 rounded-full bg-white/10 w-full" />
                        <div className="h-2 rounded-full bg-white/5 w-3/4" />
                        <div className="h-2 rounded-full bg-white/10 w-1/2" />
                      </div>
                    </button>

                    {/* Light card */}
                    <button
                      onClick={() => isDark && toggleTheme()}
                      className={`p-4 rounded-2xl border-2 transition-all ${!isDark ? "border-blue-500" : "border-transparent"}`}
                      style={{ background: "#f0f4ff" }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Sun size={16} className="text-amber-500" />
                        <span className="text-sm font-semibold text-slate-800">Light</span>
                        {!isDark && (
                          <span className="ml-auto text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 rounded-full bg-slate-200 w-full" />
                        <div className="h-2 rounded-full bg-slate-100 w-3/4" />
                        <div className="h-2 rounded-full bg-slate-200 w-1/2" />
                      </div>
                    </button>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-2xl border"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Quick Toggle</p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Currently: <strong>{isDark ? "Dark" : "Light"} Mode</strong>
                    </p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 ${
                      isDark ? "bg-gray-700" : "bg-blue-100"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full shadow-sm transition-all duration-300 ${
                        isDark ? "translate-x-7 bg-amber-400" : "translate-x-0 bg-indigo-500"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
