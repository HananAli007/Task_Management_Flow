"use client";

import React, { useState, useEffect } from "react";
import {
  MoreHorizontal, Plus, Search, Filter, Users,
  MessageSquare, Paperclip, Calendar, Loader2
} from "lucide-react";
import { projectApi, Project } from "@/lib/api/projects";
import { taskApi, Task } from "@/lib/api/tasks";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { EditTaskModal } from "@/components/EditTaskModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { SkeletonBoard } from "@/components/Skeleton";
import { usePermission } from "@/hooks/usePermission";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";

import { columnApi, BoardColumn } from "@/lib/api/columns";

// Remove hardcoded COLUMNS

export default function Board() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<string | number>("0");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const boardRef = React.useRef<HTMLDivElement>(null);

  // Dynamic Horizontal Scroll Helper
  useEffect(() => {
    if (!isDragging || !boardRef.current) return;

    let scrollInterval: any;
    const handleMouseMove = (e: MouseEvent) => {
      if (!boardRef.current) return;
      
      const { clientX } = e;
      const { left, right, width } = boardRef.current.getBoundingClientRect();
      const edgeSize = 150; // Larger zone for better detection
      
      clearInterval(scrollInterval);

      if (clientX > right - edgeSize) {
        // Dynamic speed: faster the closer to the edge
        const distanceIntoEdge = clientX - (right - edgeSize);
        const intensity = Math.min(distanceIntoEdge / edgeSize, 1);
        const speed = 5 + (intensity * 35); // Max speed 40px/frame

        scrollInterval = setInterval(() => {
          if (boardRef.current) boardRef.current.scrollLeft += speed;
        }, 16);
      } else if (clientX < left + edgeSize) {
        const distanceIntoEdge = (left + edgeSize) - clientX;
        const intensity = Math.min(distanceIntoEdge / edgeSize, 1);
        const speed = 5 + (intensity * 35);

        scrollInterval = setInterval(() => {
          if (boardRef.current) boardRef.current.scrollLeft -= speed;
        }, 16);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(scrollInterval);
    };
  }, [isDragging]);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [columns, setColumns] = useState<BoardColumn[]>([
    { id: 0, title: "To Do", order_index: 0, project_id: "" },
    { id: 1, title: "In Progress", order_index: 1, project_id: "" },
    { id: 2, title: "Review", order_index: 2, project_id: "" },
    { id: 3, title: "Done", order_index: 3, project_id: "" }
  ]);
  const [activeColumnMenu, setActiveColumnMenu] = useState<number | null>(null);
  const { hasProjectPermission, user } = usePermission();
  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      fetchTasks(activeProjectId);
      fetchColumns(activeProjectId);
    }
  }, [activeProjectId]);

  const fetchInitialData = async () => {
    try {
      const data = await projectApi.getAll();
      console.log("[Board] Projects fetched:", data);
      setProjects(data);
      if (data && data.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const queryProjectId = urlParams.get('projectId');
        
        if (queryProjectId && data.some(p => p.id === queryProjectId)) {
          setActiveProjectId(queryProjectId);
        } else {
          setActiveProjectId(data[0].id);
        }
      } else {
        console.warn("[Board] No projects found in API response");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      setIsLoading(false);
    }
  };

  const fetchTasks = async (projectId: string) => {
    setIsLoading(true);
    try {
      const data = await taskApi.getByProject(projectId);
      console.log("[Board] Fetched tasks:", data.map(t => ({ id: t.id.substring(0, 8), title: t.title, status: t.status })));
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchColumns = async (projectId: string) => {
    try {
      const data = await columnApi.getByProject(projectId);
      console.log("[Board] Fetched columns from API:", data);
      if (data && data.length > 0) {
        setColumns(data);
        console.log("[Board] Using DB columns with IDs:", data.map(c => ({ id: c.id, title: c.title })));
      } else {
        // Fallback to default structure if DB is empty
        const defaults = [
          { id: 0, title: "To Do", order_index: 0, project_id: projectId },
          { id: 1, title: "In Progress", order_index: 1, project_id: projectId },
          { id: 2, title: "Review", order_index: 2, project_id: projectId },
          { id: 3, title: "Done", order_index: 3, project_id: projectId }
        ];
        setColumns(defaults);
        console.log("[Board] Using DEFAULT columns with IDs: 0, 1, 2, 3");
      }
    } catch (error) {
      console.error("[Board] Failed to fetch columns:", error);
      console.log("[Board] Keeping current columns (default fallback)");
    }
  };

  const handleAddColumn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeProjectId || !newColumnTitle.trim()) return;
    
    setIsAddingColumn(true);
    try {
      await columnApi.create({
        project_id: activeProjectId,
        title: newColumnTitle.trim(),
        order_index: columns.length
      });
      setNewColumnTitle("");
      setIsAddColumnModalOpen(false);
      fetchColumns(activeProjectId);
    } catch (error: any) {
      console.error("Failed to add column:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.response?.data?.error?.message || error.message;
      alert(`Failed to add column: ${errorMsg}`);
    } finally {
      setIsAddingColumn(false);
    }
  };

  const handleRenameColumn = async (column: BoardColumn) => {
    const title = prompt("Enter new column title:", column.title);
    if (!title || title === column.title) return;

    try {
      await columnApi.update(column.id, { 
        title, 
        order_index: column.order_index 
      });
      if (activeProjectId) fetchColumns(activeProjectId);
    } catch (error) {
      console.error("Failed to rename column:", error);
    }
  };

  const handleDeleteColumn = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this column? All tasks in this column will need to be moved.")) return;

    try {
      await columnApi.delete(id);
      if (activeProjectId) fetchColumns(activeProjectId);
    } catch (error) {
      console.error("Failed to delete column:", error);
    }
  };

  // Normalize a status value to a column ID for display matching
  const statusToColumnId = (status: string): string => {
    const s = status?.toString().toLowerCase() || "";
    // Handle legacy text statuses
    if (s === "todo") return "0";
    if (s === "in_progress") return "1";
    if (s === "review") return "2";
    if (s === "completed" || s === "done") return "3";
    // For numeric or custom column IDs, return as-is
    return s;
  };

  // Group tasks by status for efficient lookup and immediate updates
  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    // Initialize groups for all columns
    columns.forEach(col => {
      grouped[col.id.toString()] = [];
    });

    // Distribute tasks to their respective columns
    tasks.forEach(task => {
      const rawStatus = task.status?.toString() || "";
      const normalizedStatus = statusToColumnId(rawStatus);
      
      // Try to match the column ID
      if (grouped[normalizedStatus]) {
        grouped[normalizedStatus].push(task);
      } else if (grouped[rawStatus]) {
        grouped[rawStatus].push(task);
      }
    });
    
    return grouped;
  }, [tasks, columns]);

  const getTasksByStatus = (columnId: string | number) => {
    return tasksByStatus[columnId.toString()] || [];
  };

  const selectedTask = tasks.find(t => t.id?.toString() === selectedTaskId?.toString());

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleEditTask = (task: Task) => {
    setActiveDropdown(null);
    setTaskToEdit(task);
    setIsEditModalOpen(true);
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      setActiveDropdown(null);
      return;
    }
    
    try {
      setActiveDropdown(null);
      await taskApi.delete(id);
      if (activeProjectId) fetchTasks(activeProjectId);
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Failed to delete task");
    }
  };

  const onDragStart = () => {
    setIsDragging(true);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      setIsDragging(false);
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      setIsDragging(false);
      return;
    }

    const newColumnId = destination.droppableId.toString();
    const movedTask = tasks.find(t => t.id.toString() === draggableId.toString());
    const oldStatus = movedTask?.status || "";

    // 1. SYNC OPTIMISTIC UPDATE (Immediate)
    setTasks(prevTasks => 
      prevTasks.map(t => t.id.toString() === draggableId.toString() ? { ...t, status: newColumnId } : t)
    );

    // 2. Clear dragging state AFTER the task move is registered
    setIsDragging(false);

    // 3. BACKGROUND API CALL
    (async () => {
      try {
        const response = await taskApi.updateStatus(draggableId, newColumnId);
        if (!response.success) throw new Error();
      } catch (error) {
        // Revert on failure
        setTasks(prevTasks => 
          prevTasks.map(t => t.id.toString() === draggableId.toString() ? { ...t, status: oldStatus } : t)
        );
      }
    })();
  };

  // Initial load only - sub-loading handled inside the board
  if (isLoading && projects.length === 0) {
    return (
      <div className="h-full flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-white/5 rounded-lg animate-pulse" />
            <div className="h-4 w-40 bg-white/5 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-3">
             <div className="h-10 w-48 bg-white/5 rounded-xl animate-pulse" />
             <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
          </div>
        </div>
        <SkeletonBoard />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6" onClick={() => setActiveDropdown(null)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Development Board
          </h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-[var(--text-secondary)]">
            <select
              aria-label="Select active project"
              className="bg-[var(--bg-input)] text-blue-500 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border border-blue-500/20 focus:outline-none"
              value={activeProjectId || ""}
              onChange={(e) => setActiveProjectId(e.target.value)}
            >
              {projects.length === 0 && <option value="">No Projects Available</option>}
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users size={14} /> {activeProject?.member_ids?.length || 0} members
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size={18}
            />
            <input
              type="text"
              placeholder="Search tasks..."
              className="input-field pl-10 pr-4 py-2 text-sm w-64 rounded-xl"
            />
          </div>
            <button className="btn-secondary flex items-center gap-2 text-sm">
            <Filter size={18} />
            Filter
          </button>
          
          {(isSuperAdmin || (activeProjectId && hasProjectPermission(activeProjectId, 'Projects', 'Update_Project'))) && (
            <button 
              onClick={() => setIsAddColumnModalOpen(true)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all flex items-center gap-2 text-sm font-medium theme-text-secondary"
            >
              <Plus size={18} />
              Add Column
            </button>
          )}

          {activeProjectId && hasProjectPermission(activeProjectId, 'Tasks', 'Create_Task') && (
            <button 
              onClick={() => {
                // Find first column if exists
                const firstCol = columns.length > 0 ? columns[0].id.toString() : "0";
                setModalStatus(firstCol);
                setIsModalOpen(true);
              }} 
              className="btn-primary flex items-center gap-2 text-sm shadow-lg shadow-blue-500/20"
            >
              <Plus size={18} />
              Add Task
            </button>
          )}
        </div>
      </div>

      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div 
          id="board-container"
          ref={boardRef}
          className={`flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-200px)] custom-scrollbar relative px-8 flex-1 w-full overflow-y-hidden ${isDragging ? 'scroll-auto' : 'scroll-smooth'}`}
        >
          <div className="flex gap-6 min-w-max h-full">
          {isLoading && projects.length > 0 ? (
            <SkeletonBoard />
          ) : (
            <>
              {columns.map((column) => {
                const columnTasks = getTasksByStatus(column.id);

                return (
                  <div key={column.id} className="w-80 flex-shrink-0 flex flex-col max-h-full">
                    <div className="flex items-center justify-between mb-4 px-3 py-2 bg-gray-500/5 rounded-xl border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <h3
                          className="font-bold uppercase tracking-widest text-[11px] text-[var(--text-secondary)]"
                        >
                          {column.title}
                        </h3>
                        <div
                          className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)]"
                        >
                          {columnTasks.length}
                        </div>
                      </div>
                      
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveColumnMenu(activeColumnMenu === column.id ? null : column.id);
                          }}
                          className="transition-colors p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md text-[var(--text-muted)]" 
                          title="Column options"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                        
                        {activeColumnMenu === column.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a1c2e] border border-black/10 dark:border-white/10 shadow-2xl z-50 overflow-hidden rounded-lg animate-in fade-in zoom-in-95 duration-200">
                            <button 
                              onClick={() => { handleRenameColumn(column); setActiveColumnMenu(null); }}
                              className="w-full text-left px-4 py-3 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium border-b border-black/5 dark:border-white/5"
                            >
                              Rename Stage
                            </button>
                            <button 
                              onClick={() => { handleDeleteColumn(column.id); setActiveColumnMenu(null); }}
                              className="w-full text-left px-4 py-3 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-red-500 font-medium"
                            >
                              Delete Stage
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <Droppable droppableId={column.id.toString()} type="TASK">
                      {(provided, snapshot) => (
                        <div 
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`flex-1 space-y-3 min-h-[500px] pb-20 rounded-xl transition-colors duration-200 ${
                            snapshot.isDraggingOver ? 'bg-blue-500/10 ring-2 ring-blue-500/20' : ''
                          }`}
                        >
                          {columnTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => {
                                const draggableStyle = provided.draggableProps.style;
                                return (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white dark:bg-[#1e213a] p-4 rounded-xl shadow-sm border border-black/5 dark:border-white/5 group relative cursor-pointer border-l-[3.5px] pointer-events-auto cursor-grab ${
                                      snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-500/30 z-[100] transition-none' : 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200'
                                    } ${
                                      task.priority.toLowerCase() === "urgent" ? "border-l-red-500" :
                                      task.priority.toLowerCase() === "high" ? "border-l-orange-500" :
                                      task.priority.toLowerCase() === "medium" ? "border-l-blue-500" : "border-l-slate-400"
                                    }`}
                                    style={draggableStyle}
                                    onClick={() => {
                                      if (!snapshot.isDragging) {
                                        setSelectedTaskId(task.id);
                                        setIsDetailModalOpen(true);
                                      }
                                    }}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7e8194] dark:text-[#a0a3bd]">
                                        {task.project_name}
                                      </span>
                                    </div>

                                    <h4 className="text-[15px] font-bold mb-4 leading-tight theme-text-primary group-hover:text-blue-500 transition-colors">
                                      {task.title}
                                    </h4>

                                    <div className="flex items-center justify-between mt-auto">
                                      <div className="flex items-center gap-4 text-[11px] text-[#7e8194] dark:text-[#a0a3bd]">
                                        {task.comment_count > 0 && (
                                          <div className="flex items-center gap-1.5">
                                            <MessageSquare size={13} className="text-gray-400" />
                                            {task.comment_count}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-1.5 font-medium">
                                          <Calendar size={13} className="text-gray-400" />
                                          {task.deadline ? new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "No Due"}
                                        </div>
                                      </div>
                                      
                                      {task.assignee_name && (
                                        <div
                                          className="w-6 h-6 rounded-full bg-[#3b82f6] flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-[#1e213a]"
                                          title={task.assignee_name}
                                        >
                                          {task.assignee_name.substring(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {activeProjectId && hasProjectPermission(activeProjectId, 'Tasks', 'Create_Task') && (
                            <button
                              onClick={() => {
                                setModalStatus(column.id.toString());
                                setIsModalOpen(true);
                              }}
                              className="w-full py-3 border border-dashed rounded-xl transition-all text-xs font-semibold flex items-center justify-center gap-2 hover:border-blue-500/40 hover:text-blue-500 hover:bg-blue-500/5 group text-gray-400 border-gray-200 dark:border-gray-800"
                            >
                              <Plus size={16} />
                              Add Card
                            </button>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            
            {(isSuperAdmin || (activeProjectId && hasProjectPermission(activeProjectId, 'Projects', 'Update_Project'))) && (
              <div className="w-80 flex-shrink-0 flex flex-col">
                <button
                  onClick={() => setIsAddColumnModalOpen(true)}
                  className="w-full h-[120px] border border-dashed rounded-2xl transition-all flex flex-col items-center justify-center gap-3 hover:border-blue-500/40 hover:bg-blue-500/5 group border-[var(--border-color)] text-[var(--text-muted)]"
                >
                  <div className="p-2.5 rounded-full bg-white/5 group-hover:bg-blue-500/20 transition-colors">
                    <Plus size={20} className="group-hover:text-blue-400 group-hover:scale-110 transition-all" />
                  </div>
                  <span className="text-xs font-medium group-hover:text-blue-400">Add New Stage</span>
                </button>
              </div>
            )}
          </>
        )}
          </div>
        </div>
      </DragDropContext>
      
      <style jsx global>{`
        #board-container::-webkit-scrollbar {
          height: 12px;
          display: block !important;
        }
        #board-container::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 20px;
          margin: 0 20px;
        }
        #board-container::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 20px;
          border: 3px solid transparent;
          background-clip: content-box;
          min-width: 100px;
        }
        #board-container::-webkit-scrollbar-thumb:hover {
          background: #2563eb;
          background-clip: content-box;
        }
        /* Ensure the board container doesn't get pushed down by parent padding */
        main {
          display: flex;
          flex-direction: column;
        }
      `}</style>

      {isModalOpen && (
        <CreateTaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => activeProjectId && fetchTasks(activeProjectId)}
          defaultStatus={modalStatus?.toString() || "0"}
          defaultProjectId={activeProjectId || undefined}
        />
      )}

      {isDetailModalOpen && (
        <TaskDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          taskId={selectedTaskId}
          onUpdate={() => activeProjectId && fetchTasks(activeProjectId)}
        />
      )}

      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setTaskToEdit(null); }}
        onSuccess={() => { if (activeProjectId) fetchTasks(activeProjectId); }}
        task={taskToEdit}
      />

      {/* Add Column Modal */}
      {isAddColumnModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm" onClick={() => setIsAddColumnModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#1a1c2e] w-full max-w-md p-8 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold mb-6">Add New Stage</h3>
            <form onSubmit={handleAddColumn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted ml-1">Stage Title</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="e.g. Quality Assurance"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddColumnModalOpen(false)} 
                  className="px-6 py-2.5 text-sm font-bold text-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isAddingColumn || !newColumnTitle.trim()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isAddingColumn && <Loader2 size={16} className="animate-spin" />}
                  Add Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
