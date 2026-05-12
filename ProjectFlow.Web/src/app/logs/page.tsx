"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Tag, 
  FileText, 
  LogIn, 
  UserPlus, 
  PlusCircle, 
  Edit3, 
  Trash2,
  ChevronRight,
  Clock,
  Shield,
  Layout
} from "lucide-react";
import { logApi, ActivityLog } from "@/lib/api/logs";
import { SkeletonLogs } from "@/components/Skeleton";

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await logApi.getRecent(100);
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterAction === "all" || log.action?.toLowerCase().includes(filterAction.toLowerCase());
    
    return matchesSearch && matchesFilter;
  });

  const getActionIcon = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes("log")) return <LogIn className="text-blue-400" size={18} />;
    if (a.includes("sign")) return <UserPlus className="text-emerald-400" size={18} />;
    if (a.includes("create")) return <PlusCircle className="text-indigo-400" size={18} />;
    if (a.includes("update")) return <Edit3 className="text-amber-400" size={18} />;
    if (a.includes("delete")) return <Trash2 className="text-red-400" size={18} />;
    return <Activity className="text-gray-400" size={18} />;
  };

  const getEntityTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("project")) return <Layout size={14} />;
    if (t.includes("task")) return <FileText size={14} />;
    if (t.includes("user")) return <User size={14} />;
    if (t.includes("tag")) return <Tag size={14} />;
    return <Activity size={14} />;
  };

  if (isLoading) return <SkeletonLogs />;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
              <Shield className="text-indigo-400" size={18} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Security & Compliance</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
            System Activity Logs
          </h1>
          <p className="text-sm mt-1 opacity-60 font-medium text-[var(--text-secondary)]">
            Detailed audit trail of all user actions and system events.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
              <input 
                type="text" 
                placeholder="Search logs..." 
                className="input-field w-full pl-10 h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <button 
             onClick={fetchLogs}
             title="Refresh logs"
             aria-label="Refresh logs"
             className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
           >
             <Clock size={20} className="text-blue-400" />
           </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: "all", label: "All Activity", icon: Activity },
          { id: "log", label: "Access", icon: LogIn },
          { id: "create", label: "Additions", icon: PlusCircle },
          { id: "update", label: "Changes", icon: Edit3 },
          { id: "delete", label: "Deletions", icon: Trash2 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterAction(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterAction === tab.id 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                : "bg-white/5 border border-white/5 opacity-60 hover:opacity-100"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Logs Table/List */}
      <div className="glass-card overflow-hidden border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">User</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Action</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Details</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">IP Address</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center opacity-40">
                    <div className="flex flex-col items-center gap-3">
                      <Activity size={48} className="opacity-10" />
                      <p className="font-bold">No activity logs found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] opacity-40 font-medium">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-2 ring-white/5">
                          {log.user_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{log.user_name || "System"}</span>
                          <span className="text-[10px] opacity-40 truncate max-w-[120px]">{log.user_email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-white/5`}>
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">{log.action}</span>
                          <div className="flex items-center gap-1 opacity-40">
                             {getEntityTypeIcon(log.entity_type)}
                             <span className="text-[9px] font-bold uppercase tracking-tighter">{log.entity_type}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs xl:max-w-md">
                        <p className="text-xs opacity-70 line-clamp-1 group-hover:line-clamp-none transition-all duration-300 text-[var(--text-secondary)]">
                          {log.details}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] font-mono opacity-40 bg-white/5 px-2 py-1 rounded border border-white/5">
                        {log.ip_address || "127.0.0.1"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         title="View details"
                         aria-label="View details"
                         className="p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5 rounded-lg"
                       >
                          <ChevronRight size={16} className="opacity-40" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination/Footer */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
          <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
            Showing {filteredLogs.length} of {logs.length} events
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg border border-white/5 text-[10px] font-bold opacity-40 hover:opacity-100 disabled:opacity-20" disabled>Previous</button>
            <button className="px-3 py-1.5 rounded-lg border border-white/5 text-[10px] font-bold opacity-40 hover:opacity-100 disabled:opacity-20" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
