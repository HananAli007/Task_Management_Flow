"use client";

import React, { useState, useEffect } from "react";
import { FolderKanban, Plus, Search, MoreVertical, Clock, Users as UsersIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { projectApi, Project } from "@/lib/api/projects";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { EditProjectModal } from "@/components/EditProjectModal";
import { usePermission } from "@/hooks/usePermission";

const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-red-500", "bg-indigo-500"];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const { hasGlobalPermission } = usePermission();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await projectApi.getAll();
      setProjects(data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setActiveDropdown(null);
    setProjectToEdit(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) {
      setActiveDropdown(null);
      return;
    }
    
    try {
      setActiveDropdown(null);
      await projectApi.delete(id);
      fetchProjects();
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" onClick={() => setActiveDropdown(null)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Projects
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Oversee and manage all your active organizational projects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size={18}
            />
            <input
              type="text"
              placeholder="Search projects..."
              className="input-field pl-10 pr-4 py-2 text-sm w-64 rounded-xl"
            />
          </div>
          {hasGlobalPermission('Projects', 'Create_Project') && (
            <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus size={20} />
              New Project
            </button>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted)]">
          <FolderKanban size={48} className="mx-auto mb-4 opacity-50" />
          <p>No projects found. Click "New Project" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project, idx) => {
            const color = colors[idx % colors.length];
            const progressStyle = { "--progress": `${project.progress}%` } as React.CSSProperties;
            return (
              <div key={project.id} className="glass-card glass-card-hover p-4 group relative overflow-visible">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === project.id ? null : project.id);
                      }}
                      className="hover:text-blue-500 transition-colors p-1 text-[var(--text-muted)]"
                      title="Project options"
                    >
                      <MoreVertical size={20} />
                    </button>
                    {activeDropdown === project.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border shadow-lg py-1 z-10 bg-[var(--bg-card)] border-[var(--border-color)]">
                        {hasGlobalPermission('Projects', 'Edit_Project') && (
                          <button onClick={(e) => { e.stopPropagation(); handleEditProject(project); }} className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-primary)]">Edit Project</button>
                        )}
                        {hasGlobalPermission('Projects', 'Delete_Project') && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }} className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500">Delete Project</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <h3
                  className="text-sm font-semibold mb-1 group-hover:text-blue-500 transition-colors truncate text-[var(--text-primary)]"
                  title={project.name}
                >
                  {project.name}
                </h3>

                <div className="flex items-center justify-between text-[10px] mb-4 text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {project.deadline ? new Date(project.deadline).toLocaleDateString() : "No Deadline"}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider border bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-secondary)]"
                  >
                    {project.status || "active"}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[var(--text-secondary)]">
                      Progress ({project.completed_tasks}/{project.total_tasks})
                    </span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {Number(project.progress).toFixed(2)}%
                    </span>
                  </div>
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--border-color)]"
                  >
                    <div
                      className={`h-full ${color} transition-all duration-1000 ease-out w-[var(--progress)]`}
                      style={progressStyle}
                    />
                  </div>
                </div>

                <div
                  className="mt-4 pt-4 border-t flex justify-between items-center border-[var(--border-color)]"
                >
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(project.member_ids?.length || 0, 3))].map((_, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm bg-[var(--bg-input)] border-2 border-[var(--bg-primary)] text-[var(--text-primary)]"
                      >
                        U
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => router.push(`/board?projectId=${project.id}`)}
                    className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchProjects} 
      />
      
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setProjectToEdit(null); }}
        onSuccess={fetchProjects}
        project={projectToEdit}
      />
    </div>
  );
}
