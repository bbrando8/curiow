import React from 'react';

const ProsConsSection = ({ content }: any) => {
  const pros: string[] = Array.isArray(content.pros) ? content.pros : [];
  const cons: string[] = Array.isArray(content.cons) ? content.cons : [];
  return (
    <div className="mt-6 space-y-6">
      {content.scenario && (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Scenario</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{content.scenario}</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Pro</p>
          <ul className="mt-2 space-y-2 text-sm text-emerald-900 dark:text-emerald-100">
            {pros.map((p,i)=>(<li key={i} className="flex"><span className="mr-2 text-emerald-500 font-semibold">+</span><span className="flex-1 whitespace-pre-wrap leading-relaxed">{p}</span></li>))}
            {pros.length===0 && <li className="text-emerald-700/70 dark:text-emerald-300/60 italic">Nessun pro indicato.</li>}
          </ul>
        </div>
        <div className="p-5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">Contro</p>
          <ul className="mt-2 space-y-2 text-sm text-rose-900 dark:text-rose-100">
            {cons.map((c,i)=>(<li key={i} className="flex"><span className="mr-2 text-rose-500 font-semibold">-</span><span className="flex-1 whitespace-pre-wrap leading-relaxed">{c}</span></li>))}
            {cons.length===0 && <li className="text-rose-700/70 dark:text-rose-300/60 italic">Nessun contro indicato.</li>}
          </ul>
        </div>
      </div>
      {content.advice && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-emerald-500/10 border border-indigo-300/30 dark:border-indigo-300/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Sintesi / Consiglio</p>
          <p className="mt-2 font-medium text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">{content.advice}</p>
        </div>
      )}
    </div>
  );
};

export default ProsConsSection;

