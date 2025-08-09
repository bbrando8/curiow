import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { List, ListItem, ListMember, ListWithItems } from '../types';

// --- Creazione Liste ---

export const createList = async (
  name: string,
  createdBy: string,
  description?: string,
  isPublic: boolean = false,
  color?: string,
  icon?: string
): Promise<string> => {
  try {
    const batch = writeBatch(db);

    // Crea la lista
    const listRef = doc(collection(db, 'lists'));
    const listData: Omit<List, 'id'> = {
      name,
      isPublic,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(description && { description }),
      ...(color && { color }),
      ...(icon && { icon })
    };

    batch.set(listRef, listData);

    // Aggiungi il creatore come owner
    const memberRef = doc(collection(db, 'list_members'));
    const memberData: Omit<ListMember, 'id'> = {
      listId: listRef.id,
      userId: createdBy,
      role: 'owner',
      joinedAt: new Date()
    };

    batch.set(memberRef, memberData);

    await batch.commit();
    return listRef.id;
  } catch (error) {
    console.error("Error creating list:", error);
    throw error;
  }
};

// --- Aggiunta/Rimozione Gems ---

export const addGemToList = async (
  listId: string,
  gemId: string,
  addedBy: string
): Promise<void> => {
  try {
    // Verifica se il gem è già nella lista
    const existingItemQuery = query(
      collection(db, 'list_items'),
      where('listId', '==', listId),
      where('gemId', '==', gemId)
    );
    const existingItems = await getDocs(existingItemQuery);

    if (!existingItems.empty) {
      throw new Error('Gem already in list');
    }

    // Aggiungi il gem alla lista
    const itemData: Omit<ListItem, 'id'> = {
      listId,
      gemId,
      addedBy,
      addedAt: new Date()
    };

    await addDoc(collection(db, 'list_items'), itemData);

    // Aggiorna timestamp della lista
    await updateDoc(doc(db, 'lists', listId), {
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error adding gem to list:", error);
    throw error;
  }
};

export const removeGemFromList = async (
  listId: string,
  gemId: string
): Promise<void> => {
  try {
    // Trova l'item da rimuovere
    const itemQuery = query(
      collection(db, 'list_items'),
      where('listId', '==', listId),
      where('gemId', '==', gemId)
    );
    const itemSnapshot = await getDocs(itemQuery);

    if (itemSnapshot.empty) {
      throw new Error('Item not found in list');
    }

    // Rimuovi l'item
    const batch = writeBatch(db);
    itemSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Aggiorna timestamp della lista
    batch.update(doc(db, 'lists', listId), {
      updatedAt: new Date()
    });

    await batch.commit();
  } catch (error) {
    console.error("Error removing gem from list:", error);
    throw error;
  }
};

// --- Fetch Operations ---

export const fetchUserLists = async (userId: string): Promise<ListWithItems[]> => {
  try {
    // Ottieni le liste dell'utente tramite list_members
    const memberQuery = query(
      collection(db, 'list_members'),
      where('userId', '==', userId)
    );
    const memberSnapshot = await getDocs(memberQuery);

    if (memberSnapshot.empty) {
      return [];
    }

    const lists: ListWithItems[] = [];

    for (const memberDoc of memberSnapshot.docs) {
      const memberData = memberDoc.data() as ListMember;

      // Ottieni i dati della lista
      const listDoc = await getDoc(doc(db, 'lists', memberData.listId));
      if (!listDoc.exists()) continue;

      const listData = { id: listDoc.id, ...listDoc.data() } as List;

      // Converti i Timestamp di Firestore in Date
      const createdAt = listData.createdAt instanceof Date ? listData.createdAt : listData.createdAt.toDate();
      const updatedAt = listData.updatedAt instanceof Date ? listData.updatedAt : listData.updatedAt.toDate();

      // Ottieni gli items della lista (rimuoviamo l'ordinamento per evitare l'indice)
      const itemsQuery = query(
        collection(db, 'list_items'),
        where('listId', '==', memberData.listId)
      );
      const itemsSnapshot = await getDocs(itemsQuery);

      const gemIds = itemsSnapshot.docs.map(doc => doc.data().gemId);

      lists.push({
        ...listData,
        createdAt,
        updatedAt,
        gemIds,
        itemCount: gemIds.length,
        userRole: memberData.role
      });
    }

    return lists.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error) {
    console.error("Error fetching user lists:", error);
    return [];
  }
};

export const fetchListById = async (listId: string, userId?: string): Promise<ListWithItems | null> => {
  try {
    const listDoc = await getDoc(doc(db, 'lists', listId));
    if (!listDoc.exists()) return null;

    const listData = { id: listDoc.id, ...listDoc.data() } as List;

    // Verifica i permessi se userId è fornito
    let userRole: 'owner' | 'editor' | 'viewer' | undefined;
    if (userId) {
      const memberQuery = query(
        collection(db, 'list_members'),
        where('listId', '==', listId),
        where('userId', '==', userId)
      );
      const memberSnapshot = await getDocs(memberQuery);

      if (!memberSnapshot.empty) {
        userRole = memberSnapshot.docs[0].data().role as 'owner' | 'editor' | 'viewer';
      } else if (!listData.isPublic) {
        return null; // Non autorizzato per liste private
      }
    } else if (!listData.isPublic) {
      return null; // Non autorizzato per liste private
    }

    // Ottieni gli items della lista (rimuoviamo anche qui l'ordinamento)
    const itemsQuery = query(
      collection(db, 'list_items'),
      where('listId', '==', listId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);

    const gemIds = itemsSnapshot.docs.map(doc => doc.data().gemId);

    return {
      ...listData,
      gemIds,
      itemCount: gemIds.length,
      userRole
    };
  } catch (error) {
    console.error("Error fetching list:", error);
    return null;
  }
};

// --- Gestione Lista ---

export const updateList = async (
  listId: string,
  updates: Partial<Pick<List, 'name' | 'description' | 'isPublic' | 'color' | 'icon'>>
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'lists', listId), {
      ...updates,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error updating list:", error);
    throw error;
  }
};

export const deleteList = async (listId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);

    // Elimina tutti gli items della lista
    const itemsQuery = query(
      collection(db, 'list_items'),
      where('listId', '==', listId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    itemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Elimina tutti i membri della lista
    const membersQuery = query(
      collection(db, 'list_members'),
      where('listId', '==', listId)
    );
    const membersSnapshot = await getDocs(membersQuery);
    membersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Elimina la lista
    batch.delete(doc(db, 'lists', listId));

    await batch.commit();
  } catch (error) {
    console.error("Error deleting list:", error);
    throw error;
  }
};

// --- Gestione Membri (per condivisione futura) ---

export const addMemberToList = async (
  listId: string,
  userId: string,
  role: 'editor' | 'viewer' = 'viewer'
): Promise<void> => {
  try {
    // Verifica se l'utente è già membro
    const existingMemberQuery = query(
      collection(db, 'list_members'),
      where('listId', '==', listId),
      where('userId', '==', userId)
    );
    const existingMembers = await getDocs(existingMemberQuery);

    if (!existingMembers.empty) {
      throw new Error('User is already a member of this list');
    }

    const memberData: Omit<ListMember, 'id'> = {
      listId,
      userId,
      role,
      joinedAt: new Date()
    };

    await addDoc(collection(db, 'list_members'), memberData);
  } catch (error) {
    console.error("Error adding member to list:", error);
    throw error;
  }
};

export const removeMemberFromList = async (
  listId: string,
  userId: string
): Promise<void> => {
  try {
    const memberQuery = query(
      collection(db, 'list_members'),
      where('listId', '==', listId),
      where('userId', '==', userId)
    );
    const memberSnapshot = await getDocs(memberQuery);

    if (memberSnapshot.empty) {
      throw new Error('Member not found');
    }

    // Non permettere di rimuovere l'owner
    const memberData = memberSnapshot.docs[0].data() as ListMember;
    if (memberData.role === 'owner') {
      throw new Error('Cannot remove owner from list');
    }

    await deleteDoc(memberSnapshot.docs[0].ref);
  } catch (error) {
    console.error("Error removing member from list:", error);
    throw error;
  }
};

// --- Utilità ---

export const checkGemInList = async (listId: string, gemId: string): Promise<boolean> => {
  try {
    const itemQuery = query(
      collection(db, 'list_items'),
      where('listId', '==', listId),
      where('gemId', '==', gemId)
    );
    const itemSnapshot = await getDocs(itemQuery);
    return !itemSnapshot.empty;
  } catch (error) {
    console.error("Error checking gem in list:", error);
    return false;
  }
};

// --- Migrazione (per convertire le liste esistenti) ---

export const migrateUserLists = async (userId: string, oldLists: { id: string; name: string; gemIds: string[] }[]): Promise<void> => {
  try {
    const batch = writeBatch(db);

    for (const oldList of oldLists) {
      // Crea la nuova lista
      const listRef = doc(collection(db, 'lists'));
      const listData: Omit<List, 'id'> = {
        name: oldList.name,
        isPublic: false,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      batch.set(listRef, listData);

      // Aggiungi il creatore come owner
      const memberRef = doc(collection(db, 'list_members'));
      const memberData: Omit<ListMember, 'id'> = {
        listId: listRef.id,
        userId,
        role: 'owner',
        joinedAt: new Date()
      };

      batch.set(memberRef, memberData);

      // Aggiungi tutti i gems
      for (const gemId of oldList.gemIds) {
        const itemRef = doc(collection(db, 'list_items'));
        const itemData: Omit<ListItem, 'id'> = {
          listId: listRef.id,
          gemId,
          addedBy: userId,
          addedAt: new Date()
        };

        batch.set(itemRef, itemData);
      }
    }

    await batch.commit();
  } catch (error) {
    console.error("Error migrating user lists:", error);
    throw error;
  }
};
