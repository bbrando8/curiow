import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  limit,
  onSnapshot,
  Unsubscribe,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Gem, Channel, User, SavedList, UserQuestion, UserRole, TopicSuggestion, ListWithItems } from '../types';
import { getDefaultPermissions } from './roleService';
import * as listService from './listService';

// --- Fetch Operations ---

export const fetchChannels = async (): Promise<Channel[]> => {
  try {
    const channelsCollection = collection(db, 'channels');
    const channelSnapshot = await getDocs(channelsCollection);
    return channelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel));
  } catch (error) {
    console.error("Error fetching channels:", error);
    return [];
  }
};

export const fetchGems = async (maxCount: number = 20): Promise<Gem[]> => {
    try {
        const gemsCollection = collection(db, 'gems');
        const q = query(gemsCollection, limit(maxCount));
        const gemSnapshot = await getDocs(q);
        // Ritorniamo gemme con userQuestions vuoto, verrà popolato dal listener se necessario
        return gemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), userQuestions: [] } as Gem));
    } catch (error) {
        console.error("Error fetching gems:", error);
        return [];
    }
};

export const fetchUserProfile = async (uid: string): Promise<User | null> => {
    try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        return userDoc.exists() ? (userDoc.data() as User) : null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};

export const fetchUserSavedLists = async (uid: string): Promise<SavedList[]> => {
    try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().savedLists) {
            return userDoc.data().savedLists;
        }
        return [];
    } catch (error) {
        console.error("Error fetching user saved lists:", error);
        return [];
    }
};


// --- Write Operations ---

export const createUserProfile = async (uid: string, email: string, firstName: string, lastName: string, role: UserRole = UserRole.USER): Promise<void> => {
    const userDocRef = doc(db, 'users', uid);
    const defaultLists: SavedList[] = [
        { id: 'default', name: 'Preferiti Generici', gemIds: [] }
    ];
    const permissions = getDefaultPermissions(role);

    await setDoc(userDocRef, {
        email, 
        firstName, 
        lastName,
        role,
        permissions,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        savedLists: defaultLists
    });
};

export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<void> => {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, data);
};

export const updateUserSavedLists = async (uid:string, lists: SavedList[]): Promise<void> => {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, { savedLists: lists });
};

export const addUserQuestion = async (gemId: string, question: string): Promise<void> => {
    const questionsCollection = collection(db, 'gems', gemId, 'userQuestions');
    await addDoc(questionsCollection, {
        question,
        answer: '',
        isGenerating: true,
        createdAt: new Date(),
    });
};


// --- Listeners ---

export const listenToUserQuestions = (gemId: string, callback: (questions: UserQuestion[]) => void): Unsubscribe => {
    const questionsCollection = collection(db, 'gems', gemId, 'userQuestions');
    const q = query(questionsCollection, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
        const questions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as UserQuestion));
        callback(questions);
    });
};

// --- Topic Suggestions Operations ---

export const fetchTopicSuggestions = async (status?: 'pending' | 'approved' | 'converted'): Promise<TopicSuggestion[]> => {
    try {
        const topicsCollection = collection(db, 'topicSuggestions');
        let q = query(topicsCollection, orderBy('createdAt', 'desc'));

        if (status) {
            q = query(topicsCollection, where('status', '==', status), orderBy('createdAt', 'desc'));
        }

        const topicSnapshot = await getDocs(q);
        return topicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopicSuggestion));
    } catch (error) {
        console.error("Error fetching topic suggestions:", error);
        return [];
    }
};

export const createTopicSuggestion = async (text: string, tags: string[], createdBy: string): Promise<void> => {
    const topicsCollection = collection(db, 'topicSuggestions');
    await addDoc(topicsCollection, {
        text,
        tags,
        createdBy,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
    });
};

export const updateTopicSuggestion = async (id: string, data: Partial<TopicSuggestion>): Promise<void> => {
    const topicDocRef = doc(db, 'topicSuggestions', id);
    await updateDoc(topicDocRef, { ...data, updatedAt: new Date() });
};

export const deleteTopicSuggestion = async (id: string): Promise<void> => {
    const topicDocRef = doc(db, 'topicSuggestions', id);
    await updateDoc(topicDocRef, { deleted: true, updatedAt: new Date() });
};

// --- User Management Operations ---

export const fetchAllUsers = async (limit?: number): Promise<(User & { id: string })[]> => {
    try {
        const usersCollection = collection(db, 'users');
        let q = query(usersCollection, orderBy('createdAt', 'desc'));

        if (limit) {
            q = query(usersCollection, orderBy('createdAt', 'desc'), limit(limit));
        }

        const userSnapshot = await getDocs(q);
        return userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User & { id: string }));
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
};

export const searchUsers = async (searchTerm: string): Promise<(User & { id: string })[]> => {
    try {
        // Nota: Firestore non supporta ricerca full-text nativa, quindi facciamo una ricerca per email
        const usersCollection = collection(db, 'users');
        const q = query(
            usersCollection,
            where('email', '>=', searchTerm.toLowerCase()),
            where('email', '<=', searchTerm.toLowerCase() + '\uf8ff')
        );

        const userSnapshot = await getDocs(q);
        return userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User & { id: string }));
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
};

export const promoteUserRole = async (userId: string, newRole: UserRole): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    const newPermissions = getDefaultPermissions(newRole);

    await updateDoc(userDocRef, {
        role: newRole,
        permissions: newPermissions,
        updatedAt: new Date()
    });
};

// --- Nuove funzioni per gestione liste (con retrocompatibilità) ---

export const fetchUserListsNew = async (uid: string): Promise<ListWithItems[]> => {
    try {
        // Prima prova a caricare le liste dalla nuova struttura
        const newLists = await listService.fetchUserLists(uid);

        if (newLists.length > 0) {
            console.log('Found lists in new structure:', newLists.length);
            return newLists;
        }

        // Se non ci sono liste nella nuova struttura, controlla le vecchie
        const oldLists = await fetchUserSavedLists(uid);
        console.log('Found old lists:', oldLists.length);

        if (oldLists.length > 0) {
            // Converti le vecchie liste nel formato nuovo per compatibilità UI
            const convertedLists = oldLists.map(oldList => ({
                id: oldList.id,
                name: oldList.name,
                isPublic: false,
                createdBy: uid,
                createdAt: new Date(),
                updatedAt: new Date(),
                gemIds: oldList.gemIds,
                itemCount: oldList.gemIds.length,
                userRole: 'owner' as const
            }));

            console.log('Converted old lists to new format:', convertedLists);
            return convertedLists;
        }

        // Se non ci sono liste né vecchie né nuove, ritorna array vuoto
        console.log('No lists found for user:', uid);
        return [];
    } catch (error) {
        console.error("Error fetching user lists:", error);
        return [];
    }
};

export const migrateUserToNewListStructure = async (uid: string): Promise<boolean> => {
    try {
        console.log('Starting migration for user:', uid);

        // Verifica se l'utente ha già liste nella nuova struttura
        const existingNewLists = await listService.fetchUserLists(uid);
        console.log('Existing new lists found:', existingNewLists.length);

        if (existingNewLists.length > 0) {
            console.log('User already migrated, skipping migration');
            return true; // Già migrato
        }

        // Ottieni le vecchie liste
        const oldLists = await fetchUserSavedLists(uid);
        console.log('Old lists found:', oldLists.length, oldLists);

        if (oldLists.length === 0) {
            console.log('No old lists found, creating default favorites list');
            // Crea una lista preferiti di default nella nuova struttura
            await listService.createList('Preferiti', uid, 'I tuoi contenuti preferiti', false, '#3B82F6', '❤️');
            console.log('Default favorites list created');
            return true;
        }

        console.log('Migrating old lists to new structure...');
        // Migra le vecchie liste
        await listService.migrateUserLists(uid, oldLists);
        console.log('Migration completed successfully');

        // Rimuovi le vecchie liste dal documento utente solo dopo migrazione riuscita
        await updateDoc(doc(db, 'users', uid), {
            savedLists: [],
            migratedToNewLists: true,
            migratedAt: new Date()
        });
        console.log('Old lists cleared from user document');

        return true;
    } catch (error) {
        console.error("Error migrating user lists:", error);
        return false;
    }
};

// Funzioni wrapper per compatibilità con l'UI esistente
export const createNewList = async (uid: string, name: string): Promise<string> => {
    return await listService.createList(name, uid);
};

export const addGemToUserList = async (uid: string, listId: string, gemId: string): Promise<void> => {
    // Prima verifica se è una lista vecchia o nuova
    const newLists = await listService.fetchUserLists(uid);
    const isNewList = newLists.some(list => list.id === listId);

    if (isNewList) {
        await listService.addGemToList(listId, gemId, uid);
    } else {
        // Gestisci le vecchie liste (retrocompatibilità durante migrazione)
        const oldLists = await fetchUserSavedLists(uid);
        const listIndex = oldLists.findIndex(list => list.id === listId);

        if (listIndex !== -1 && !oldLists[listIndex].gemIds.includes(gemId)) {
            oldLists[listIndex].gemIds.push(gemId);
            await updateUserSavedLists(uid, oldLists);
        }
    }
};

export const removeGemFromUserList = async (uid: string, listId: string, gemId: string): Promise<void> => {
    // Prima verifica se è una lista vecchia o nuova
    const newLists = await listService.fetchUserLists(uid);
    const isNewList = newLists.some(list => list.id === listId);

    if (isNewList) {
        await listService.removeGemFromList(listId, gemId);
    } else {
        // Gestisci le vecchie liste (retrocompatibilità durante migrazione)
        const oldLists = await fetchUserSavedLists(uid);
        const listIndex = oldLists.findIndex(list => list.id === listId);

        if (listIndex !== -1) {
            oldLists[listIndex].gemIds = oldLists[listIndex].gemIds.filter(id => id !== gemId);
            await updateUserSavedLists(uid, oldLists);
        }
    }
};

// Esporta le funzioni del nuovo servizio liste per uso diretto
export const {
    createList,
    addGemToList,
    removeGemFromList,
    fetchUserLists,
    fetchListById,
    updateList,
    deleteList,
    addMemberToList,
    removeMemberFromList,
    checkGemInList
} = listService;
