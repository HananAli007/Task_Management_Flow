"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { projectApi, Project } from "@/lib/api/projects";
import { taskApi, Task } from "@/lib/api/tasks";
import { SkeletonDashboard } from "@/components/Skeleton";
import { useAuthStore } from "@/store/useAuthStore";

export default function Dashboard() {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [projectsData, tasksData] = await Promise.all([
        projectApi.getAll(),
        taskApi.getMyTasks()
      ]);
      setProjects(projectsData);
      setTasks(tasksData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && projects.length === 0) {
    return <SkeletonDashboard />;
  }

  const activeProjects = projects.length;
  const completedTasks = tasks.filter(t => t.system_status === 3 || t.status === "completed").length;
  const overdueTasks = tasks.filter(
    t => t.deadline && new Date(t.deadline) < new Date() && (t.system_status !== 3 && t.status !== "completed")
  ).length;

  const stats = [
    { label: "Active Projects", value: activeProjects.toString(), icon: TrendingUp, color: "text-blue-400",   bg: "bg-blue-400/10", trend: "+2 this month", bars: [40, 60, 30, 70, 45, 90] },
    { label: "Total Tasks",     value: tasks.length.toString(),   icon: Clock,       color: "text-purple-400", bg: "bg-purple-400/10", trend: "+5 this week", bars: [20, 40, 55, 30, 80, 60] },
    { label: "Completed",       value: completedTasks.toString(), icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10", trend: "No completions yet", bars: [10, 10, 15, 20, 10, 15] },
    { label: "Overdue",         value: overdueTasks.toString(),   icon: AlertCircle, color: "text-red-400",   bg: "bg-red-400/10", trend: "Needs attention", bars: [30, 70, 40, 50, 90, 80] },
  ];

  const recentProjects = projects.slice(0, 3);
  const priorityTasks = tasks
    .filter(t => (t.priority === "high" || t.priority === "urgent"))
    .sort((a, b) => {
       if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
       if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
       return 0;
    })
    .slice(0, 5);

  const activities = tasks
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5)
    .map(task => ({
      id: task.id,
      user: task.assignee_name || "Someone",
      action: task.system_status === 0 ? 'created task' : 'updated task',
      target: task.title,
      time: task.created_at ? new Date(task.created_at).toLocaleDateString() : "Recently",
      avatar: task.assignee_avatar,
      color: task.system_status === 3 ? "bg-green-500" : "bg-blue-500"
    }));

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Dashboard Overview
          </h1>
          <p className="text-sm mt-1 font-semibold opacity-60 text-[var(--text-secondary)]">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — Welcome back, {user?.name || "User"} 👋
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            title="System alerts"
            aria-label="System alerts"
            className="p-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
          >
             <AlertCircle size={18} className="text-red-400" />
          </button>
          <button 
            onClick={() => window.location.href = '/projects'}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-sm`}>
              <stat.icon className={stat.color} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1 text-[var(--text-secondary)]">
                {stat.label}
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
                  {stat.value}
                </h3>
                <span className={`text-xs font-bold ${stat.label === "Overdue" ? "text-red-500" : "text-emerald-500"} opacity-80`}>
                   {stat.trend.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-8 glass-card p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-base font-bold uppercase tracking-widest opacity-80 text-[var(--text-primary)]">
              Recent Projects
            </h2>
            <button 
               onClick={() => window.location.href = '/projects'}
               className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1"
            >
              View all &rarr;
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentProjects.length === 0 ? (
              <p className="text-sm opacity-50 py-4 col-span-full">No recent projects.</p>
            ) : (
                recentProjects.map((project) => {
                  const progressStyle = { "--progress": `${project.progress}%` } as React.CSSProperties;
                  return (
                    <div
                      key={project.id}
                      className="flex flex-col p-5 rounded-2xl bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 hover:border-blue-500/30 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                      onClick={() => window.location.href = `/board?projectId=${project.id}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center font-bold text-sm border border-blue-500/10 shadow-sm group-hover:scale-110 transition-transform">
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          project.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {project.status}
                        </div>
                      </div>
                      
                      <h4 className="text-base font-black theme-text-primary group-hover:text-blue-400 transition-colors mb-1 truncate">
                        {project.name}
                      </h4>
                      <p className="text-xs text-muted-foreground opacity-50 line-clamp-1 mb-4">
                        {project.description || "No description provided."}
                      </p>

                      <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-[#0F1117] bg-gray-800 flex items-center justify-center text-[8px] font-bold">
                              {String.fromCharCode(64 + i)}
                            </div>
                          ))}
                          {project.member_ids?.length > 3 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white dark:border-[#0F1117] bg-blue-600 flex items-center justify-center text-[8px] font-bold text-white">
                              +{project.member_ids.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] font-bold theme-text-primary mb-1">
                              {Number(project.progress).toFixed(0)}% Complete
                            </div>
                            <div className="w-20 h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  project.progress > 70 ? 'bg-emerald-500' : project.progress > 30 ? 'bg-blue-500' : 'bg-amber-500'
                                } w-[var(--progress)]`}
                                style={progressStyle}
                              />
                            </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Priority Tasks */}
          <div className="glass-card p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-base font-bold uppercase tracking-widest opacity-80 text-[var(--text-primary)]">
                Priority Tasks
              </h2>
              <button 
                onClick={() => window.location.href = '/tasks'}
                className="text-xs font-bold text-blue-500 hover:underline"
              >
                See all
              </button>
            </div>
            <div className="space-y-4">
              {priorityTasks.length === 0 ? (
                <p className="text-sm opacity-50">No urgent tasks.</p>
              ) : (
                  priorityTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between group cursor-pointer"
                    onClick={() => window.location.href = `/board?projectId=${task.project_id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500'}`} />
                      <div className="max-w-[150px]">
                        <h4 className="text-sm font-bold theme-text-primary leading-none group-hover:text-blue-400 transition-colors truncate">
                          {task.title}
                        </h4>
                        <p className="text-xs opacity-40 mt-1.5 truncate">{task.project_name}</p>
                      </div>
                    </div>
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      task.priority === 'urgent' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-8">
            <h2 className="text-base font-bold uppercase tracking-widest opacity-80 mb-8 text-[var(--text-primary)]">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-sm opacity-40 text-center py-10">No recent activity</p>
              ) : (
                activities.map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 group/item">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-indigo-500/10 shadow-sm overflow-hidden">
                      {activity.avatar ? (
                         <img src={activity.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                         <span>{activity.user.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">
                        <span className="text-[var(--text-primary)]">{activity.user}</span>
                        <span className="mx-1 font-medium opacity-50 text-[var(--text-secondary)]">{activity.action}</span>
                        <span className="text-indigo-400 group-hover/item:underline cursor-pointer">{activity.target}</span>
                      </p>
                      <p className="text-xs opacity-40 font-medium text-[var(--text-secondary)]">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
