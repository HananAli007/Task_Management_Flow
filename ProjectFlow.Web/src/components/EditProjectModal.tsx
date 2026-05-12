import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { projectApi, Project } from "@/lib/api/projects";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  project: Project | null;
}

export function EditProjectModal({ isOpen, onClose, onSuccess, project }: EditProjectModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: "medium",
    status: "active",
    deadline: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (project && isOpen) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        priority: project.priority?.toLowerCase() || "medium",
        status: project.status?.toLowerCase() || "active",
        deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : "",
      });
      setError("");
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!formData.name) {
        setError("Project name is required");
        return;
      }
      
      const payload: any = { ...formData };
      if (!payload.deadline) {
        delete payload.deadline;
      } else {
        const selectedDate = new Date(payload.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          setError("Deadline cannot be in the past");
          setIsSubmitting(false);
          return;
        }
        payload.deadline = selectedDate.toISOString();
      }

      await projectApi.update(project.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to update project", err);
      setError(err.response?.data?.error?.message || "Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div 
        className="bg-white dark:bg-[#1a1c2e] w-full max-w-lg relative overflow-hidden rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-black/5 dark:border-white/10 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
      >
        <div className="p-8 pb-0 flex justify-between items-center relative">
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Edit Project
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm font-medium border border-red-500/20">
              {error}
            </div>
          )}

          <form id="edit-project-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold ml-1" style={{ color: "var(--text-secondary)" }}>
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field w-full"
                placeholder="e.g. Website Redesign"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold ml-1" style={{ color: "var(--text-secondary)" }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field w-full resize-none"
                rows={3}
                placeholder="Briefly describe the project goals..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold ml-1" style={{ color: "var(--text-secondary)" }}>
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold ml-1" style={{ color: "var(--text-secondary)" }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold ml-1" style={{ color: "var(--text-secondary)" }}>
                Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="input-field w-full"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </form>
        </div>

        <div className="p-8 pt-4 flex justify-end gap-3 border-t border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
          <button 
            type="button" 
            onClick={onClose}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="edit-project-form"
            className="btn-primary flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
