import { auth } from './firebase';

const API_BASE_URL = 'https://n8n.srv861958.hstgr.cloud/webhook';

/**
 * Interfaccia per i dettagli del suggerimento generati dall'API.
 */
export interface GeneratedTopicDetails {
  title: string;
  objective: string;
  tags: string[];
}

/**
 * Ottiene il token di autenticazione JWT dell'utente corrente.
 * @returns Il token JWT o null se l'utente non è autenticato.
 */
const getAuthToken = async (): Promise<string | null> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    return await currentUser.getIdToken();
  }
  return null;
};

/**
 * Chiama l'endpoint API per generare i dettagli di un argomento basata su un messaggio.
 * @param message Il messaggio o l'idea iniziale per il suggerimento.
 * @returns Una promessa che si risolve con i dettagli generati per l'argomento.
 */
export const generateTopicSuggestionDetails = async (message: string): Promise<GeneratedTopicDetails> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Utente non autenticato. Impossibile generare il suggerimento.');
  }

  const response = await fetch(`${API_BASE_URL}/curiow-suggest-topic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Errore sconosciuto dal server durante la generazione del suggerimento.' }));
    throw new Error(errorData.message || `Errore nella chiamata API: ${response.statusText}`);
  }

  return response.json();
};
