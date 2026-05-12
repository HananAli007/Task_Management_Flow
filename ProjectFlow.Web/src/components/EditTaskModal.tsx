import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { taskApi, Task } from "@/lib/api/tasks";
import { projectApi, Project } from "@/lib/api/projects";
import { tagApi, Tag } from "@/lib/api/tags";
import { Plus, Tag as TagIcon } from "lucide-react";

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: Task | null;
}

const PREDEFINED_TAGS = [
  "Feature", "Bug", "Documentation", "High Priority", "Backend", "Frontend", "UI/UX", "Research", "Urgent"
];

export function EditTaskModal({ isOpen, onClose, onSuccess, task }: EditTaskModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    projectId: "",
    status: "todo",
    deadline: "",
    tags: [] as string[],
  });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority?.toLowerCase() || "medium",
        projectId: task.project_id || "",
        status: task.status?.toLowerCase() || "todo",
        deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : "",
        tags: task.tags?.map(t => t.name) || [],
      });
      fetchProjects();
      fetchTags();
    }
  }, [isOpen, task]);

  const fetchTags = async () => {
    try {
      const data = await tagApi.getAll();
      setAvailableTags(data);
    } catch (err) {
      console.error("Failed to fetch tags", err);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await projectApi.getAll();
      setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!formData.title) {
        setError("Task title is required");
        return;
      }
      if (!formData.projectId) {
        setError("Please select a project");
        return;
      }

      const submitData = new FormData();
      submitData.append("Title", formData.title);
      if (formData.description) submitData.append("Description", formData.description);
      submitData.append("Priority", formData.priority);
      submitData.append("ProjectId", formData.projectId);
      submitData.append("Status", formData.status);
      if (formData.deadline) submitData.append("Deadline", new Date(formData.deadline).toISOString());
      
      formData.tags.forEach(t => submitData.append("TagNames", t));

      await taskApi.update(task.id, submitData);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to update task", err);
      setError(err.response?.data?.error?.message || "Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div 
        className="bg-white dark:bg-[#1a1c2e] w-full max-w-lg relative overflow-hidden rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-black/5 dark:border-white/10 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
      >
        <div className="p-8 pb-0 flex justify-between items-center relative">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Edit Task
          </h2>
          <button 
            onClick={onClose}
            title="Close modal"
            aria-label="Close modal"
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[var(--text-muted)]"
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

          <form id="edit-task-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-project-select" className="text-sm font-bold ml-1 text-[var(--text-secondary)]">
                Project *
              </label>
              <select
                id="edit-project-select"
                title="Select project"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="input-field w-full"
                required
              >
                {projects.length === 0 && <option value="">No projects available</option>}
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-task-title" className="text-sm font-bold ml-1 text-[var(--text-secondary)]">
                Task Title *
              </label>
              <input
                id="edit-task-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-field w-full"
                placeholder="e.g. Design Landing Page"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-task-description" className="text-sm font-bold ml-1 text-[var(--text-secondary)]">
                Description
              </label>
              <textarea
                id="edit-task-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field w-full resize-none"
                rows={3}
                placeholder="Briefly describe what needs to be done..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="edit-task-priority" className="text-sm font-bold ml-1 text-[var(--text-secondary)]">
                  Priority
                </label>
                <select
                  id="edit-task-priority"
                  title="Select priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="edit-task-status" className="text-sm font-bold ml-1 text-[var(--text-secondary)]">
                  Status
                </label>
                <select
                  id="edit-task-status"
                  title="Select status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="0">To Do</option>
                  <option value="1">In Progress</option>
                  <option value="2">In Review</option>
                  <option value="3">Completed</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-task-deadline" className="text-sm font-bold ml-1 text-[var(--text-secondary)]">
                Deadline
              </label>
              <input
                id="edit-task-deadline"
                title="Select deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="input-field w-full"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold ml-1 flex items-center gap-2 text-[var(--text-secondary)]">
                <TagIcon size={16} /> Tags
              </label>
              
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-bold border border-blue-500/20">
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))} 
                      title={`Remove ${tag} tag`}
                      aria-label={`Remove ${tag} tag`}
                      className="hover:text-blue-400"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newTagInput.trim() && !formData.tags.includes(newTagInput.trim())) {
                        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTagInput.trim()] }));
                        setNewTagInput("");
                      }
                    }
                  }}
                  className="input-field flex-1"
                  placeholder="Add a tag and press Enter..."
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newTagInput.trim() && !formData.tags.includes(newTagInput.trim())) {
                      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTagInput.trim()] }));
                      setNewTagInput("");
                    }
                  }}
                  title="Add tag"
                  aria-label="Add tag"
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider ml-1 text-[var(--text-muted)]">
                  Predefined Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_TAGS.filter(t => !formData.tags.includes(t)).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))}
                      className="px-2 py-1 bg-blue-500/5 text-blue-400/70 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg text-[11px] transition-all border border-blue-500/10 font-medium"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {availableTags.length > 0 && availableTags.some(t => !PREDEFINED_TAGS.includes(t.name) && !formData.tags.includes(t.name)) && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider ml-1 text-[var(--text-muted)]">
                    Other Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.filter(t => !PREDEFINED_TAGS.includes(t.name) && !formData.tags.includes(t.name)).map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, tags: [...prev.tags, tag.name] }))}
                        className="px-2 py-1 bg-gray-500/5 text-gray-400/70 hover:bg-gray-500/10 hover:text-gray-400 rounded-lg text-[11px] transition-all border border-gray-500/10 font-medium"
                      >
                        + {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
            form="edit-task-form"
            className="btn-primary flex items-center gap-2"
            disabled={isSubmitting || projects.length === 0}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
