import React from 'react';

const FactCardSection = ({ content }: any) => {
  const facts: string[] = Array.isArray(content.facts) ? content.facts : [];
  return (
    <div className="mt-6 space-y-5">
      {content.hook && (
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow">
          <p className="text-sm font-semibold tracking-wide uppercase opacity-90">Dato Chiave</p>
          <p className="mt-1 text-lg leading-snug font-bold whitespace-pre-wrap">{content.hook}</p>
        </div>
      )}
      {facts.length > 0 && (
        <div className="grid gap-3">
          {facts.map((f, i) => (
            <div key={i} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex">
              <div className="mr-3 mt-0.5 text-indigo-500 font-semibold text-xs">FACT {i+1}</div>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{f}</p>
            </div>
          ))}
        </div>
      )}
      {content.implication && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Implicazione</p>
          <p className="mt-1 text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">{content.implication}</p>
        </div>
      )}
      {content.action && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Azione</p>
          <p className="mt-1 text-sm font-medium text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap leading-relaxed">{content.action}</p>
        </div>
      )}
    </div>
  );
};

export default FactCardSection;

