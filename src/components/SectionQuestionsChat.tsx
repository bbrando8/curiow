import React, { useState, useEffect, useRef } from 'react';
import { callCuriowApi } from '../services/apiService';
import { SparklesIcon } from './icons';

export interface SectionQuestionData {
  id: string;
  testo: string;
  tipologia?: string;
  element?: { name: string; index?: number }; // nuovo: contesto sezione specifico
}

interface SectionQuestionsChatProps {
  gemId: string;
  elementName: string; // sempre 'general' per il montaggio principale
  questions: SectionQuestionData[]; // domande generali (base)
  autoQuestionId?: string;
  autoCustomQuestionText?: string;
  hideTrigger?: boolean; // mantenuta per retrocompatibilità (non usata)
  gemTitle?: string; // nuovo: titolo gemma per header
}

interface ChatMessage { id: string; question: string; answer?: string; loading: boolean; error?: string; origin: 'suggested' | 'custom'; element?: { name: string; index?: number }; }

const SectionQuestionsChat: React.FC<SectionQuestionsChatProps> = ({
  gemId,
  elementName,
  questions,
  autoQuestionId,
  autoCustomQuestionText,
  gemTitle
}) => {
  const [open, setOpen] = useState(false); // start chiusa
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [dynamicSuggestions, setDynamicSuggestions] = useState<SectionQuestionData[]>([]); // suggerimenti contestuali (sezione)
  const [baseSuggestions, setBaseSuggestions] = useState<SectionQuestionData[]>(questions);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const autoFiredRef = useRef<string | null>(null);

  // Aggiorna suggerimenti base se cambiano le props
  useEffect(()=>{ setBaseSuggestions(questions); },[questions]);

  // Scroll verso il fondo quando nuovi messaggi
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Ascolta eventi globali di apertura dal resto dell'app
  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      const sug: SectionQuestionData[] = detail.questions || [];
      setDynamicSuggestions(sug);
      setOpen(true);
      // opzionale: focus input
      setTimeout(()=>{
        const input = document.getElementById('curiow-chat-input');
        (input as HTMLInputElement | null)?.focus();
      }, 50);
    };
    window.addEventListener('curiow-chat-open', handler as EventListener);
    return () => window.removeEventListener('curiow-chat-open', handler as EventListener);
  }, []);

  const callApi = async (id: string, testo: string, origin: 'suggested'|'custom', elementCtx?: { name: string; index?: number }) => {
    try {
      const body: any = {
        apitype: 'deep-question',
        gemId,
        questionId: origin==='suggested' ? id : '',
        questionText: testo,
        element: elementCtx || { name: elementName, index: 0 }
      };
      const resp = await callCuriowApi(body);
      const answer = resp.answer || resp.result || resp.text || JSON.stringify(resp);
      setMessages(m => m.map(msg => msg.id === id ? { ...msg, loading: false, answer } : msg));
    } catch (e: any) {
      const msg = e.message || 'Errore';
      setMessages(m => m.map(ms => ms.id === id ? { ...ms, loading: false, error: msg } : ms));
    }
  };

  const ask = (testo: string, origin: 'suggested'|'custom', presetId?: string, elementCtx?: { name: string; index?: number }) => {
    const id = (presetId || origin) + '-' + Date.now();
    setMessages(m => [...m, { id, question: testo, origin, loading: true, element: elementCtx }]);
    callApi(id, testo, origin, elementCtx);
  };

  const sendCustom = () => {
    const t = customInput.trim();
    if (!t) return;
    ask(t, 'custom');
    setCustomInput('');
  };

  // Auto ask opzionale al mount
  useEffect(() => {
    if (!open) return;
    const token = `${autoQuestionId||''}|${autoCustomQuestionText||''}`;
    if (!token || token === '|' || autoFiredRef.current === token) return;
    autoFiredRef.current = token;
    if (autoQuestionId) {
      const q = baseSuggestions.find(q => q.id === autoQuestionId);
      if (q) ask(q.testo, 'suggested', q.id, q.element);
    } else if (autoCustomQuestionText) {
      ask(autoCustomQuestionText, 'custom');
    }
  }, [open, autoQuestionId, autoCustomQuestionText, baseSuggestions]);

  return (
    <div className={`fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[400px] md:w-[460px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
        <div className="flex items-center gap-2 overflow-hidden pr-4 flex-1 min-w-0">
          <SparklesIcon className="w-5 h-5 flex-shrink-0" />
          <h3 className="text-sm font-semibold tracking-wide truncate" title={gemTitle || 'Chat'}>
            {gemTitle || 'Chat'}
          </h3>
        </div>
        <button onClick={() => setOpen(o=>!o)} className="text-white/80 hover:text-white text-sm font-medium flex-shrink-0">
          {open ? 'Chiudi' : 'Apri'}
        </button>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Suggerimenti dinamici sezione */}
        {dynamicSuggestions.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Domande per la Sezione</p>
            <div className="flex flex-wrap gap-2">
              {dynamicSuggestions.map(q => (
                <button key={q.id} onClick={() => ask(q.testo,'suggested', q.id, q.element)} className="px-2.5 py-1.5 rounded-full text-xs bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 dark:border-indigo-500/30 transition">{q.testo}</button>
              ))}
              <button onClick={()=> setDynamicSuggestions([])} className="px-2 py-1.5 text-[10px] uppercase tracking-wide bg-slate-200/70 dark:bg-slate-700/60 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md text-slate-600 dark:text-slate-300">Nascondi</button>
            </div>
          </div>
        )}
        {/* Suggerimenti generali */}
        {baseSuggestions.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Domande Generali</p>
            <div className="flex flex-wrap gap-2">
              {baseSuggestions.map(q => (
                <button key={q.id} onClick={() => ask(q.testo,'suggested', q.id, q.element)} className="px-2.5 py-1.5 rounded-full text-xs bg-violet-600/10 hover:bg-violet-600/20 text-violet-700 dark:text-violet-300 border border-violet-400/40 dark:border-violet-500/30 transition">{q.testo}</button>
              ))}
            </div>
          </div>
        )}
        {/* Conversazione */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Seleziona una domanda suggerita oppure scrivine una tu.</p>
          )}
          {messages.map(m => (
            <div key={m.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 shadow-sm">
              <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{m.question}</p>
              {m.loading && (
                <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500">
                  <SparklesIcon className="w-4 h-4 animate-pulse text-indigo-400" />
                  <span>Generazione risposta...</span>
                </div>
              )}
              {m.error && <p className="mt-2 text-[12px] text-red-500">{m.error}</p>}
              {m.answer && <p className="mt-2 text-[12px] leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">{m.answer}</p>}
              {m.element && (
                <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Contesto: {m.element.name}{typeof m.element.index==='number' ? ' #' + (m.element.index+1) : ''}</p>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex gap-2">
            <input
              id="curiow-chat-input"
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              placeholder="Scrivi una domanda..."
              className="flex-1 px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              onKeyDown={e => { if (e.key === 'Enter') sendCustom(); }}
            />
            <button
              onClick={sendCustom}
              disabled={!customInput.trim()}
              className="px-4 py-2 rounded-md bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium hover:bg-indigo-700 transition"
            >Invia</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionQuestionsChat;
