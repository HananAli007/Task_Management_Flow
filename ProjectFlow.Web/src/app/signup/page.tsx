"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, Loader2, ArrowRight, Sun, Moon, Users } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "member"
  });

  React.useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("dark", "light");
    html.classList.add(theme);
  }, [theme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post("/api/Auth/signup", formData);
      if (response.data.success && response.data.data?.token) {
        // Automatically login after signup
        login(response.data.data.token, response.data.data.user);
        window.location.href = "/";
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          "Failed to create account. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--bg-primary)]"
    >
      {/* Background Glows */}
      <div
        className={`absolute top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none ${isDark ? 'bg-blue-600/5' : 'bg-blue-500/10'}`}
      />
      <div
        className={`absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] blur-[100px] rounded-full pointer-events-none ${isDark ? 'bg-purple-600/5' : 'bg-purple-500/10'}`}
      />

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-xl border transition-all hover:scale-110 bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)]"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-500" />}
      </button>

      <div className="w-full max-w-md z-10 p-4">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 mx-auto mb-4 text-xl">
              P
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Create an Account
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Join ProjectFlow and start managing your tasks
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-lg animate-in fade-in slide-in-from-top-2 duration-300 mb-4">
                <p className="text-xs font-semibold text-red-800 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-[11px] font-bold uppercase tracking-widest ml-1 text-[var(--text-secondary)]">
                  Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="John Doe"
                    className="input-field w-full pl-10 h-11 bg-gray-50 dark:bg-white/5 border-gray-200 focus:bg-white transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-[11px] font-bold uppercase tracking-widest ml-1 text-[var(--text-secondary)]">
                  Phone (Optional)
                </label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    id="phone"
                    type="text"
                    placeholder="+1 (555) 000"
                    className="input-field w-full pl-10 h-11 bg-gray-50 dark:bg-white/5 border-gray-200 focus:bg-white transition-all"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest ml-1 text-[var(--text-secondary)]">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="input-field w-full pl-10 h-11 bg-gray-50 dark:bg-white/5 border-gray-200 focus:bg-white transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-widest ml-1 text-[var(--text-secondary)]">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="input-field w-full pl-10 h-11 bg-gray-50 dark:bg-white/5 border-gray-200 focus:bg-white transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1 ml-1">
                Must be at least 6 characters with uppercase, lowercase, number & symbol.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-[11px] font-bold uppercase tracking-widest ml-1 text-[var(--text-secondary)]">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="input-field w-full pl-10 h-11 bg-gray-50 dark:bg-white/5 border-gray-200 focus:bg-white transition-all"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="role" className="text-[11px] font-bold uppercase tracking-widest ml-1 text-[var(--text-secondary)]">
                Your Role
              </label>
              <div className="relative group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <select
                  id="role"
                  aria-label="Select your role"
                  className="input-field w-full pl-10 h-11 bg-gray-50 dark:bg-white/5 border-gray-200 focus:bg-white transition-all appearance-none cursor-pointer"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="member">Team Member (Collaborator)</option>
                  <option value="manager">Manager (Project Lead)</option>
                  <option value="admin">Administrator (Project Control)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <ArrowRight size={14} className="rotate-90" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-4 text-sm font-bold shadow-xl shadow-blue-500/20 hover:-translate-y-0.5 transition-all"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Create Account <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-[var(--text-muted)]">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 font-medium hover:text-blue-400">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
