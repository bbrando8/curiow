import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// Configura Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Esporta i servizi che ti servono
export const auth = getAuth(app);
export const db = getFirestore(app);
