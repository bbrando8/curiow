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
import { Gem, Channel, User, SavedList, UserQuestion, UserRole, TopicSuggestion } from '../types';
import { getDefaultPermissions } from './roleService';

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
