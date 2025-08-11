import {
  collection,
  addDoc,
  query,
  orderBy,
  where,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { BetaFeedback } from '../types';

const FEEDBACK_COLLECTION = 'feedback_tester';

/**
 * Crea un nuovo feedback
 */
export const createFeedback = async (
  userId: string,
  userEmail: string,
  userName: string,
  section: string,
  message: string
): Promise<void> => {
  try {
    await addDoc(collection(db, FEEDBACK_COLLECTION), {
      userId,
      userEmail,
      userName,
      section,
      message,
      status: 'inviato',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Errore nella creazione del feedback:', error);
    throw new Error('Impossibile salvare il feedback');
  }
};

/**
 * Aggiorna lo stato di un feedback
 */
export const updateFeedbackStatus = async (
  feedbackId: string,
  status: 'inviato' | 'letto' | 'risolto'
): Promise<void> => {
  try {
    const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
    await updateDoc(feedbackRef, {
      status,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del feedback:', error);
    throw new Error('Impossibile aggiornare il feedback');
  }
};

/**
 * Elimina un feedback
 */
export const deleteFeedback = async (feedbackId: string): Promise<void> => {
  try {
    const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
    await deleteDoc(feedbackRef);
  } catch (error) {
    console.error('Errore nell\'eliminazione del feedback:', error);
    throw new Error('Impossibile eliminare il feedback');
  }
};

/**
 * Recupera tutti i feedback con filtri opzionali
 */
export const fetchFeedbacks = async (filters?: {
  section?: string;
  userId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<BetaFeedback[]> => {
  try {
    let q = query(collection(db, FEEDBACK_COLLECTION), orderBy('createdAt', 'desc'));

    if (filters?.section) {
      q = query(q, where('section', '==', filters.section));
    }

    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters?.startDate) {
      q = query(q, where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters?.endDate) {
      q = query(q, where('createdAt', '<=', Timestamp.fromDate(filters.endDate)));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        userEmail: data.userEmail,
        userName: data.userName,
        section: data.section,
        message: data.message,
        status: data.status,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
    });
  } catch (error) {
    console.error('Errore nel recupero dei feedback:', error);
    throw new Error('Impossibile recuperare i feedback');
  }
};

/**
 * Recupera le sezioni uniche dai feedback per i filtri
 */
export const getUniqueSections = async (): Promise<string[]> => {
  try {
    const snapshot = await getDocs(collection(db, FEEDBACK_COLLECTION));
    const sections = new Set<string>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.section) {
        sections.add(data.section);
      }
    });

    return Array.from(sections).sort();
  } catch (error) {
    console.error('Errore nel recupero delle sezioni:', error);
    return [];
  }
};

/**
 * Recupera gli utenti unici che hanno inviato feedback
 */
export const getUniqueUsers = async (): Promise<Array<{userId: string, userEmail: string}>> => {
  try {
    const snapshot = await getDocs(collection(db, FEEDBACK_COLLECTION));
    const users = new Map<string, string>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.userId && data.userEmail) {
        users.set(data.userId, data.userEmail);
      }
    });

    return Array.from(users.entries()).map(([userId, userEmail]) => ({
      userId,
      userEmail
    })).sort((a, b) => a.userEmail.localeCompare(b.userEmail));
  } catch (error) {
    console.error('Errore nel recupero degli utenti:', error);
    return [];
  }
};
