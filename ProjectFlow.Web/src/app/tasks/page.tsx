"use client";

import React, { useState, useEffect } from "react";
import { Plus, Filter, Search, CheckSquare, Loader2 } from "lucide-react";
import { taskApi, Task } from "@/lib/api/tasks";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { SkeletonTable } from "@/components/Skeleton";

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "urgent": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#3b82f6";
    default: return "#94a3b8";
  }
};

const getPriorityClass = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "urgent": return "bg-red-500/10 text-red-500 border border-red-500/20";
    case "high": return "bg-orange-500/10 text-orange-500 border border-orange-500/20";
    case "medium": return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
    default: return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
  }
};

const getStatusColor = (status: string, systemStatus?: number) => {
  if (systemStatus === 3 || status.toLowerCase() === "completed") return "text-green-500";
  if (systemStatus === 1) return "text-blue-500";
  if (systemStatus === 2) return "text-orange-500";
  if (systemStatus === 0) return "text-slate-400";
  
  switch (status.toLowerCase()) {
    case "completed": return "text-green-500";
    case "in_progress": return "text-blue-500";
    case "review": return "text-orange-500";
    default: return "text-muted";
  }
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, activeFilter]);

  const fetchTasks = async () => {
    try {
      const data = await taskApi.getMyTasks();
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...tasks];
    if (activeFilter !== "all") {
      if (activeFilter === "no deadline") {
        result = result.filter(t => !t.deadline);
      } else {
        result = result.filter(t => t.priority.toLowerCase() === activeFilter.toLowerCase());
      }
    }
    setFilteredTasks(result);
  };

  const overdueCount = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.system_status !== 3).length;
  const completedCount = tasks.filter(t => t.system_status === 3).length;

  if (isLoading && tasks.length === 0) {
    return (
      <div className="h-full flex flex-col space-y-8 animate-in fade-in">
        <SkeletonTable />
      </div>
    );
  }

  const filters = [
    { label: "All", id: "all" },
    { label: "Urgent", id: "urgent" },
    { label: "High", id: "high" },
    { label: "Medium", id: "medium" },
    { label: "No deadline", id: "no deadline" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            My Tasks
          </h1>
          <p className="text-xs mt-1 font-medium opacity-60 text-[var(--text-secondary)]">
            Keep track of your individual contributions and deadlines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 text-[var(--text-primary)]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search tasks..."
              className="bg-white/5 border border-white/10 pl-9 pr-4 py-2 text-xs w-64 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-xs font-bold px-4">
            Filter
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            Add Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap border ${
              activeFilter === f.id
                ? "bg-[#6366f1]/10 border-[#6366f1]/20 text-[#6366f1] shadow-sm"
                : "bg-white/5 border-white/10 hover:bg-white/10 opacity-60"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/[0.01] dark:bg-white/[0.01] border-b border-black/5 dark:border-white/5">
                <th className="px-6 py-5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">Task Name</th>
                <th className="px-6 py-5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">Project</th>
                <th className="px-6 py-5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">Assignee</th>
                <th className="px-6 py-5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">Priority</th>
                <th className="px-6 py-5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">Due Date</th>
                <th className="px-6 py-5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center opacity-40">
                    <CheckSquare size={40} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-medium">No tasks found.</p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr 
                    key={task.id} 
                    className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shadow-sm ${
                          task.priority.toLowerCase() === "urgent" ? "bg-red-500" :
                          task.priority.toLowerCase() === "high" ? "bg-orange-500" :
                          task.priority.toLowerCase() === "medium" ? "bg-blue-500" : "bg-slate-400"
                        }`} />
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-[#6366f1] transition-colors">
                          {task.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-[#eff6ff] text-[#3b82f6] dark:bg-blue-500/10 dark:text-blue-400">
                        {task.project_name}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold overflow-hidden shadow-sm">
                           {task.assignee_avatar ? (
                             <img src={task.assignee_avatar} alt="" className="w-full h-full object-cover" />
                           ) : (
                             <span>{task.assignee_name?.charAt(0) || "U"}</span>
                           )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {task.assignee_name || "Unassigned"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl ${
                        task.priority.toLowerCase() === 'urgent' 
                        ? 'bg-[#fef2f2] text-[#ef4444] dark:bg-red-500/10' 
                        : 'bg-[#eff6ff] text-[#3b82f6] dark:bg-blue-500/10'
                      }`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}
                    </td>
                    <td className="px-6 py-6 text-right">
                       <span className={`text-[11px] font-bold px-4 py-1.5 rounded-xl ${
                         task.system_status === 3 ? "bg-[#ecfdf5] text-[#10b981] dark:bg-emerald-500/10" : 
                         task.system_status === 1 ? "bg-[#ecfdf5] text-[#10b981] dark:bg-emerald-500/10" :
                         task.system_status === 2 ? "bg-[#f5f3ff] text-[#8b5cf6] dark:bg-purple-500/10" :
                         "bg-[#f1f5f9] text-[#64748b] dark:bg-slate-500/10"
                       }`}>
                         {task.status_name || "To Do"}
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchTasks} 
      />

      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTaskId(null);
        }}
        onUpdate={fetchTasks}
      />
    </div>
  );
}
