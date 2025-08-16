// Script di migrazione per aggiungere il permesso canManageChannels agli utenti esistenti
// Esegui questo script una sola volta nella console del browser o come utility

import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserRole } from '../types';

export const migrateUsersPermissions = async () => {
  try {
    console.log('Inizio migrazione permessi utenti...');

    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);

    let updatedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Aggiorna solo admin e moderatori
      if (userData.role === UserRole.ADMIN || userData.role === UserRole.MODERATOR) {
        const currentPermissions = userData.permissions || {};

        // Verifica se l'utente ha già il nuovo permesso
        if (currentPermissions.canManageChannels === undefined) {
          const updatedPermissions = {
            ...currentPermissions,
            canManageChannels: true
          };

          await updateDoc(doc(db, 'users', userId), {
            permissions: updatedPermissions,
            updatedAt: new Date()
          });

          console.log(`Aggiornato utente ${userId} (${userData.role}) con permesso canManageChannels`);
          updatedCount++;
        }
      }
    }

    console.log(`Migrazione completata! Aggiornati ${updatedCount} utenti.`);
    return updatedCount;
  } catch (error) {
    console.error('Errore durante la migrazione:', error);
    throw error;
  }
};

// Funzione per eseguire la migrazione manualmente dalla console
(window as any).migrateUsersPermissions = migrateUsersPermissions;
