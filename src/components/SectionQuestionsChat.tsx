import React, { useState, useEffect, useRef } from 'react';
import { callCuriowApi } from '../services/apiService';
import { SparklesIcon } from './icons';
import { PaperAirplaneIcon } from './icons';
import { createDeepTopicSession, touchDeepTopicSession, fetchDeepTopicHistory } from '../services/firestoreService';
import './SectionQuestionsChat.css'; // aggiunto

export interface SectionQuestionData {
  id: string;
  testo: string;
  tipologia?: string;
  element?: { name: string; index?: number; title?: string|null; test?: string|null }; // arricchito con title/test
}

interface SectionQuestionsChatProps {
  gemId: string;
  elementName: string; // 'general'
  questions: SectionQuestionData[];
  autoQuestionId?: string;
  autoCustomQuestionText?: string;
  hideTrigger?: boolean;
  gemTitle?: string;
  gemDescription?: string; // nuovo: per body description
  userId?: string; // nuovo per creare sessione su Firestore
  gemImageUrl?: string; // nuovo: thumbnail
}

interface ChatMessage { id: string; question: string; answer?: string; loading: boolean; error?: string; origin: 'suggested' | 'custom'; element?: { name: string; index?: number; title?: string|null; test?: string|null }; followUps?: string[]; historyId?: string; createdAt?: Date; }

// Utility: sessionId giornaliero persistente
const getDailySessionId = (): string => {
  if (typeof window === 'undefined') return 'session-server';
  const todayKey = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const storageKey = 'curiowChatSession:' + todayKey;
  let sid = localStorage.getItem(storageKey);
  if (!sid) {
    sid = (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)) + '-d';
    localStorage.setItem(storageKey, sid);
  }
  return sid;
};

const SectionQuestionsChat: React.FC<SectionQuestionsChatProps> = ({
  gemId,
  elementName,
  questions,
  autoQuestionId,
  autoCustomQuestionText,
  hideTrigger,
  gemTitle,
  gemDescription,
  userId,
  gemImageUrl
}) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [dynamicSuggestions, setDynamicSuggestions] = useState<SectionQuestionData[]>([]);
  const [baseSuggestions, setBaseSuggestions] = useState<SectionQuestionData[]>([]);
  const [sectionBaseSuggestions, setSectionBaseSuggestions] = useState<SectionQuestionData[]>([]);
  const [hideInitialSuggestions, setHideInitialSuggestions] = useState(false);
  const [sessionCreated, setSessionCreated] = useState(false);
  const [firstQuestionSet, setFirstQuestionSet] = useState(false);
  const [hasExistingHistory, setHasExistingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const autoFiredRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string>('');
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const ensureSession = async (forcedId?: string) => {
    const makeId = () => (forcedId ? forcedId : (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)));
    if (!sessionIdRef.current || forcedId) {
      sessionIdRef.current = makeId();
      console.log('[chat][ensureSession] sessionId set', sessionIdRef.current, { forcedId });
      window.dispatchEvent(new CustomEvent('curiow-chat-current-session', { detail: { sessionId: sessionIdRef.current } }));
    } else {
      console.log('[chat][ensureSession] reuse existing sessionId', sessionIdRef.current);
    }
  };

  const buildBody = (testo: string, elementCtx?: { name: string; index?: number; title?: string|null; test?: string|null }) => {
    return {
      apitype: 'deep-question',
      gemId,
      description: gemDescription || '',
      questionText: testo,
      element: {
        name: elementCtx?.name || elementName,
        title: (elementCtx?.title ?? null) || null,
        test: (elementCtx?.test ?? null) || null
      },
      sessionId: sessionIdRef.current
    };
  };

  const callApi = async (id: string, testo: string, origin: 'suggested'|'custom', elementCtx?: { name: string; index?: number; title?: string|null; test?: string|null }) => {
    try {
      await ensureSession();
      const body = buildBody(testo, elementCtx);
      const resp = await callCuriowApi(body);
      const answer = resp.response || resp.answer || resp.result || resp.text || JSON.stringify(resp);
      const followUps: string[] | undefined = Array.isArray(resp.questions) ? resp.questions : undefined;
      setMessages(m => m.map(msg => msg.id === id ? { ...msg, loading: false, answer, followUps } : msg));
      touchDeepTopicSession(sessionIdRef.current).then(() => {
        window.dispatchEvent(new CustomEvent('curiow-chat-refresh-sessions', { detail: { sessionId: sessionIdRef.current } }));
      });
      // RIMOSSO: nessun salvataggio history - viene gestito altrove
    } catch (e: any) {
      const msg = e.message || 'Errore';
      setMessages(m => m.map(ms => ms.id === id ? { ...ms, loading: false, error: msg } : ms));
    }
  };

  const ask = async (testo: string, origin: 'suggested'|'custom', presetId?: string, elementCtx?: { name: string; index?: number; title?: string|null; test?: string|null }) => {
    await ensureSession();
    if (!sessionCreated && userId) {
      const sid = sessionIdRef.current;
      console.log('[chat][ask] creating session if needed', sid);
      if (sid) {
        try {
          const createdId = await createDeepTopicSession(sid, gemId, userId);
          console.log('[chat][ask] session created', createdId);
          setSessionCreated(true);
          window.dispatchEvent(new CustomEvent('curiow-chat-refresh-sessions', { detail: { sessionId: createdId } }));
        } catch(e) {
          console.error('[chat][ask] error creating session', e);
        }
      }
    }

    const id = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const newMsg: ChatMessage = {
      id,
      question: testo,
      loading: true,
      origin,
      element: elementCtx,
      createdAt: new Date()
    };

    setMessages(m => [...m, newMsg]);
    setHideInitialSuggestions(true);

    // RIMOSSO: nessuna creazione di history entry - il salvataggio viene gestito altrove
    await callApi(id, testo, origin, elementCtx);
  };

  const showFollowUp = (followUp: string) => {
    ask(followUp, 'custom');
  };

  // Normalizza una entry di history esterna
  const normalizeHistoryEntry = (h: any): ChatMessage => {
    const answer = h.answer || h.response || undefined;
    const followUps = Array.isArray(h.followUps) ? h.followUps : (Array.isArray(h.questions) ? h.questions : undefined);
    const createdAt = h.createdAt instanceof Date ? h.createdAt : new Date(h.createdAt?.seconds ? h.createdAt.seconds * 1000 : Date.now());
    return {
      id: h.id,
      question: h.question || h.prompt || '(domanda)',
      answer,
      followUps,
      origin: 'custom',
      loading: false,
      element: h.element || undefined,
      historyId: h.id,
      createdAt
    };
  };

  // Genera solo l'ID sessione quando cambia la gemma o l'utente
  useEffect(() => {
    sessionIdRef.current = '';
    setSessionCreated(false);
    setFirstQuestionSet(false);
    if (userId) {
      ensureSession();
    }
  }, [userId, gemId]);

  // Scroll verso il fondo quando nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ascolta eventi globali di apertura dal resto dell'app
  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      const sug: SectionQuestionData[] = (detail.questions || []).filter(q => q.element?.name !== 'general');
      setDynamicSuggestions(sug);
      setOpen(true);
    };
    window.addEventListener('curiow-chat-open', handler as EventListener);
    return () => window.removeEventListener('curiow-chat-open', handler as EventListener);
  }, []);

  // Aggiorna sessionId se cambia giorno
  useEffect(() => {
    const interval = setInterval(() => {
      const current = sessionIdRef.current.split(':')[0];
      const today = new Date().toISOString().slice(0,10);
      if (!sessionIdRef.current.includes(today)) {
        sessionIdRef.current = getDailySessionId();
      }
    }, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  // Listener per cambiare sessione
  useEffect(() => {
    const useSessionHandler = async (ev: Event) => {
      const { sessionId } = (ev as CustomEvent).detail || {};
      if (!sessionId) return;
      sessionIdRef.current = sessionId;
      setMessages([]);
      setOpen(true);
      window.dispatchEvent(new CustomEvent('curiow-chat-current-session', { detail: { sessionId } }));

      if (userId) {
        try {
          const hist = await fetchDeepTopicHistory(sessionId, userId, gemId);
          const ordered = hist.map(h => normalizeHistoryEntry(h));
          setMessages(ordered);
          setFirstQuestionSet(ordered.length > 0);
          setHasExistingHistory(ordered.length > 0);
        } catch(e) { /* ignore */ }
      }
    };

    const newSessionHandler = async (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      const questions: SectionQuestionData[] = detail.questions || [];
      sessionIdRef.current = '';
      await ensureSession();
      setMessages([]);
      if (questions.length > 0 && questions[0]?.element?.name === 'general') {
        setBaseSuggestions(questions.filter(q => q.element?.name === 'general'));
        setDynamicSuggestions([]);
      } else {
        setDynamicSuggestions(questions.filter(q => q.element?.name !== 'general'));
      }
      setHideInitialSuggestions(false);
      setHasExistingHistory(false);
      setOpen(true);
      // RIMOSSO: focus automatico su input
      // setTimeout(() => {
      //   const input = document.getElementById('curiow-chat-input');
      //   (input as HTMLInputElement | null)?.focus();
      // }, 50);
    };

    window.addEventListener('curiow-chat-use-session', useSessionHandler as EventListener);
    window.addEventListener('curiow-chat-new-session', newSessionHandler);
    return () => {
      window.removeEventListener('curiow-chat-use-session', useSessionHandler as EventListener);
      window.removeEventListener('curiow-chat-new-session', newSessionHandler);
    };
  }, [userId, gemId]);

  // Split tra generali e sezione dalle props originarie
  useEffect(() => {
    const generals = questions.filter(q => q.element?.name === 'general');
    const sectionQs = questions.filter(q => q.element?.name !== 'general');
    setBaseSuggestions(generals);
    setSectionBaseSuggestions(sectionQs);
  }, [questions]);

  // Auto-fire domanda se specificata
  useEffect(() => {
    if (autoQuestionId && autoQuestionId !== autoFiredRef.current) {
      const q = questions.find(q => q.id === autoQuestionId);
      if (q) {
        console.log('[chat] auto-firing question', q.testo);
        ask(q.testo, 'suggested', q.id, q.element);
        autoFiredRef.current = autoQuestionId;
        setOpen(true);
      }
    }
  }, [autoQuestionId, questions]);

  // Auto-fire custom text se specificato
  useEffect(() => {
    if (autoCustomQuestionText && autoCustomQuestionText !== autoFiredRef.current) {
      console.log('[chat] auto-firing custom text', autoCustomQuestionText);
      ask(autoCustomQuestionText, 'custom');
      autoFiredRef.current = autoCustomQuestionText;
      setOpen(true);
    }
  }, [autoCustomQuestionText]);

  // Carica history se la chat viene aperta e non abbiamo ancora messaggi ma esiste sessione
  useEffect(() => {
    const loadOnOpen = async () => {
      if (open && messages.length === 0 && sessionIdRef.current && userId) {
        try {
          const hist = await fetchDeepTopicHistory(sessionIdRef.current, userId, gemId);
          if (hist.length > 0) {
            setMessages(hist.map(h => normalizeHistoryEntry(h)));
            setHasExistingHistory(true);
          }
        } catch(e) { /* ignore */ }
      }
    };
    loadOnOpen();
  }, [open, messages.length, userId, gemId]);

  // Renderizza i suggerimenti dinamici (esclusi i generali)
  const renderDynamicSuggestions = () => {
    if (dynamicSuggestions.length === 0) return null;
    return (
      <div className="curiow-suggestions-group">
        <div className="curiow-suggestions-group-title">Suggerite per questa sessione</div>
        <div className="curiow-suggestions-container">
          {dynamicSuggestions.map((q, idx) => (
            <div key={q.id} className="curiow-suggestion" onClick={() => ask(q.testo, 'suggested', q.id, q.element)}>
              <div className="curiow-suggestion-index">{idx + 1}</div>
              <div className="curiow-suggestion-text">{q.testo}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Renderizza i suggerimenti di base (solo generali)
  const renderBaseSuggestions = () => {
    if (baseSuggestions.length === 0) return null;
    if (hasExistingHistory) return null; // nasconde generali se c'è history preesistente
    return (
      <div className="curiow-suggestions-group">
        <div className="curiow-suggestions-group-title">Domande generali</div>
        <div className="curiow-suggestions-container">
          {baseSuggestions.map((q, idx) => (
            <div key={q.id} className="curiow-suggestion" onClick={() => ask(q.testo, 'suggested', q.id, q.element)}>
              <div className="curiow-suggestion-index">{idx + 1}</div>
              <div className="curiow-suggestion-text">{q.testo}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Renderizza i suggerimenti di sezione (dalle props)
  const renderSectionSuggestions = () => {
    if (sectionBaseSuggestions.length === 0) return null;
    return (
      <div className="curiow-suggestions-group">
        <div className="curiow-suggestions-group-title">Domande per questa sezione</div>
        <div className="curiow-suggestions-container">
          {sectionBaseSuggestions.map((q, idx) => (
            <div key={q.id} className="curiow-suggestion" onClick={() => ask(q.testo, 'suggested', q.id, q.element)}>
              <div className="curiow-suggestion-index">{idx + 1}</div>
              <div className="curiow-suggestion-text">{q.testo}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`curiow-section-questions-chat ${open ? 'open' : ''}`}>
      {!hideTrigger && (
        <div className="curiow-trigger" onClick={() => setOpen(true)}>
          <SparklesIcon />
          <span>Fai una domanda</span>
        </div>
      )}

      {open && (
        <div className="curiow-overlay" onClick={() => setOpen(false)}>
          <div className="curiow-chat-container" onClick={e => e.stopPropagation()}>
            <div className="curiow-header">
              <div className="curiow-header-left">
                {gemImageUrl && (
                  <img src={gemImageUrl} alt={gemTitle || 'Gem'} className="curiow-gem-thumb" loading="lazy" />
                )}
                <div className="curiow-title">{gemTitle || 'Chat'}</div>
              </div>
              <button className="curiow-close" onClick={() => setOpen(false)}>×</button>
            </div>

            <div className="curiow-content">
              {!hideInitialSuggestions && (
                <div className="curiow-top-suggestions">
                  {renderDynamicSuggestions()}
                  {renderSectionSuggestions()}
                  {renderBaseSuggestions()}
                </div>
              )}
              <div className="curiow-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`curiow-message ${msg.loading ? 'loading' : ''}`}>
                    <div className="curiow-message-question">{msg.question}</div>
                    {msg.answer && (
                      <div className="curiow-message-answer">
                        {msg.answer}
                        {msg.followUps && msg.followUps.length > 0 && (
                          <div className="curiow-followups">
                            <div className="curiow-followups-title">Domande correlate:</div>
                            {msg.followUps.map((fu, idx) => (
                              <div key={idx} className="curiow-followup" onClick={() => showFollowUp(fu)}>
                                {fu}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {msg.loading && <div className="curiow-message-loading">Pensando...</div>}
                    {msg.error && <div className="curiow-message-error">{msg.error}</div>}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="curiow-input-container">
                <input
                  id="curiow-chat-input"
                  className="curiow-input"
                  type="text"
                  placeholder="Fai una domanda..."
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customInput.trim() !== '') {
                      ask(customInput.trim(), 'custom');
                      setCustomInput('');
                    }
                  }}
                />
                <button className="curiow-send" type="button" aria-label="Invia domanda" disabled={customInput.trim()===''} onClick={() => {
                  if (customInput.trim() !== '') {
                    ask(customInput.trim(), 'custom');
                    setCustomInput('');
                  }
                }}>
                  <PaperAirplaneIcon className="curiow-send-icon" />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionQuestionsChat;
