"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, ArrowRight, ArrowLeft, Sun, Moon, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useThemeStore } from "@/store/useThemeStore";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState("");

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
      await api.post("/api/v1/auth/forgot-password", { email });
      setIsSuccess(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || "Failed to send reset request. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* Background Glows */}
      <div
        className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none"
        style={{ backgroundColor: isDark ? "rgba(37,99,235,0.06)" : "rgba(59,130,246,0.1)" }}
      />
      <div
        className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] blur-[100px] rounded-full pointer-events-none"
        style={{ backgroundColor: isDark ? "rgba(147,51,234,0.04)" : "rgba(139,92,246,0.08)" }}
      />

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-xl border transition-all hover:scale-110"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
      >
        {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-500" />}
      </button>

      <div className="w-full max-w-md z-10 p-4">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 mx-auto mb-4 text-xl">
              P
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Forgot Password?
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              No worries, we&apos;ll send you reset instructions.
            </p>
          </div>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-lg animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-500 text-white rounded-full p-1">
                      <Lock size={12} />
                    </div>
                    <p className="text-xs font-semibold text-red-800 dark:text-red-400">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest ml-1" style={{ color: "var(--text-secondary)" }}>
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    className="input-field w-full pl-10 h-12 bg-gray-50 dark:bg-white/5 border-gray-200 focus:bg-white transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold shadow-xl shadow-blue-500/20 hover:-translate-y-0.5 transition-all"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Send Reset Link <ArrowRight size={18} /></>}
              </button>
            </form>
          ) : (
            <div className="text-center py-6 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-green-500" size={32} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Check your email</h3>
              <p className="text-sm px-4 mb-8" style={{ color: "var(--text-secondary)" }}>
                If an account exists for <span className="font-bold text-blue-500">{email}</span>, you will receive a password reset link shortly.
              </p>

              {/* Development Help - Only for testing */}
              {process.env.NODE_ENV === "development" && (
                <div className="mt-4 mb-8 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl text-left">
                  <p className="text-[10px] font-bold uppercase text-blue-500 mb-2">Development Info</p>
                  <p className="text-xs text-blue-400/80 break-all">A reset link has been generated in the background for testing.</p>
                  <Link 
                    href="/reset-password" 
                    className="text-xs text-blue-500 hover:underline mt-2 inline-block"
                  >
                    Go to Reset Screen manually →
                  </Link>
                </div>
              )}

              <Link 
                href="/login" 
                className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3"
              >
                Return to Login
              </Link>
            </div>
          )}

          <div className="mt-8 text-center text-sm">
            <Link href="/login" className="text-gray-500 hover:text-blue-500 inline-flex items-center gap-2 transition-colors">
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
