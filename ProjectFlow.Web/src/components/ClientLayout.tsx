"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { SignalRProvider } from "@/context/SignalRContext";
import { Toaster } from "sonner";
import { ChatPanel } from "@/components/ChatPanel";
import { useChatStore } from "@/store/useChatStore";
import { userApi, User } from "@/lib/api/users";
import { Phone, Search, X, Loader2 } from "lucide-react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, fetchMe, isLoading } = useAuthStore();
  const { theme } = useThemeStore();
  const { activeChatUser, setActiveChatUser } = useChatStore();

  const [mounted, setMounted] = useState(false);
  const [showDialerPopup, setShowDialerPopup] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (token) {
      const fetchAllUsers = async () => {
        setIsLoadingUsers(true);
        try {
          const usersList = await userApi.getAll();
          setAllUsers(usersList);
        } catch (e) {
          console.error("Failed to fetch users list for global dialer", e);
        } finally {
          setIsLoadingUsers(false);
        }
      };
      fetchAllUsers();
    }
  }, [token]);

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

          {/* Floating Global Calling Dialer Button */}
          {mounted && token && !isPublicRoute && (
            <div className="absolute bottom-6 right-6 z-[999] flex flex-col items-end gap-3">
              {showDialerPopup && (
                <div className="w-[300px] max-h-[380px] bg-white/95 dark:bg-[#121324]/95 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col p-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Global Call Dialer</span>
                    <button 
                      onClick={() => setShowDialerPopup(false)}
                      className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 animate-none"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  {/* Search box */}
                  <div className="relative mt-3">
                    <input 
                      type="text"
                      placeholder="Search member..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  
                  {/* Users list */}
                  <div className="flex-1 overflow-y-auto mt-3 space-y-2 custom-scrollbar min-h-[150px]">
                    {isLoadingUsers ? (
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="animate-spin text-blue-500" size={16} />
                      </div>
                    ) : allUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400">
                        No members found.
                      </div>
                    ) : (
                      allUsers
                        .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(u => (
                          <div key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                                ) : (
                                  u.name.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{u.name}</p>
                                <p className="text-[9px] text-gray-400 capitalize">{u.role || 'Member'}</p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => {
                                setActiveChatUser(u);
                                setShowDialerPopup(false);
                                setTimeout(() => {
                                  window.dispatchEvent(new CustomEvent('initiate-outbound-call'));
                                }, 500);
                              }}
                              className="p-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl transition-all shadow-md shadow-blue-500/10"
                              title={`Call ${u.name}`}
                            >
                              <Phone size={12} />
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
              
              {/* Trigger floating button */}
              {!activeChatUser && (
                <button
                  onClick={() => setShowDialerPopup(!showDialerPopup)}
                  className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-500/20 transition-all border border-white/10"
                  title="Global Dialer"
                >
                  <Phone size={20} />
                </button>
              )}
            </div>
          )}

          {mounted && activeChatUser && (
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
