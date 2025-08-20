import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Aggiunta Analytics
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';

// ATTENZIONE: Sostituisci questo oggetto con la configurazione del tuo progetto Firebase!
const firebaseConfig = {
  apiKey: "AIzaSyDYlR9POLPSqn9yiQtu_WZa4rHOhbEsFDQ",
  authDomain: "curiow-432ed.firebaseapp.com",
  projectId: "curiow-432ed",
  storageBucket: "curiow-432ed.firebasestorage.app",
  messagingSenderId: "115136967854",
  appId: "1:115136967854:web:24228c1379993b8c61e93f",
  measurementId: "G-LF4YY7HHR3"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializzazione lazy di Analytics (solo browser + supporto)
let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  }).catch(() => {/* ignore */});
}

export const getAnalyticsInstance = () => analyticsInstance;
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (!analyticsInstance) return;
  try { logEvent(analyticsInstance, eventName as any, params); } catch { /* noop */ }
};

// Configura Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Esporta i servizi che ti servono
export const auth = getAuth(app);
export const db = getFirestore(app);

export const getIdToken = async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (user) {
        return await user.getIdToken();
    }
    return null;
    };
