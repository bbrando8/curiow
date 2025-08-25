import React from 'react';
import { SparklesIcon } from '../icons';

const MiniThreadSection = ({ content, getSectionQuestions, generalQuestions }: any) => {
  const steps = Array.isArray(content.steps) ? content.steps : [];
  const openChat = (section: string, index: number | undefined, qs: any[]) => {
    const enriched = qs.map(q => {
      if (section === 'step' && typeof index === 'number') {
        const step = steps[index] || {};
        return { ...q, element: { name: section, index, title: step.title || null, test: step.body || null } };
      }
      if (section === 'payoff') {
        return { ...q, element: { name: section, title: 'Payoff', test: content.payoff || null } };
      }
      return { ...q, element: { name: section } };
    });
    const generalEnriched = generalQuestions.map(q => ({...q, element: { name: 'general', title: null, test: null }}));
    const allQuestions = [...enriched, ...generalEnriched];
    window.dispatchEvent(new CustomEvent('curiow-chat-open', { detail: { questions: allQuestions } }));
  };
  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-4">
        {steps.map((s: any, idx: number) => {
          const qs = getSectionQuestions('step', idx);
          return (
            <div key={idx} className="relative pl-10">
              <div className="absolute left-0 top-0 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold shadow">{idx+1}</div>
                {idx < steps.length -1 && <div className="flex-1 w-px bg-gradient-to-b from-indigo-400 via-indigo-300 to-transparent mt-1"/>}
              </div>
              {qs.length > 0 && (
                <button
                  onClick={() => openChat('step', idx, qs)}
                  title="Domande / Approfondisci"
                  className="absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
                >
                  <SparklesIcon className="w-4 h-4" />
                </button>
              )}
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{s.title}</h3>
              <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{s.body}</p>
            </div>
          );
        })}
      </div>
      {content.payoff && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-indigo-500/10 border border-emerald-400/30 dark:border-emerald-400/20 relative">
          {getSectionQuestions('payoff').length > 0 && (
            <button
              onClick={() => openChat('payoff', undefined, getSectionQuestions('payoff'))}
              title="Domande / Approfondisci"
              className="absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/90 hover:bg-indigo-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
            >
              <SparklesIcon className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-start">
            <SparklesIcon className="w-6 h-6 text-emerald-500 mr-3 mt-0.5"/>
            <div>
              <p className="text-sm uppercase tracking-wide font-semibold text-emerald-600 dark:text-emerald-400">Payoff</p>
              <p className="mt-1 font-medium text-slate-900 dark:text-slate-100 leading-relaxed">{content.payoff}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniThreadSection;

