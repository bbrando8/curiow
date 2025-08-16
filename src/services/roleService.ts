import { UserRole, UserPermissions } from '../types.js';

/**
 * Restituisce i permessi di default per ogni ruolo
 */
export const getDefaultPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case UserRole.ADMIN:
      return {
        canCreateGems: true,
        canEditGems: true,
        canDeleteGems: true,
        canManageUsers: true,
        canModerateContent: true,
        canViewDashboard: true,
        canManageChannels: true,
      };

    case UserRole.MODERATOR:
      return {
        canCreateGems: true,
        canEditGems: true,
        canDeleteGems: false,
        canManageUsers: false,
        canModerateContent: true,
        canViewDashboard: true,
        canManageChannels: true,
      };

    case UserRole.BETATESTER:
      return {
        canCreateGems: false,
        canEditGems: false,
        canDeleteGems: false,
        canManageUsers: false,
        canModerateContent: false,
        canViewDashboard: false,
        canManageChannels: false,
      };

    case UserRole.USER:
    default:
      return {
        canCreateGems: false,
        canEditGems: false,
        canDeleteGems: false,
        canManageUsers: false,
        canModerateContent: false,
        canViewDashboard: false,
        canManageChannels: false,
      };
  }
};

/**
 * Verifica se un utente ha un permesso specifico
 */
export const hasPermission = (
  userPermissions: UserPermissions,
  permission: keyof UserPermissions
): boolean => {
  return userPermissions[permission] === true;
};

/**
 * Verifica se un utente ha almeno uno dei ruoli specificati
 */
export const hasRole = (userRole: UserRole, allowedRoles: UserRole[]): boolean => {
  return allowedRoles.includes(userRole);
};

/**
 * Verifica se un utente è admin
 */
export const isAdmin = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN;
};

/**
 * Verifica se un utente è moderatore o admin
 */
export const isModerator = (userRole: UserRole): boolean => {
  return userRole === UserRole.MODERATOR || userRole === UserRole.ADMIN;
};

/**
 * Hook personalizzato per verificare i permessi dell'utente corrente
 */
export const useUserPermissions = (user: { role: UserRole; permissions: UserPermissions } | null) => {
  if (!user) {
    return {
      canCreateGems: false,
      canEditGems: false,
      canDeleteGems: false,
      canManageUsers: false,
      canModerateContent: false,
      canViewDashboard: false,
      canManageChannels: false,
      isAdmin: false,
      isModerator: false,
    };
  }

  return {
    ...user.permissions,
    isAdmin: isAdmin(user.role),
    isModerator: isModerator(user.role),
  };
};
