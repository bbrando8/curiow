import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  limit,
  onSnapshot,
  Unsubscribe,
  orderBy,
  where,
  writeBatch,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
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
        const topicsCollection = collection(db, 'topic_suggestions');
        let q = query(topicsCollection, orderBy('createdAt', 'desc'));

        if (status) {
            q = query(topicsCollection, where('status', '==', status), orderBy('createdAt', 'desc'));
        }

        const topicSnapshot = await getDocs(q);
        // Filtra gli elementi eliminati lato client per evitare problemi con indici Firestore
        const topics = topicSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as TopicSuggestion))
            .filter(topic => !topic.deleted); // Filtra solo quelli che hanno deleted = true

        return topics;
    } catch (error) {
        console.error("Error fetching topic suggestions:", error);
        return [];
    }
};

export const createTopicSuggestion = async (
  title: string,
  objective: string,
  tags: string[],
  createdBy: string,
  originalSuggestion?: string,
  channelId?: string
): Promise<void> => {
  const topicsCollection = collection(db, 'topic_suggestions');
  await addDoc(topicsCollection, {
    title,
    objective,
    originalSuggestion: originalSuggestion || '',
    tags,
    createdBy,
    channelId: channelId || '',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

export const updateTopicSuggestion = async (id: string, data: Partial<TopicSuggestion>): Promise<void> => {
    const topicDocRef = doc(db, 'topic_suggestions', id);
    await updateDoc(topicDocRef, { ...data, updatedAt: new Date() });
};

export const deleteTopicSuggestion = async (id: string): Promise<void> => {
    const topicDocRef = doc(db, 'topic_suggestions', id);
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

// --- Channel Operations ---

export const fetchAllChannels = async (): Promise<(Channel & { id: string })[]> => {
  try {
    const channelsCollection = collection(db, 'channels');
    const q = query(channelsCollection, orderBy('createdAt', 'desc'));
    const channelSnapshot = await getDocs(q);
    return channelSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as Channel & { id: string }));
  } catch (error) {
    console.error("Error fetching all channels:", error);
    return [];
  }
};

export const createChannel = async (channelData: Omit<Channel, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const channelsCollection = collection(db, 'channels');
    const docRef = await addDoc(channelsCollection, {
      ...channelData,
      createdAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating channel:", error);
    throw error;
  }
};

export const updateChannel = async (channelId: string, channelData: Partial<Channel>): Promise<void> => {
  try {
    const channelDocRef = doc(db, 'channels', channelId);
    await updateDoc(channelDocRef, {
      ...channelData,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error updating channel:", error);
    throw error;
  }
};

export const deleteChannel = async (channelId: string): Promise<void> => {
  try {
    const channelDocRef = doc(db, 'channels', channelId);
    await updateDoc(channelDocRef, {
      isActive: false,
      deletedAt: new Date()
    });
  } catch (error) {
    console.error("Error deleting channel:", error);
    throw error;
  }
};

export const searchChannels = async (searchTerm: string): Promise<(Channel & { id: string })[]> => {
  try {
    const channelsCollection = collection(db, 'channels');
    const channelSnapshot = await getDocs(channelsCollection);
    const allChannels = channelSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as Channel & { id: string }));

    // Filtro lato client per la ricerca
    return allChannels.filter(c => (c as any).name?.toLowerCase().includes(searchTerm.toLowerCase()));
  } catch (error) {
    console.error("Error searching channels:", error);
    return [];
  }
};

// --- Questions (AI generated) ---
export interface GeneratedQuestionRecord {
  createdAt: string; // ISO
  gemId: string;
  section: string;
  testo: string;
  tipologia: string;
  stepIndex?: number;
}

export const addGeneratedQuestion = async (qData: GeneratedQuestionRecord): Promise<string> => {
  try {
    const questionsCollection = collection(db, 'questions');
    const docRef = await addDoc(questionsCollection, qData);
    return docRef.id;
  } catch (error) {
    console.error('Errore salvataggio domanda generata:', error);
    throw error;
  }
};

export const fetchGeneratedQuestionsByGem = async (gemId: string): Promise<(GeneratedQuestionRecord & { id: string })[]> => {
  try {
    const questionsCollection = collection(db, 'questions');
    const q = query(questionsCollection, where('gemId', '==', gemId), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as GeneratedQuestionRecord) }));
  } catch (error) {
    console.error('Errore fetch domande generate:', error);
    return [];
  }
};

// Aggiunte funzioni per gestione gems
export const fetchAllGems = async (): Promise<(Gem & { id: string })[]> => {
  try {
    const gemsCollection = collection(db, 'gems');
    const q = query(gemsCollection, orderBy('title', 'asc'));
    const gemSnapshot = await getDocs(q);
    return gemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), userQuestions: [] } as Gem & { id: string }));
  } catch (error) {
    console.error("Error fetching all gems:", error);
    return [];
  }
};

export const searchGems = async (searchTerm: string): Promise<(Gem & { id: string })[]> => {
  try {
    const gemsCollection = collection(db, 'gems');
    const snapshot = await getDocs(gemsCollection);
    const allGems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gem & { id: string }));

    return allGems.filter(gem => {
      const title = typeof gem.title === 'string' ? gem.title : '';
      const desc = (gem as any).content?.description || (gem as any).description || '';
      const tags = Array.isArray(gem.tags) ? gem.tags : [];
      return (
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  } catch (error) {
    console.error("Error searching gems:", error);
    return [];
  }
};

export const createGem = async (gemData: Omit<Gem, 'id'>): Promise<string> => {
  try {
    const gemsCollection = collection(db, 'gems');
    const docRef = await addDoc(gemsCollection, gemData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating gem:", error);
    throw error;
  }
};

export const updateGem = async (gemId: string, gemData: Partial<Gem>): Promise<void> => {
  try {
    const gemDocRef = doc(db, 'gems', gemId);
    await updateDoc(gemDocRef, gemData);
  } catch (error) {
    console.error("Error updating gem:", error);
    throw error;
  }
};

export const deleteGem = async (gemId: string): Promise<void> => {
  try {
    // Elimina il documento principale della gem
    const gemDocRef = doc(db, 'gems', gemId);
    await deleteDoc(gemDocRef);

    // Trova tutti i list_items che referenziano questa gem
    const itemsQuery = query(
      collection(db, 'list_items'),
      where('gemId', '==', gemId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);

    if (!itemsSnapshot.empty) {
      // Usiamo batch multipli se necessario per rimanere sotto il limite di 500 operazioni
      let batch = writeBatch(db);
      let ops = 0;
      const affectedListIds = new Set<string>();

      for (const itemDoc of itemsSnapshot.docs) {
        batch.delete(itemDoc.ref);
        ops++;
        const data: any = itemDoc.data();
        if (data.listId) affectedListIds.add(data.listId);
        if (ops >= 450) { // commit parziale lasciando margine per update liste
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      }

      // Aggiorna updatedAt delle liste toccate
      for (const listId of affectedListIds) {
        batch.update(doc(db, 'lists', listId), { updatedAt: new Date() });
        ops++;
        if (ops >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      }

      if (ops > 0) {
        await batch.commit();
      }
    }
  } catch (error) {
    console.error("Error deleting gem:", error);
    throw error;
  }
};

export const getGemById = async (gemId: string): Promise<(Gem & { id: string }) | null> => {
  try {
    const gemDocRef = doc(db, 'gems', gemId);
    const gemDoc = await getDoc(gemDocRef);
    if (gemDoc.exists()) {
      return { id: gemDoc.id, ...gemDoc.data(), userQuestions: [] } as Gem & { id: string };
    }
    return null;
  } catch (error) {
    console.error("Error fetching gem by id:", error);
    return null;
  }
};

export const fetchGemById = async (id: string): Promise<Gem | null> => {
  try {
    const gemDocRef = doc(db, 'gems', id);
    const gemDoc = await getDoc(gemDocRef);
    if (!gemDoc.exists()) return null;
    return { id: gemDoc.id, ...gemDoc.data(), userQuestions: [] } as Gem;
  } catch (error) {
    console.error('Error fetching gem by id:', error);
    return null;
  }
};

// --- Funzioni per caricamento paginato delle gems ---

export const fetchGemsPaginated = async (lastDoc?: QueryDocumentSnapshot<DocumentData>, pageSize: number = 20): Promise<{ gems: Gem[], lastVisible?: QueryDocumentSnapshot<DocumentData> }> => {
  try {
    const gemsCollection = collection(db, 'gems');
    // Ordinamento stabile: prima per title poi per id documento
    let q = query(gemsCollection, orderBy('title', 'asc'), orderBy('__name__', 'asc'), limit(pageSize));

    if (lastDoc) {
      q = query(gemsCollection, orderBy('title', 'asc'), orderBy('__name__', 'asc'), startAfter(lastDoc), limit(pageSize));
    }

    const gemSnapshot = await getDocs(q);
    const gems = gemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), userQuestions: [] } as Gem));

    return {
      gems,
      lastVisible: gemSnapshot.docs.length > 0 ? gemSnapshot.docs[gemSnapshot.docs.length - 1] : undefined
    };
  } catch (error) {
    console.error("Error fetching paginated gems:", error);
    return { gems: [] };
  }
};

// --- Deep Topic Sessions ---
export interface DeepTopicSession {
  id: string; // sessionId usato come id documento
  sessionId: string;
  gemId: string;
  userId: string;
  createdAt: Date;
  modifiedAt: Date;
  // Rimossi firstQuestion e firstHistoryId - il titolo viene ottenuto dalla history
}

export interface DeepTopicHistoryEntry {
  id: string;
  sessionId: string;
  gemId: string;
  userId: string;
  question: string;
  answer?: string;
  followUps?: string[];
  element?: any;
  createdAt: Date;
  updatedAt: Date;
}

export const createDeepTopicSession = async (sessionId: string, gemId: string, userId: string): Promise<string> => {
  if (!userId) return sessionId;
  let currentId = sessionId;
  let ref = doc(db, 'deep_topic', currentId);
  const baseData = {
    sessionId: currentId,
    gemId,
    userId,
    createdAt: new Date(), // se esiste già verrà ignorato dal merge manuale sotto
    modifiedAt: new Date()
  } as any;
  try {
    try {
      // Primo tentativo: crea se non esiste, aggiorna modifiedAt se esiste (mantieni createdAt precedente)
      await setDoc(ref, baseData, { merge: true });
      // Se il doc esisteva, non sovrascrivere createdAt: Firestore mantiene il valore precedente
      return currentId;
    } catch (err: any) {
      // Possibile collisione di sessionId con doc di altro utente → permission-denied
      const permDenied = err?.code === 'permission-denied';
      if (!permDenied) throw err;
      currentId = sessionId + '-' + Math.random().toString(36).slice(2,8);
      ref = doc(db, 'deep_topic', currentId);
      await setDoc(ref, { ...baseData, sessionId: currentId });
      return currentId;
    }
  } catch(e){
    console.error('[firestore] createDeepTopicSession fatal', e);
    throw e;
  }
};

export const fetchDeepTopicHistory = async (sessionId: string, userId: string, gemId: string): Promise<DeepTopicHistoryEntry[]> => {
  console.log('[deep_topic][history] fetchDeepTopicHistory start', { sessionId, userId, gemId });
  if(!sessionId || !userId || !gemId) {
    console.log('[deep_topic][history] missing required params, return empty');
    return [];
  }

  const colRef = collection(db, 'deep_topic_history');

  try {
    // Query con tutti e tre i filtri richiesti
    const q = query(
      colRef,
      where('gemId', '==', gemId),
      where('sessionId', '==', sessionId),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    );

    const snap = await getDocs(q);
    console.log('[deep_topic][history] query found', snap.docs.length, 'entries');

    const rows = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as any)
    })) as DeepTopicHistoryEntry[];

    console.log('[deep_topic][history] final result:', rows.length, 'entries');
    return rows;

  } catch(e) {
    console.error('[deep_topic][history] query error', e);
    return [];
  }
};

export const deleteDeepTopicSession = async (sessionId: string, userId: string): Promise<void> => {
  if(!sessionId || !userId) return;
  // elimina history
  const colRef = collection(db, 'deep_topic_history');
  const qy = query(colRef, where('sessionId','==', sessionId), where('userId','==', userId));
  const snap = await getDocs(qy);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(doc(db,'deep_topic', sessionId));
  await batch.commit();
};

export const touchDeepTopicSession = async (sessionId: string): Promise<void> => {
  if (!sessionId) return;
  const ref = doc(db, 'deep_topic', sessionId);
  try { await updateDoc(ref, { modifiedAt: new Date() }); } catch(e) { /* ignore */ }
};

export const fetchDeepTopicSessions = async (gemId: string, userId: string, max: number = 50): Promise<DeepTopicSession[]> => {
  console.log('[deep_topic][sessions] fetchDeepTopicSessions start', { gemId, userId, max });
  if (!userId) { console.log('[deep_topic][sessions] no userId -> []'); return [];}
  const colRef = collection(db, 'deep_topic');
  const qy = query(colRef, where('gemId', '==', gemId), where('userId','==', userId), orderBy('modifiedAt','desc'), limit(max));
  let snap;
  try { snap = await getDocs(qy); } catch(e){ console.warn('[deep_topic][sessions] query error', e); return []; }
  const sessions = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as DeepTopicSession[];
  console.log('[deep_topic][sessions] sessions loaded:', sessions.length);
  return sessions;
};

// Funzione per ottenere il titolo di una sessione dalla prima domanda in history
export const getSessionTitle = async (sessionId: string, userId: string, gemId: string): Promise<string> => {
  console.log('[deep_topic][title] getSessionTitle start', { sessionId, userId, gemId });

  if (!sessionId || !userId || !gemId) {
    console.log('[deep_topic][title] missing required params');
    return 'Conversazione';
  }

  try {
    const colRef = collection(db, 'deep_topic_history');
    const q = query(
      colRef,
      where('gemId', '==', gemId),
      where('sessionId', '==', sessionId),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc'),
      limit(1)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const firstEntry = snap.docs[0].data();
      const question = firstEntry.question || '';
      console.log('[deep_topic][title] found first question:', question.substring(0, 50) + '...');

      // Tronca la domanda se troppo lunga per il titolo
      return question.length > 60 ? question.substring(0, 60) + '...' : question;
    }

    console.log('[deep_topic][title] no history found, using default');
    return 'Conversazione';

  } catch (e) {
    console.error('[deep_topic][title] error getting session title', e);
    return 'Conversazione';
  }
};

// --- Funzione di ricerca gems filtrata su Firestore ---
import { QueryDocumentSnapshot } from 'firebase/firestore';

export const fetchGemsFiltered = async (
  searchTerm: string,
  activeTags: string[],
  pageSize: number = 20,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ gems: Gem[], lastVisible?: QueryDocumentSnapshot<DocumentData> }> => {
  try {
    const gemsCollection = collection(db, 'gems');
    let q;
    // Se ci sono tag attivi, usa array-contains per il primo tag (Firestore non supporta array-contains-multiple)
    if (activeTags.length > 0) {
      q = query(gemsCollection, where('tags', 'array-contains', activeTags[0]), orderBy('title', 'asc'), limit(pageSize));
    } else {
      q = query(gemsCollection, orderBy('title', 'asc'), limit(pageSize));
    }
    if (lastDoc) {
      q = query(q, startAfter(lastDoc), limit(pageSize));
    }
    const snap = await getDocs(q);
    let gems = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), userQuestions: [] } as Gem));
    // Filtro lato client per searchTerm e per tutti i tag attivi (se >1)
    if (activeTags.length > 1) {
      const normTags = activeTags.map(t => t.trim().toLowerCase());
      gems = gems.filter(gem => {
        const gemTagsArr: string[] = Array.isArray(gem.tags) ? gem.tags : [];
        const gemNormSet = new Set(gemTagsArr.map(t => String(t || '').trim().toLowerCase()));
        return normTags.every(t => gemNormSet.has(t));
      });
    }
    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      gems = gems.filter(gem => {
        const title = (gem.title || '').toLowerCase();
        const desc = (((gem as any).content?.description || gem.description || '') as string).toLowerCase();
        const tags = Array.isArray(gem.tags) ? gem.tags : [];
        if (title.includes(term) || desc.includes(term)) return true;
        for (const tag of tags) {
          if (typeof tag === 'string' && tag.toLowerCase().includes(term)) return true;
        }
        return false;
      });
    }
    return {
      gems,
      lastVisible: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined
    };
  } catch (error) {
    console.error('Error fetching filtered gems:', error);
    return { gems: [] };
  }
};
