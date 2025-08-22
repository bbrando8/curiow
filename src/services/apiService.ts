import { auth } from './firebase';

const API_BASE_URL = 'https://n8n.srv861958.hstgr.cloud/webhook';

/**
 * Interfaccia per i dettagli del suggerimento generati dall'API.
 */
export interface GeneratedTopicDetails {
  title: string;
  objective: string;
  tags: string[];
  channelId?: string;
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

  const response = await fetch(`https://n8n.srv861958.hstgr.cloud/webhook/curiow-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message, apitype: 'create-suggest' }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Errore sconosciuto dal server durante la generazione del suggerimento.' }));
    throw new Error(errorData.message || `Errore nella chiamata API: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Funzione generica per chiamare l'API Curiow con un body personalizzato.
 * @param body Il corpo della richiesta da inviare all'API.
 * @returns Una promessa che si risolve con la risposta dell'API.
 */
export const callCuriowApi = async (body: any): Promise<any> => {
  const token = await getAuthToken();
  if (!token) throw new Error('Utente non autenticato.');
  const response = await fetch(`https://n8n.srv861958.hstgr.cloud/webhook/curiow-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Errore API');
  }
  return response.json().catch(() => ({}));
};
