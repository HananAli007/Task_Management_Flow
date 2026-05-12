"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trello,
  CheckSquare,
  Settings,
  LogOut,
  FolderKanban,
  Users,
  Sun,
  Moon,
  Activity,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { usePermission } from "@/hooks/usePermission";
import { taskApi } from "@/lib/api/tasks";
import { useState, useEffect } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/",         screen: "Dashboard" },
  { icon: FolderKanban,    label: "Projects",  href: "/projects", screen: "Projects" },
  { icon: Trello,          label: "Board",     href: "/board",    screen: "Board" },
  { icon: CheckSquare,     label: "My Tasks",  href: "/tasks",    screen: "Tasks", showBadge: true },
  { icon: Users,           label: "Team",      href: "/team",     screen: "Team" },
  { icon: Settings,        label: "Settings",  href: "/settings", screen: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { canViewScreen } = usePermission();

  const isDark = theme === "dark";

  if (!user && pathname === "/login") return null;

  return (
    <aside
      className="w-64 glass-card rounded-none border-y-0 border-l-0 flex flex-col h-full z-20 bg-[var(--bg-sidebar)] border-[var(--border-color)]"
    >
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            P
          </div>
          <span
            className="text-xl font-bold tracking-tight text-[var(--text-primary)]"
          >
            ProjectFlow
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 py-4">
        {navItems.map((item) => {
          if (item.screen !== "Settings" && item.screen !== "Dashboard" && !canViewScreen(item.screen)) return null;
          
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? "bg-blue-600/10 text-blue-500 border border-blue-500/10 shadow-[0_0_20px_rgba(37,99,235,0.05)]"
                  : "hover:bg-white/[0.03] text-[var(--text-secondary)]"
              }`}
            >
              <item.icon size={18} />
              <span className="text-[13px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="p-4 border-t space-y-2 border-[var(--border-color)]"
      >
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all group text-[var(--text-secondary)]"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            {isDark ? (
              <Sun
                size={20}
                className="text-amber-400 group-hover:text-amber-300 transition-colors"
              />
            ) : (
              <Moon
                size={20}
                className="text-indigo-500 group-hover:text-indigo-400 transition-colors"
              />
            )}
          </div>

          <span className="font-medium flex-1 text-left text-[var(--text-primary)]">
            {isDark ? "Light Mode" : "Dark Mode"}
          </span>

          {/* Toggle pill */}
          <div
            className={`w-10 h-5 rounded-full transition-all duration-300 flex items-center px-0.5 ${
              isDark ? "bg-gray-700" : "bg-blue-100"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full shadow-sm transition-all duration-300 ${
                isDark
                  ? "translate-x-5 bg-amber-400"
                  : "translate-x-0 bg-indigo-500"
              }`}
            />
          </div>
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          title="Logout"
          aria-label="Logout"
          className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>

        {/* User card */}
        {user && (
          <div
            className="mt-2 flex items-center gap-3 px-4 py-2 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)]"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate text-[var(--text-primary)]"
              >
                {user.name}
              </p>
              <p
                className="text-xs truncate text-[var(--text-muted)]"
              >
                {user.role}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
