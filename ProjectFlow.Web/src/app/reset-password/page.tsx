"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2, ArrowRight, Sun, Moon, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useThemeStore } from "@/store/useThemeStore";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    token: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const email = searchParams.get("email") || "";
    let token = searchParams.get("token") || "";
    
    if (!token) {
      setShowTokenInput(true);
    }

    // URL often converts '+' to ' ' (space), we need to fix it back
    token = token.replace(/ /g, "+");
    setFormData(prev => ({ ...prev, email, token }));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await api.post("/api/v1/auth/reset-password", {
        email: formData.email,
        token: formData.token,
        newPassword: formData.newPassword
      });
      setIsSuccess(true);
    } catch (err: any) {
      const serverMessage = err.response?.data?.error?.message || err.response?.data?.message;
      setError(serverMessage || "Failed to reset password. The token might be invalid or expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none" style={{ backgroundColor: isDark ? "rgba(37,99,235,0.06)" : "rgba(59,130,246,0.1)" }} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] blur-[100px] rounded-full pointer-events-none" style={{ backgroundColor: isDark ? "rgba(147,51,234,0.04)" : "rgba(139,92,246,0.08)" }} />

      <button onClick={toggleTheme} className="absolute top-6 right-6 p-2.5 rounded-xl border transition-all hover:scale-110" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
        {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-500" />}
      </button>

      <div className="w-full max-w-md z-10 p-4">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 mx-auto mb-4 text-xl">P</div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Reset Password</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Enter your new password below.</p>
          </div>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center animate-in fade-in duration-300">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: "var(--text-secondary)" }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    required 
                    placeholder="name@company.com" 
                    className="input-field w-full pl-10" 
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  />
                </div>
              </div>

              {(showTokenInput || !formData.token) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: "var(--text-secondary)" }}>
                    Reset Token
                  </label>
                  <div className="relative">
                    <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      required 
                      placeholder="Paste your reset token here" 
                      className="input-field w-full pl-10" 
                      value={formData.token} 
                      onChange={(e) => setFormData({ ...formData, token: e.target.value })} 
                    />
                  </div>
                  <p className="text-[10px] text-blue-500/60 ml-1">Check the API response or your email for the token.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: "var(--text-secondary)" }}>
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••" 
                    className="input-field w-full pl-10" 
                    value={formData.newPassword} 
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: "var(--text-secondary)" }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••" 
                    className="input-field w-full pl-10" 
                    value={formData.confirmPassword} 
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} 
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-4">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Update Password <ArrowRight size={18} /></>}
              </button>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-green-500" size={32} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Password Reset!</h3>
              <p className="text-sm px-4 mb-8" style={{ color: "var(--text-secondary)" }}>Your password has been successfully updated. You can now login with your new password.</p>
              <Link href="/login" className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3">Login Now</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
