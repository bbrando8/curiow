import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserRole } from '../types';
import { getDefaultPermissions } from '../services/roleService';

/**
 * Funzione di utilità per promuovere un utente ad admin
 * Utilizzare solo in fase di sviluppo o tramite console admin
 */
export const promoteUserToAdmin = async (uid: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const adminPermissions = getDefaultPermissions(UserRole.ADMIN);

    await updateDoc(userDocRef, {
      role: UserRole.ADMIN,
      permissions: adminPermissions,
      updatedAt: new Date()
    });

    console.log(`User ${uid} promoted to admin successfully`);
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    throw error;
  }
};

/**
 * Funzione di utilità per promuovere un utente a moderatore
 */
export const promoteUserToModerator = async (uid: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const moderatorPermissions = getDefaultPermissions(UserRole.MODERATOR);

    await updateDoc(userDocRef, {
      role: UserRole.MODERATOR,
      permissions: moderatorPermissions,
      updatedAt: new Date()
    });

    console.log(`User ${uid} promoted to moderator successfully`);
  } catch (error) {
    console.error('Error promoting user to moderator:', error);
    throw error;
  }
};

/**
 * Funzione di utilità per verificare i permessi di un utente
 */
export const checkUserPermissions = async (uid: string): Promise<void> => {
  try {
    const { fetchUserProfile } = await import('../services/firestoreService');
    const userProfile = await fetchUserProfile(uid);

    if (userProfile) {
      console.log('User Profile:', userProfile);
      console.log('Role:', userProfile.role);
      console.log('Permissions:', userProfile.permissions);
    } else {
      console.log('User profile not found');
    }
  } catch (error) {
    console.error('Error checking user permissions:', error);
  }
};

// Esponi le funzioni globalmente per l'uso in console del browser
declare global {
  interface Window {
    adminUtils: {
      promoteUserToAdmin: typeof promoteUserToAdmin;
      promoteUserToModerator: typeof promoteUserToModerator;
      checkUserPermissions: typeof checkUserPermissions;
    };
  }
}

if (typeof window !== 'undefined') {
  window.adminUtils = {
    promoteUserToAdmin,
    promoteUserToModerator,
    checkUserPermissions
  };
}
