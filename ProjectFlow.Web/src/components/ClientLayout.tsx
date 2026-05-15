"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { SignalRProvider } from "@/context/SignalRContext";
import { Toaster } from "sonner";
import { ChatPanel } from "@/components/ChatPanel";
import { useChatStore } from "@/store/useChatStore";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, fetchMe, isLoading } = useAuthStore();
  const { theme } = useThemeStore();
  const { activeChatUser, setActiveChatUser } = useChatStore();

  // Apply theme class to <html> element
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("dark", "light");
    html.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const checkAuth = async () => {
      if (token && !user) {
        await fetchMe();
      }
    };
    checkAuth();
  }, [token, user, fetchMe]);

  const publicRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    const handleOpenChat = async (e: any) => {
      const { userId, name } = e.detail;
      // If we have a name, we can create a placeholder user
      if (name) {
        setActiveChatUser({ id: userId, name, email: '', role: '', is_deleted: false, created_at: '' });
      } else {
        // Try to find in team list if possible (though we don't have it here)
        // For now, we'll rely on the event providing the name
        setActiveChatUser({ id: userId, name: 'User', email: '', role: '', is_deleted: false, created_at: '' });
      }
    };
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, [setActiveChatUser]);

  useEffect(() => {
    if (!isLoading && !token && !isPublicRoute) {
      router.push("/login");
    }
    // Don't redirect to dashboard if on reset-password, even if logged in
    if (!isLoading && token && isPublicRoute && pathname !== "/reset-password") {
      window.location.href = "/";
    }
  }, [isLoading, token, pathname, router, isPublicRoute]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <SignalRProvider>
      <Toaster position="top-right" richColors />
      <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
        <Sidebar />
        <main
          className="flex-1 overflow-hidden relative flex flex-col bg-[var(--bg-primary)]"
        >
          {/* Background Decorations */}
          <div
            className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] blur-[120px] rounded-full pointer-events-none opacity-80 bg-[radial-gradient(circle,_var(--glow-blue)_0%,_transparent_70%)]"
          />
          <div
            className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] blur-[100px] rounded-full pointer-events-none opacity-60 bg-[radial-gradient(circle,_var(--glow-purple)_0%,_transparent_70%)]"
          />

          <div className={`relative p-4 md:p-8 flex-1 flex flex-col h-full ${pathname === '/board' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {children}
          </div>

          {activeChatUser && (
            <ChatPanel 
              user={activeChatUser} 
              onClose={() => setActiveChatUser(null)} 
            />
          )}
        </main>
      </div>
    </SignalRProvider>
  );
}
