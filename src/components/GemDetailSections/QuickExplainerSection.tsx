import React from 'react';

const QuickExplainerSection = ({ content }: any) => {
  return (
    <div className="mt-6 space-y-6">
      {content.analogy && (
        <div className="p-5 rounded-xl bg-indigo-600 text-white shadow">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Analogia Guida</p>
          <p className="mt-2 text-lg font-bold leading-snug whitespace-pre-wrap">{content.analogy}</p>
        </div>
      )}
      {content.definition && (
        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Definizione</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{content.definition}</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {content.example && (
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Esempio</p>
            <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap leading-relaxed">{content.example}</p>
          </div>
        )}
        {content.anti_example && (
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">Non È Questo</p>
            <p className="mt-1 text-sm text-rose-900 dark:text-rose-100 whitespace-pre-wrap leading-relaxed">{content.anti_example}</p>
          </div>
        )}
      </div>
      {content.takeaway && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-indigo-500/10 border border-fuchsia-300/30 dark:border-fuchsia-300/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-300">Takeaway</p>
          <p className="mt-2 font-medium text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">{content.takeaway}</p>
        </div>
      )}
    </div>
  );
};

export default QuickExplainerSection;

