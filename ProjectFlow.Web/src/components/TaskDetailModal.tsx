"use client";

import React, { useState, useEffect } from "react";
import { 
  X, Loader2, CheckCircle2, MessageSquare, Plus, 
  Calendar, Tag, User, Trash2, Send, Paperclip,
  CheckSquare, ChevronRight, Clock, AlertCircle
} from "lucide-react";
import { Task, taskApi, TaskHistory } from "@/lib/api/tasks";
import { subtaskApi, Subtask } from "@/lib/api/subtasks";
import { commentApi, Comment } from "@/lib/api/comments";
import { userApi, User as UserType } from "@/lib/api/users";
import { format } from "date-fns";
import { useAuthStore } from "@/store/useAuthStore";

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onEdit?: (task: Task) => void;
}

export function TaskDetailModal({ taskId, isOpen, onClose, onUpdate, onEdit }: TaskDetailModalProps) {
  const { user } = useAuthStore();
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "history">("comments");
  
  const [newComment, setNewComment] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const [isPostingComment, setIsPostingComment] = useState(false);
  
  const [subtaskAttachments, setSubtaskAttachments] = useState<File[]>([]);
  
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [editingSubtaskAssignee, setEditingSubtaskAssignee] = useState("");
  const [isUpdatingSubtask, setIsUpdatingSubtask] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchData();
      fetchUsers();
    }
  }, [isOpen, taskId]);

  const fetchData = async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const [taskData, subtasksData, commentsData, historyData] = await Promise.all([
        taskApi.getById ? taskApi.getById(taskId) : Promise.resolve(null),
        subtaskApi.getByTask(taskId),
        commentApi.getByTask(taskId),
        taskApi.getHistory(taskId)
      ]);
      
      // Fallback if taskApi.getById is not implemented (fetching from myTasks and filtering)
      if (!taskData) {
        const myTasks = await taskApi.getMyTasks();
        const foundTask = myTasks.find(t => t.id === taskId);
        setTask(foundTask || null);
      } else {
        setTask(taskData);
      }
      
      setSubtasks(subtasksData);
      setComments(commentsData);
      setHistory(historyData || []);
    } catch (error) {
      console.error("Failed to fetch task details", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await userApi.getAll();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !taskId) return;
    
    setIsAddingSubtask(true);
    try {
      const formData = new FormData();
      formData.append("Title", newSubtaskTitle);
      if (newSubtaskAssignee) formData.append("AssigneeId", newSubtaskAssignee);
      
      subtaskAttachments.forEach(file => {
        formData.append("Attachments", file);
      });
      
      await subtaskApi.create(taskId, formData);
      setNewSubtaskTitle("");
      setNewSubtaskAssignee("");
      setSubtaskAttachments([]);
      const [updatedSubtasks, updatedHistory] = await Promise.all([
        subtaskApi.getByTask(taskId),
        taskApi.getHistory(taskId)
      ]);
      setSubtasks(updatedSubtasks);
      setHistory(updatedHistory);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to add subtask", error);
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    if (!taskId) return;
    try {
      const formData = new FormData();
      formData.append("Title", subtask.title);
      formData.append("IsCompleted", (!subtask.is_completed).toString());
      if (subtask.assignee_id) formData.append("AssigneeId", subtask.assignee_id);

      await subtaskApi.update(subtask.id, formData);
      const [updatedSubtasks, updatedHistory] = await Promise.all([
        subtaskApi.getByTask(taskId),
        taskApi.getHistory(taskId)
      ]);
      setSubtasks(updatedSubtasks);
      setHistory(updatedHistory);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to toggle subtask", error);
    }
  };

  const handleStartEditSubtask = (sub: Subtask) => {
    setEditingSubtaskId(sub.id);
    setEditingSubtaskTitle(sub.title);
    setEditingSubtaskAssignee(sub.assignee_id || "");
  };

  const handleSaveSubtaskEdit = async (e: React.FormEvent, subtaskId: string, isCompleted: boolean) => {
    e.preventDefault();
    if (!editingSubtaskTitle.trim() || !taskId) return;
    
    setIsUpdatingSubtask(true);
    try {
      const formData = new FormData();
      formData.append("Title", editingSubtaskTitle);
      formData.append("IsCompleted", isCompleted.toString());
      if (editingSubtaskAssignee) {
        formData.append("AssigneeId", editingSubtaskAssignee);
      } else {
        formData.append("AssigneeId", "");
      }
      
      await subtaskApi.update(subtaskId, formData);
      setEditingSubtaskId(null);
      const [updatedSubtasks, updatedHistory] = await Promise.all([
        subtaskApi.getByTask(taskId),
        taskApi.getHistory(taskId)
      ]);
      setSubtasks(updatedSubtasks);
      setHistory(updatedHistory);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to update subtask", error);
    } finally {
      setIsUpdatingSubtask(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!taskId) return;
    if (!window.confirm("Are you sure you want to delete this subtask?")) return;
    
    try {
      await subtaskApi.delete(subtaskId);
      const [updatedSubtasks, updatedHistory] = await Promise.all([
        subtaskApi.getByTask(taskId),
        taskApi.getHistory(taskId)
      ]);
      setSubtasks(updatedSubtasks);
      setHistory(updatedHistory);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to delete subtask", error);
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !taskId) return;
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    try {
      await taskApi.delete(taskId);
      onClose();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to delete task", error);
      alert("Failed to delete task");
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId) return;
    
    setIsPostingComment(true);
    try {
      const formData = new FormData();
      formData.append("Content", newComment);
      commentAttachments.forEach(file => {
        formData.append("Attachments", file);
      });
      
      await commentApi.create(taskId, formData);
      setNewComment("");
      setCommentAttachments([]);
      const updatedComments = await commentApi.getByTask(taskId);
      setComments(updatedComments);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to post comment", error);
    } finally {
      setIsPostingComment(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="bg-white dark:bg-[#1a1a2e] w-full max-w-4xl h-[85vh] flex flex-col relative overflow-hidden rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-white/10 animate-in zoom-in-95 duration-300">
        <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
          <button 
            onClick={onClose}
            title="Close modal"
            aria-label="Close modal"
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={40} />
          </div>
        ) : task ? (
          <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
            {/* Left Column: Task Info & Subtasks */}
            <div className="flex-[1.5] overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {task.project_name}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md ${
                        task.priority === 'urgent' || task.priority === 'high' 
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                          : 'bg-green-500/10 text-green-600 dark:text-green-400'
                      }`}>
                        {task.priority} Priority
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {task.title}
                    </h1>
                  </div>

                  <div className="flex gap-2">
                    {task && onEdit && (
                      <button 
                        onClick={() => {
                          onEdit(task);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        Edit Task
                      </button>
                    )}
                    {task && (
                      <button 
                        onClick={handleDeleteTask}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/10 hover:shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                      >
                        <Trash2 size={14} />
                        Delete Task
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags.map(tag => (
                      <span key={tag.id} className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-bold border border-blue-500/10">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Info Row */}
                <div className="flex flex-wrap gap-8 py-5 border-y border-gray-100 dark:border-white/10">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Assignee</span>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-[10px]">
                        {task.assignee_name?.substring(0, 2).toUpperCase() || "UN"}
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{task.assignee_name || "Unassigned"}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Due Date</span>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                      <Calendar size={14} className="text-gray-400" />
                      {task.deadline ? format(new Date(task.deadline), "MMM do, yyyy") : "No deadline"}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${task.system_status === 3 || task.status === 'completed' || task.status_name?.toLowerCase() === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="text-sm font-medium capitalize text-gray-800 dark:text-gray-200">{(task.status_name || task.status).replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {task.description || "No description provided."}
                  </p>
                </div>

                {/* Attachments */}
                {task.attachments_list && task.attachments_list.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Paperclip size={14} /> Attachments
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {task.attachments_list.map(att => (
                        <a 
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Paperclip size={14} className="text-muted-foreground group-hover:text-blue-500" />
                            <span className="text-xs font-medium truncate theme-text-primary">{att.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground opacity-50">{att.fileSize}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subtasks */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <CheckSquare size={14} /> Subtasks ({subtasks.filter(s => s.is_completed).length}/{subtasks.length})
                  </h3>
                  
                  <div className="space-y-3">
                    {subtasks.map(sub => {
                      const isCreator = user && sub.creator_id && sub.creator_id.toLowerCase() === user.id.toLowerCase();
                      return (
                        <div 
                          key={sub.id} 
                          className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                        >
                          <button 
                            onClick={() => handleToggleSubtask(sub)}
                            title={sub.is_completed ? "Mark as incomplete" : "Mark as completed"}
                            aria-label={sub.is_completed ? "Mark as incomplete" : "Mark as completed"}
                            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              sub.is_completed ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 hover:border-blue-500"
                            }`}
                          >
                            {sub.is_completed && <CheckCircle2 size={12} className="text-white" />}
                          </button>
                          
                          <div className="flex-1 space-y-1">
                            {editingSubtaskId === sub.id ? (
                              <form onSubmit={(e) => handleSaveSubtaskEdit(e, sub.id, sub.is_completed)} className="space-y-2">
                                <input 
                                  type="text"
                                  value={editingSubtaskTitle}
                                  onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                  className="w-full bg-white dark:bg-white/5 border border-blue-500/30 rounded-xl px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  autoFocus
                                  required
                                />
                                <div className="flex items-center justify-between gap-2">
                                  <select
                                    value={editingSubtaskAssignee}
                                    onChange={(e) => setEditingSubtaskAssignee(e.target.value)}
                                    className="text-xs bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-none outline-none rounded-lg py-1.5 px-2.5 font-semibold"
                                  >
                                    <option value="">Unassigned</option>
                                    {users.map(u => (
                                      <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                  </select>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditingSubtaskId(null)}
                                      className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={isUpdatingSubtask || !editingSubtaskTitle.trim()}
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg shadow-md shadow-blue-500/10 transition-all flex items-center gap-1"
                                    >
                                      {isUpdatingSubtask ? <Loader2 size={10} className="animate-spin" /> : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              </form>
                            ) : (
                              <div className="flex items-start justify-between gap-2 group/sub">
                                <div className="flex-1">
                                  <p 
                                    onClick={() => isCreator && handleStartEditSubtask(sub)}
                                    className={`text-sm font-medium ${sub.is_completed ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-200"} ${isCreator ? "cursor-pointer hover:text-blue-500 transition-colors" : ""}`}
                                    title={isCreator ? "Click to edit subtask" : undefined}
                                  >
                                    {sub.title}
                                  </p>
                                  <div className="flex items-center gap-2 flex-wrap mt-1">
                                    {sub.assignee_name && (
                                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <User size={10} /> {sub.assignee_name}
                                      </span>
                                    )}
                                    {sub.creator_name && (
                                      <span className="text-[10px] text-gray-400/80 flex items-center gap-1">
                                        <span className="font-bold text-[9px] uppercase opacity-75">By:</span> {sub.creator_name}
                                      </span>
                                    )}
                                    {sub.attachments && sub.attachments.length > 0 && sub.attachments.map(att => (
                                      <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-all">
                                        <Paperclip size={9} /> {att.name}
                                      </a>
                                    ))}
                                  </div>
                                </div>

                                {isCreator && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleStartEditSubtask(sub)}
                                      title="Edit subtask"
                                      className="p-1 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSubtask(sub.id)}
                                      title="Delete subtask"
                                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add subtask - same style as comment box */}
                    <form onSubmit={handleAddSubtask} className="mt-4">
                      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-400 dark:focus-within:border-blue-500/50 transition-all">
                        <input 
                          type="text" 
                          placeholder="Add a subtask..."
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          title="New subtask title"
                          aria-label="New subtask title"
                          className="w-full bg-transparent px-4 py-3.5 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-none border-none focus:ring-0"
                        />
                        {subtaskAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                            {subtaskAttachments.map((file, i) => (
                              <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                                <Paperclip size={9} /> {file.name}
                                <button 
                                  type="button" 
                                  onClick={() => setSubtaskAttachments(prev => prev.filter((_, idx) => idx !== i))} 
                                  title="Remove attachment"
                                  aria-label="Remove attachment"
                                  className="ml-0.5 hover:text-red-500 transition-colors"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between px-3 pb-3">
                          {/* Left: Assign + Attachment */}
                          <div className="flex items-center gap-1">
                            <select 
                              value={newSubtaskAssignee}
                              onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                              title="Assign subtask to user"
                              aria-label="Assign subtask to user"
                              className="bg-gray-100 dark:bg-white/10 border-none rounded-lg px-2.5 py-1.5 text-[11px] text-gray-600 dark:text-gray-300 outline-none cursor-pointer hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                            >
                              <option value="">Assign To</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                            <label 
                              htmlFor="subtask-file-upload"
                              title="Attach files to subtask"
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-blue-500 cursor-pointer transition-all"
                            >
                              <Paperclip size={16} />
                              <input 
                                id="subtask-file-upload"
                                type="file" 
                                multiple 
                                className="hidden" 
                                title="Upload subtask attachments"
                                placeholder="Upload subtask attachments"
                                onChange={(e) => setSubtaskAttachments(prev => [...prev, ...Array.from(e.target.files || [])])} 
                              />
                            </label>
                          </div>
                          {/* Right: Submit */}
                          <button 
                            type="submit"
                            disabled={isAddingSubtask || !newSubtaskTitle.trim()}
                            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-all disabled:opacity-30"
                          >
                            {isAddingSubtask ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Activity & Comments & History */}
            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#12122a] border-l border-gray-200 dark:border-white/10">
              <div className="flex border-b border-gray-200 dark:border-white/10">
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`flex-1 py-4 px-5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
                    activeTab === "comments"
                      ? "border-blue-500 text-blue-500 bg-white/5"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <MessageSquare size={14} />
                  Comments ({comments.length})
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 py-4 px-5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
                    activeTab === "history"
                      ? "border-blue-500 text-blue-500 bg-white/5"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Clock size={14} />
                  History
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                {activeTab === "comments" ? (
                  comments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-2">
                      <MessageSquare size={36} className="text-gray-400" />
                      <p className="text-xs text-gray-400">No comments yet.</p>
                    </div>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 dark:bg-gray-600 flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0">
                          {comment.user_name?.substring(0, 2).toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{comment.user_name}</span>
                            <span className="text-[10px] text-gray-400">{format(new Date(comment.created_at), "MMM d, h:mm a")}</span>
                          </div>
                          <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 p-3 rounded-2xl rounded-tl-none text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
                            <p>{comment.content}</p>
                            {comment.attachments && comment.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
                                {comment.attachments.map(att => (
                                  <a 
                                    key={att.id}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-[10px] font-medium text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-all"
                                  >
                                    <Paperclip size={10} />
                                    {att.name}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  /* History Tab */
                  history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-2">
                      <Clock size={36} className="text-gray-400" />
                      <p className="text-xs text-gray-400">No history logged yet.</p>
                    </div>
                  ) : (
                    <div className="relative border-l border-gray-200 dark:border-white/10 pl-4 ml-3 space-y-6 py-2">
                      {history.map(item => (
                        <div key={item.id} className="relative group animate-in fade-in duration-300">
                          {/* Indicator Dot */}
                          <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-white dark:bg-[#1a1a2e] transition-colors ${
                            item.action === "Create" ? "border-green-500 bg-green-500" :
                            item.action === "Assign" || item.action === "SubtaskAssign" ? "border-blue-500 bg-blue-500" :
                            item.action === "Move" ? "border-purple-500 bg-purple-500" :
                            item.action === "SubtaskCreate" ? "border-orange-500 bg-orange-500" :
                            "border-gray-400 bg-gray-400"
                          }`} />
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  item.action === "Create" ? "bg-green-500/10 text-green-500 border border-green-500/10" :
                                  item.action === "Assign" || item.action === "SubtaskAssign" ? "bg-blue-500/10 text-blue-500 border border-blue-500/10" :
                                  item.action === "Move" ? "bg-purple-500/10 text-purple-500 border border-purple-500/10" :
                                  item.action === "SubtaskCreate" ? "bg-orange-500/10 text-orange-500 border border-orange-500/10" :
                                  "bg-gray-500/10 text-gray-400 border border-gray-500/10"
                                }`}>
                                  {item.action === "SubtaskCreate" ? "Subtask" : 
                                   item.action === "SubtaskAssign" ? "Subtask Assign" :
                                   item.action === "SubtaskEdit" ? "Subtask Toggle" : item.action}
                                </span>
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{item.user_name}</span>
                              </div>
                              <span className="text-[9px] text-gray-400">{format(new Date(item.created_at), "MMM d, h:mm a")}</span>
                            </div>
                            <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                              {item.details}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Comment Input */}
              {activeTab === "comments" && (
                <div className="p-4 border-t border-gray-200 dark:border-white/10">
                  <form onSubmit={handlePostComment}>
                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-400 transition-all">
                      <textarea 
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        title="New comment content"
                        aria-label="New comment content"
                        className="w-full bg-transparent p-3.5 resize-none text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 outline-none border-none focus:ring-0 min-h-[60px]"
                        rows={2}
                      />
                      {commentAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                          {commentAttachments.map((file, i) => (
                            <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                              <Paperclip size={9} /> {file.name}
                              <button 
                                type="button" 
                                onClick={() => setCommentAttachments(prev => prev.filter((_, idx) => idx !== i))} 
                                title="Remove attachment"
                                aria-label="Remove attachment"
                                className="ml-0.5 hover:text-red-500 transition-colors"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between px-3 pb-3">
                        <label 
                          htmlFor="comment-file-upload"
                          title="Attach files to comment"
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-blue-500 cursor-pointer transition-all"
                        >
                          <Paperclip size={18} />
                          <input 
                            id="comment-file-upload"
                            type="file" 
                            multiple 
                            className="hidden" 
                            title="Upload comment attachments"
                            placeholder="Upload comment attachments"
                            onChange={(e) => setCommentAttachments(prev => [...prev, ...Array.from(e.target.files || [])])} 
                          />
                        </label>
                        <button 
                          type="submit"
                          disabled={isPostingComment || !newComment.trim()}
                          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-all disabled:opacity-30"
                        >
                          {isPostingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-red-500 space-y-2">
            <AlertCircle size={40} />
            <p className="font-bold">Task not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
