import React from 'react';
import { SparklesIcon } from '../icons';
import { handleProtectedAction } from '../../utils/gemUtils';

const QuickExplainerSection = ({ content, getSectionQuestions, generalQuestions, isLoggedIn, onLogin }: any) => {
  return (
    <div className="mt-6 space-y-6">
      {content.analogy && (
        <div className="p-5 rounded-xl bg-indigo-600 text-white shadow relative">
          {getSectionQuestions && getSectionQuestions('analogy').length > 0 && (
            <button
              onClick={() => handleProtectedAction(isLoggedIn, onLogin, () => {
                const qs = getSectionQuestions('analogy');
                const enriched = qs.map(q => ({ ...q, element: { name: 'analogy', title: 'Analogia Guida', test: content.analogy } }));
                const generalEnriched = generalQuestions ? generalQuestions.map(q => ({...q, element: { name: 'general', title: null, test: null }})) : [];
                window.dispatchEvent(new CustomEvent('curiow-chat-open', { detail: { questions: [...enriched, ...generalEnriched] } }));
              })}
              title="Domande / Approfondisci"
              className="absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
            >
              <SparklesIcon className="w-4 h-4" />
            </button>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Analogia Guida</p>
          <p className="mt-2 text-lg font-bold leading-snug whitespace-pre-wrap">{content.analogy}</p>
        </div>
      )}
      {content.definition && (
        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative">
          {getSectionQuestions && getSectionQuestions('definition').length > 0 && (
            <button
              onClick={() => handleProtectedAction(isLoggedIn, onLogin, () => {
                const qs = getSectionQuestions('definition');
                const enriched = qs.map(q => ({ ...q, element: { name: 'definition', title: 'Definizione', test: content.definition } }));
                const generalEnriched = generalQuestions ? generalQuestions.map(q => ({...q, element: { name: 'general', title: null, test: null }})) : [];
                window.dispatchEvent(new CustomEvent('curiow-chat-open', { detail: { questions: [...enriched, ...generalEnriched] } }));
              })}
              title="Domande / Approfondisci"
              className="absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
            >
              <SparklesIcon className="w-4 h-4" />
            </button>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Definizione</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{content.definition}</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {content.example && (
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 relative">
            {getSectionQuestions && getSectionQuestions('example').length > 0 && (
              <button
                onClick={() => handleProtectedAction(isLoggedIn, onLogin, () => {
                  const qs = getSectionQuestions('example');
                  const enriched = qs.map(q => ({ ...q, element: { name: 'example', title: 'Esempio', test: content.example } }));
                  const generalEnriched = generalQuestions ? generalQuestions.map(q => ({...q, element: { name: 'general', title: null, test: null }})) : [];
                  window.dispatchEvent(new CustomEvent('curiow-chat-open', { detail: { questions: [...enriched, ...generalEnriched] } }));
                })}
                title="Domande / Approfondisci"
                className="absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
              >
                <SparklesIcon className="w-4 h-4" />
              </button>
            )}
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Esempio</p>
            <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap leading-relaxed">{content.example}</p>
          </div>
        )}
        {content.anti_example && (
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 relative">
            {getSectionQuestions && getSectionQuestions('anti_example').length > 0 && (
              <button
                onClick={() => handleProtectedAction(isLoggedIn, onLogin, () => {
                  const qs = getSectionQuestions('anti_example');
                  const enriched = qs.map(q => ({ ...q, element: { name: 'anti_example', title: 'Non È Questo', test: content.anti_example } }));
                  const generalEnriched = generalQuestions ? generalQuestions.map(q => ({...q, element: { name: 'general', title: null, test: null }})) : [];
                  window.dispatchEvent(new CustomEvent('curiow-chat-open', { detail: { questions: [...enriched, ...generalEnriched] } }));
                })}
                title="Domande / Approfondisci"
                className="absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
              >
                <SparklesIcon className="w-4 h-4" />
              </button>
            )}
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">Non È Questo</p>
            <p className="mt-1 text-sm text-rose-900 dark:text-rose-100 whitespace-pre-wrap leading-relaxed">{content.anti_example}</p>
          </div>
        )}
      </div>
      {content.takeaway && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-indigo-500/10 border border-fuchsia-300/30 dark:border-fuchsia-300/20 relative">
          {getSectionQuestions && getSectionQuestions('takeaway').length > 0 && (
            <button
              onClick={() => handleProtectedAction(isLoggedIn, onLogin, () => {
                const qs = getSectionQuestions('takeaway');
                const enriched = qs.map(q => ({ ...q, element: { name: 'takeaway', title: 'Takeaway', test: content.takeaway } }));
                const generalEnriched = generalQuestions ? generalQuestions.map(q => ({...q, element: { name: 'general', title: null, test: null }})) : [];
                window.dispatchEvent(new CustomEvent('curiow-chat-open', { detail: { questions: [...enriched, ...generalEnriched] } }));
              })}
              title="Domande / Approfondisci"
              className="absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
            >
              <SparklesIcon className="w-4 h-4" />
            </button>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-300">Takeaway</p>
          <p className="mt-2 font-medium text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">{content.takeaway}</p>
        </div>
      )}
    </div>
  );
};

export default QuickExplainerSection;
