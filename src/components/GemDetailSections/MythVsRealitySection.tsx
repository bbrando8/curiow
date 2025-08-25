import React from 'react';
import { SparklesIcon } from '../icons';

const MythVsRealitySection = ({ content, getSectionQuestions, generalQuestions }: any) => {
  const openChat = (section: string, qs: any[]) => {
    const enriched = qs.map(q => {
      switch(section){
        case 'myth': return { ...q, element: { name: section, title: 'Mito', test: content.myth || null } };
        case 'reality': return { ...q, element: { name: section, title: 'Realtà', test: content.reality || null } };
        case 'evidence': return { ...q, element: { name: section, title: 'Evidenze', test: content.evidence || null } };
        case 'why_it_matters': return { ...q, element: { name: section, title: 'Perché conta', test: content.why_it_matters || null } };
        default: return { ...q, element: { name: section } };
      }
    });
    const generalEnriched = generalQuestions.map(q => ({...q, element: { name: 'general', title: null, test: null }}));
    const allQuestions = [...enriched, ...generalEnriched];
    window.dispatchEvent(new CustomEvent('curiow-chat-open', { detail: { questions: allQuestions } }));
  };
  return (
    <div className="mt-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 relative">
          {getSectionQuestions('myth').length > 0 && (
            <button
              onClick={() => openChat('myth', getSectionQuestions('myth'))}
              title="Domande / Approfondisci"
              className="absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
            >
              <SparklesIcon className="w-4 h-4" />
            </button>
          )}
          <p className="text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">Mito</p>
          <p className="mt-2 text-rose-800 dark:text-rose-200 font-medium leading-relaxed whitespace-pre-wrap">{content.myth}</p>
        </div>
        <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 relative overflow-hidden">
          {getSectionQuestions('reality').length > 0 && (
            <button
              onClick={() => openChat('reality', getSectionQuestions('reality'))}
              title="Domande / Approfondisci"
              className="absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
            >
              <SparklesIcon className="w-4 h-4" />
            </button>
          )}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.15),transparent_60%)]"/>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Realtà</p>
          <p className="mt-2 text-emerald-800 dark:text-emerald-200 font-medium leading-relaxed whitespace-pre-wrap">{content.reality}</p>
        </div>
      </div>
      {content.evidence && (
        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative">
          {getSectionQuestions('evidence').length > 0 && (
            <button
              onClick={() => openChat('evidence', getSectionQuestions('evidence'))}
              title="Domande / Approfondisci"
              className="absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
            >
              <SparklesIcon className="w-4 h-4" />
            </button>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Evidenze</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{content.evidence}</p>
        </div>
      )}
      {content.why_it_matters && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 border border-indigo-300/30 dark:border-indigo-300/20 relative">
          {getSectionQuestions('why_it_matters').length > 0 && (
            <button
              onClick={() => openChat('why_it_matters', getSectionQuestions('why_it_matters'))}
              title="Domande / Approfondisci"
              className="absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
            >
              <SparklesIcon className="w-4 h-4" />
            </button>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Perché conta</p>
          <p className="mt-2 font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">{content.why_it_matters}</p>
        </div>
      )}
    </div>
  );
};

export default MythVsRealitySection;

