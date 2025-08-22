import React, { useState, useEffect, useRef } from 'react';
import { callCuriowApi } from '../services/apiService';
import { LightBulbIcon, SparklesIcon } from './icons';

export interface SectionQuestionData {
  id: string;
  testo: string;
  tipologia?: string;
}

interface SectionQuestionsChatProps {
  gemId: string;
  elementName: string; // es: 'step','myth','reality','evidence','why_it_matters','general','payoff'
  elementIndex?: number; // per step
  questions: SectionQuestionData[];
  buttonSize?: 'sm' | 'md';
  align?: 'left' | 'right';
  hideTrigger?: boolean; // se true non mostra l'icona, usato per generale
  externalOpen?: boolean; // stato controllato esterno
  onOpenChange?: (open: boolean) => void;
  autoQuestionId?: string; // domanda pre-selezionata da chiedere all'apertura
  autoCustomQuestionText?: string; // testo custom da chiedere all'apertura
}

interface QAState {
  loading: boolean;
  answer?: string;
  error?: string;
}

const SectionQuestionsChat: React.FC<SectionQuestionsChatProps> = ({
  gemId,
  elementName,
  elementIndex = 0,
  questions,
  buttonSize='sm',
  align='right',
  hideTrigger=false,
  externalOpen,
  onOpenChange,
  autoQuestionId,
  autoCustomQuestionText
}) => {
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? !!externalOpen : internalOpen;
  const [answers, setAnswers] = useState<Record<string, QAState>>({});
  const [customInput, setCustomInput] = useState('');
  const [customHistory, setCustomHistory] = useState<{ id: string; question: string; answer?: string; loading: boolean; error?: string }[]>([]);
  const autoFiredRef = useRef<string | null>(null);

  if (!questions || questions.length === 0) {
    return hideTrigger ? null : (
      <div className={align==='right'? 'float-right' : ''}></div>
    );
  }

  const triggerClasses = buttonSize === 'sm'
    ? 'w-8 h-8'
    : 'w-10 h-10';

  const setOpen = (val: boolean) => {
    if (isControlled) {
      onOpenChange && onOpenChange(val);
    } else {
      setInternalOpen(val);
    }
  };

  const ask = async (q: { id: string; testo: string }, isCustom = false) => {
    const qid = q.id;
    if (!isCustom) {
      setAnswers(prev => ({ ...prev, [qid]: { ...(prev[qid]||{}), loading: !prev[qid]?.answer, error: undefined } }));
      if (answers[qid]?.answer) {
        return; // già disponibile
      }
    } else {
      setCustomHistory(h => h.map(item => item.id === qid ? { ...item, loading: true, error: undefined } : item));
    }
    try {
      const body: any = {
        apitype: 'deep-question',
        gemId,
        questionId: isCustom ? '' : qid,
        questionText: q.testo,
        element: { name: elementName, index: elementIndex }
      };
      const resp = await callCuriowApi(body);
      const answer = resp.answer || resp.result || resp.text || JSON.stringify(resp);
      if (!isCustom) {
        setAnswers(prev => ({ ...prev, [qid]: { loading: false, answer } }));
      } else {
        setCustomHistory(h => h.map(item => item.id === qid ? { ...item, loading: false, answer } : item));
      }
    } catch (e: any) {
      const msg = e.message || 'Errore';
      if (!isCustom) {
        setAnswers(prev => ({ ...prev, [qid]: { loading: false, error: msg } }));
      } else {
        setCustomHistory(h => h.map(item => item.id === qid ? { ...item, loading: false, error: msg } : item));
      }
    }
  };

  const sendCustom = () => {
    const text = customInput.trim();
    if (!text) return;
    const id = 'custom-' + Date.now();
    setCustomHistory(h => [...h, { id, question: text, loading: true }]);
    setCustomInput('');
    ask({ id, testo: text }, true);
  };

  // Auto ask quando si apre
  useEffect(() => {
    if (!open) return;
    const token = `${autoQuestionId||''}|${autoCustomQuestionText||''}`;
    if (!token || token === '|' || autoFiredRef.current === token) return;
    autoFiredRef.current = token;
    if (autoQuestionId) {
      const q = questions.find(q => q.id === autoQuestionId);
      if (q) ask(q, false);
    } else if (autoCustomQuestionText) {
      const id = 'auto-custom-'+Date.now();
      setCustomHistory(h => [...h, { id, question: autoCustomQuestionText, loading: true }]);
      ask({ id, testo: autoCustomQuestionText }, true);
    }
  }, [open, autoQuestionId, autoCustomQuestionText, questions]);

  const panel = open && (
    <div className={`absolute z-30 mt-2 w-80 max-w-[85vw] ${align==='right' ? 'right-0' : 'left-0'} origin-top-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 text-slate-700 dark:text-slate-200 animate-fade-in`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Approfondisci</h4>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm">✕</button>
      </div>
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
        {questions.map(q => {
          const st = answers[q.id];
          return (
            <div key={q.id} className="border border-slate-200 dark:border-slate-700 rounded-md p-2 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => ask(q)}
                className="text-left w-full text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:underline"
              >{q.testo}</button>
              {st?.loading && <p className="mt-1 text-[11px] italic text-slate-500 animate-pulse">Caricamento risposta...</p>}
              {st?.error && <p className="mt-1 text-[11px] text-red-500">{st.error}</p>}
              {st?.answer && <p className="mt-1 text-[11px] whitespace-pre-wrap leading-relaxed">{st.answer}</p>}
            </div>
          );
        })}
        {customHistory.map(item => (
          <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-md p-2 bg-slate-50 dark:bg-slate-800/30">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{item.question}</p>
            {item.loading && <p className="mt-1 text-[11px] italic text-slate-500 animate-pulse">Caricamento...</p>}
            {item.error && <p className="mt-1 text-[11px] text-red-500">{item.error}</p>}
            {item.answer && <p className="mt-1 text-[11px] whitespace-pre-wrap leading-relaxed">{item.answer}</p>}
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            placeholder="Fai una domanda..."
            className="flex-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            onKeyDown={e => { if (e.key === 'Enter') sendCustom(); }}
          />
          <button
            onClick={sendCustom}
            disabled={!customInput.trim()}
            className="px-2.5 py-1.5 rounded-md bg-indigo-600 disabled:opacity-40 text-white text-xs hover:bg-indigo-700 transition"
          >Invia</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative inline-block ${align === 'right' ? 'float-right' : ''}`}>
      {!hideTrigger && (
        <button
          type="button"
            onClick={() => setOpen(!open)}
          className={`group ${triggerClasses} rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400`}
          title="Domande / Approfondisci"
        >
          <SparklesIcon className={`w-4 h-4 ${open ? 'animate-pulse' : ''}`} />
        </button>
      )}
      {panel}
    </div>
  );
};

export default SectionQuestionsChat;
