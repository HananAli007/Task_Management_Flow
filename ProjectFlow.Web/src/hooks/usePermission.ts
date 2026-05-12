import { useAuthStore } from "@/store/useAuthStore";

export const usePermission = () => {
  const { user, permissions } = useAuthStore();
  const isSuperAdmin = user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "superadmin";

  const hasGlobalPermission = (screenName: string, objectName: string) => {
    if (isSuperAdmin) return true;
    if (!permissions) return false;
    return permissions.global_permissions.some(
      (p) =>
        p.screen_name.toLowerCase() === screenName.toLowerCase() &&
        p.object_name.toLowerCase() === objectName.toLowerCase() &&
        p.allowed
    );
  };

  const hasProjectPermission = (projectId: string, screenName: string, objectName: string) => {
    if (isSuperAdmin) return true;
    if (!permissions || !permissions.project_permissions[projectId]) return false;
    return permissions.project_permissions[projectId].some(
      (p) =>
        p.screen_name.toLowerCase() === screenName.toLowerCase() &&
        p.object_name.toLowerCase() === objectName.toLowerCase() &&
        p.allowed
    );
  };

  const canViewScreen = (screenName: string) => {
    if (isSuperAdmin) return true;
    if (!permissions) return false;
    // If user has any allowed permission on this screen, they can view it
    return permissions.global_permissions.some(
      (p) => p.screen_name.toLowerCase() === screenName.toLowerCase() && p.allowed
    );
  };

  return { hasGlobalPermission, hasProjectPermission, canViewScreen, user };
};
