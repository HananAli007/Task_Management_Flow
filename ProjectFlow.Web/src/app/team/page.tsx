"use client";

import React, { useState, useEffect } from "react";
import { Users, Mail, Phone, MoreHorizontal, Plus, Search, Loader2, X, MessageCircle } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { useAuthStore } from "@/store/useAuthStore";
import { userApi, User, Group } from "@/lib/api/users";
import { usePermission } from "@/hooks/usePermission";
import { useSignalRContext } from "@/context/SignalRContext";
import { useChatStore } from "@/store/useChatStore";

export default function TeamPage() {
  const [team, setTeam] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRoleMenu, setActiveRoleMenu] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role?.toLowerCase() === 'superadmin';
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isPrivileged = isSuperAdmin || isAdmin;

  const { hasGlobalPermission } = usePermission();
  const { onlineUsers, unreadCounts } = useSignalRContext();
  const { setActiveChatUser } = useChatStore();
  
  // Modals & Messaging state
  const [modalType, setModalType] = useState<'add' | 'message' | 'profile' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchTeam();
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const data = await userApi.getGroups();
      setGroups(data);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  };

  const fetchTeam = async () => {
    try {
      const data = await userApi.getAll();
      setTeam(data);
    } catch (error) {
      console.error("Failed to fetch team:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetGroup = async (memberId: string, groupId: number) => {
    if (!hasGlobalPermission('Team', 'Change_Role')) {
      alert("You don't have permission to change roles.");
      return;
    }
    try {
      await userApi.updateGroup(memberId, groupId);
      const groupDescription = groups.find(g => g.id === groupId)?.description || "Unknown";
      setTeam(team.map(m => m.id === memberId ? { ...m, role: groupDescription, group_id: groupId } : m));
    } catch (error) {
      console.error("Failed to update group:", error);
      alert("Failed to update group. Please try again.");
    } finally {
      setActiveDropdown(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Are you sure you want to remove this member? This action will mark them as deleted.")) {
      return;
    }

    try {
      const result = await userApi.delete(memberId);
      if (result.success) {
        setTeam(team.map(m => m.id === memberId ? { ...m, is_deleted: true } : m));
        alert("User removed successfully.");
      }
    } catch (error: any) {
      console.error("Failed to remove member:", error);
      alert(error.response?.data?.message || "Failed to remove member. Please try again.");
    } finally {
      setActiveDropdown(null);
    }
  };

  const handleRestoreMember = async (memberId: string) => {
    try {
      const result = await userApi.restore(memberId);
      if (result.success) {
        setTeam(team.map(m => m.id === memberId ? { ...m, is_deleted: false } : m));
        alert("User restored successfully.");
      }
    } catch (error: any) {
      console.error("Failed to restore member:", error);
      alert(error.response?.data?.message || "Failed to restore member. Please try again.");
    } finally {
      setActiveDropdown(null);
    }
  };

  const filteredTeam = team.filter(member => {
    // 1. Hide current user from their own team list
    if (member.id === user?.id) return false;

    // 2. ONLY SuperAdmin can see deleted users
    if (member.is_deleted && !isSuperAdmin) return false;

    // 3. Search logic
    const search = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search) ||
      member.role.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  const handleOpenModal = (type: 'add' | 'message' | 'profile', user?: User) => {
    if (type === 'message' && user) {
      setActiveChatUser(user);
      setActiveDropdown(null);
      return;
    }
    setModalType(type);
    if (user) setSelectedUser(user);
    setActiveDropdown(null);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" onClick={() => { setActiveDropdown(null); setActiveRoleMenu(null); }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Our Team
          </h1>
          <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage team members, roles, and collaboration settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2"
              size={18}
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 pr-4 py-2 text-sm w-64 rounded-xl"
            />
          </div>
          {hasGlobalPermission('Team', 'Invite_Member') && (
            <button onClick={() => handleOpenModal('add')} className="btn-primary flex items-center gap-2">
              <Plus size={20} />
              Add Member
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTeam.map((member) => (
          <div 
            key={member.id} 
            className={`glass-card glass-card-hover p-4 relative group transition-all ${member.is_deleted ? 'opacity-60 grayscale-[0.5]' : ''}`}
            style={{ zIndex: activeDropdown === member.id ? 50 : 1 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 relative">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  member.name.substring(0, 2).toUpperCase()
                )}
                {!member.is_deleted && (
                  <div 
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 transition-colors duration-500 ${onlineUsers.has(member.id.toLowerCase()) ? 'bg-green-500' : 'bg-slate-400'}`} 
                    style={{ borderColor: "var(--bg-card)" }} 
                  />
                )}
                {(unreadCounts[member.id.toLowerCase()] || 0) > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 shadow-lg animate-bounce" style={{ borderColor: "var(--bg-card)" }}>
                    {unreadCounts[member.id.toLowerCase()] > 99 ? '99+' : unreadCounts[member.id.toLowerCase()]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {member.name}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-blue-500 capitalize font-medium">{member.role}</p>
                  {member.is_deleted && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase">Deleted</span>
                  )}
                </div>
              </div>
              
              {(() => {
                // Roles check: Only SuperAdmin/Admin can change roles or remove members
                const canChangeRole = isPrivileged && hasGlobalPermission('Team', 'Change_Role');
                const canRemove = isPrivileged && hasGlobalPermission('Team', 'Remove_Member');

                if (!canChangeRole && !canRemove) return null;

                return (
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === member.id ? null : member.id);
                      }}
                      className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all" 
                      style={{ color: "var(--text-muted)" }}
                      title="Member options"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {activeDropdown === member.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border shadow-lg py-1 z-[100] animate-in fade-in zoom-in duration-200" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                        {canChangeRole && (
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveRoleMenu(activeRoleMenu === member.id ? null : member.id); }}
                              className="w-full text-left px-3 py-2.5 text-xs hover:bg-blue-500/10 hover:text-blue-500 transition-colors flex items-center justify-between"
                              style={{ color: "var(--text-primary)" }}
                            >
                              <span className="flex items-center gap-2">
                                <Users size={14} /> Change Group
                              </span>
                              <span>›</span>
                            </button>
                            
                            {activeRoleMenu === member.id && (
                              <div className="mx-2 mb-2 rounded-lg border overflow-hidden bg-black/5 dark:bg-white/5" style={{ borderColor: "var(--border-color)" }}>
                                {Array.isArray(groups) && groups
                                  .filter(g => g.description.toLowerCase() !== 'super admin')
                                  .map(group => (
                                  <button
                                    key={group.id}
                                    onClick={(e) => { e.stopPropagation(); handleSetGroup(member.id, group.id); setActiveRoleMenu(null); }}
                                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-500 hover:text-white transition-all capitalize"
                                    style={{ color: member.group_id === group.id ? "var(--color-blue-500)" : "var(--text-secondary)" }}
                                  >
                                    {group.description}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {canRemove && (
                          <>
                            <div className="border-t my-1" style={{ borderColor: "var(--border-color)" }} />
                            
                            {!member.is_deleted ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.id); }} 
                                className="w-full text-left px-3 py-2.5 text-xs hover:bg-red-500 hover:text-white transition-all text-red-500 flex items-center gap-2"
                              >
                                <X size={14} /> Remove Member
                              </button>
                            ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRestoreMember(member.id); }} 
                                className="w-full text-left px-3 py-2.5 text-xs hover:bg-green-600 hover:text-white transition-all text-green-500 flex items-center gap-2"
                              >
                                <Plus size={14} /> Restore Member
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="mt-3 space-y-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
              <div className="flex items-center gap-2 truncate">
                <Mail size={12} className="flex-shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={12} className="flex-shrink-0" />
                <span>{member.phone || "N/A"}</span>
              </div>
            </div>

            <div className="mt-3 flex gap-2 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
              <button
                onClick={() => handleOpenModal('message', member)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all border flex justify-center items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  background: "var(--bg-input)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
              >
                <MessageCircle size={12} /> Message
              </button>
              <button 
                onClick={() => handleOpenModal('profile', member)}
                className="flex-1 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-[11px] font-semibold text-blue-500 transition-all"
              >
                Profile
              </button>
            </div>
          </div>
        ))}
        {filteredTeam.length === 0 && (
          <div className="col-span-full py-20 text-center" style={{ color: "var(--text-muted)" }}>
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No team members found.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div 
            className="glass-card w-full max-w-md p-6 relative"
            style={{ backgroundColor: "var(--bg-primary)" }}
          >
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>

            {modalType === 'add' && (
              <>
                <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Add Team Member</h2>
                <div className="space-y-4">
                  <input type="email" placeholder="Email Address" className="input-field w-full" />
                  <select className="input-field w-full">
                    <option value="member">Team Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="btn-primary w-full mt-4" onClick={closeModal}>Send Invite</button>
                </div>
              </>
            )}

            {modalType === 'profile' && selectedUser && (
              <div className="text-center pt-4">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-blue-500/20">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    selectedUser.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{selectedUser.name}</h2>
                <p className="text-blue-500 font-medium mb-6 capitalize">{selectedUser.role}</p>
                
                <div className="space-y-3 text-left border-t pt-6" style={{ borderColor: "var(--border-color)" }}>
                  <div className="flex items-center gap-3">
                    <Mail size={16} style={{ color: "var(--text-muted)" }} />
                    <span style={{ color: "var(--text-primary)" }}>{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} style={{ color: "var(--text-muted)" }} />
                    <span style={{ color: "var(--text-primary)" }}>{selectedUser.phone || "Not provided"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users size={16} style={{ color: "var(--text-muted)" }} />
                    <span style={{ color: "var(--text-primary)" }}>Joined {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button className="btn-secondary w-full mt-8" onClick={closeModal}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
