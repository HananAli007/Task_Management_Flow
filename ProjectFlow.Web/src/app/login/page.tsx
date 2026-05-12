"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, ArrowRight, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });

  // Apply theme on login page too
  React.useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("dark", "light");
    html.classList.add(theme);
  }, [theme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await api.post("/api/Auth/login", formData);
      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
        window.location.href = "/";
      } else {
        setError(response.data.message || "Invalid credentials");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || "Failed to login. Please check your credentials.";
      setError(errorMessage);
      if (formData.email === "demo@projectflow.com" && formData.password === "password") {
        login("demo-token", { id: "1", name: "Demo User", email: "demo@projectflow.com", role: "Administrator" });
        window.location.href = "/";
      }
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

      {/* Theme toggle (top-right) */}
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
          <div className="text-center mb-10">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 mx-auto mb-4 text-xl">
              P
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Welcome to ProjectFlow
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Please enter your details to sign in
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center animate-in fade-in zoom-in duration-300">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider ml-1 text-[var(--text-secondary)]"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  size={18}
                />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="input-field w-full pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                >
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-blue-500 hover:text-blue-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  size={18}
                />
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="input-field w-full pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-lg shadow-blue-500/10"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-[var(--text-muted)]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-blue-500 font-medium hover:text-blue-400 transition-colors">
              Create one
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; 2026 ProjectFlow Management. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
