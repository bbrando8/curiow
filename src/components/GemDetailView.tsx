import React, { useState, useEffect, useRef } from 'react';
import { Gem, UserQuestion, User, Filter, Channel } from '../types';
import { ChevronLeftIcon, HeartIcon, ShareIcon, PaperAirplaneIcon, SparklesIcon, PlusCircleIcon, TagIcon, LinkIcon, ChevronDownIcon } from './icons';
import Header from './Header';

interface GemDetailViewProps {
  gem: Gem;
  isFavorite: boolean;
  isLoggedIn: boolean;
  user?: User | null;
  onBack: () => void;
  onSaveRequest: (gemId: string) => void;
  onRemoveRequest: (gemId: string) => void;
  onAddUserQuestion: (gemId: string, question: string) => void;
  onTagSelect: (tag: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (view: 'feed' | 'saved' | 'profile' | 'dashboard' | 'topics') => void;
  selectedFilter?: Filter;
  onSelectFilter?: (filter: Filter) => void;
  channels?: Channel[];
}

const UserQuestionItem: React.FC<{ userQuestion: UserQuestion }> = ({ userQuestion }) => (
    <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">Domanda: <span className="font-normal">{userQuestion.question}</span></p>
        <div className="mt-2 text-sm text-slate-800 dark:text-slate-200">
            {userQuestion.isGenerating ? (
                 <div className="flex items-center space-x-2">
                    <SparklesIcon className="w-4 h-4 animate-pulse text-indigo-400" />
                    <span>Generazione risposta...</span>
                </div>
            ) : (
                <p className="whitespace-pre-wrap">{userQuestion.answer}</p>
            )}
        </div>
    </div>
);

const GemDetailView: React.FC<GemDetailViewProps> = ({ gem, isFavorite, onBack, onSaveRequest, onRemoveRequest, onAddUserQuestion, onTagSelect, isLoggedIn, user, onLogin, onLogout, onNavigate, selectedFilter, onSelectFilter, channels }) => {
  const [userQuestion, setUserQuestion] = useState('');
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Funzione per scrollare il titolo allineandolo appena sotto l'header sticky
  const scrollTitleIntoView = (smooth = false) => {
    const titleEl = document.getElementById('gem-title');
    if (!titleEl) return;
    const headerEl = document.querySelector('header');
    const headerHeight = headerEl ? (headerEl as HTMLElement).offsetHeight : 0;
    const buffer = 8; // piccolo margine
    const target = titleEl.getBoundingClientRect().top + window.scrollY - headerHeight - buffer;
    window.scrollTo({ top: target >= 0 ? target : 0, behavior: smooth ? 'smooth' : 'auto' });
    setHasAutoScrolled(true);
  };

  // Scroll iniziale dopo mount/cambio gem (post layout)
  useEffect(() => {
    setHasAutoScrolled(false);
    // Usa rAF per attendere layout, poi ulteriore timeout breve per carichi asincroni minimi
    requestAnimationFrame(() => {
      scrollTitleIntoView(false);
      setTimeout(() => { if (!hasAutoScrolled) scrollTitleIntoView(false); }, 60);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gem.id]);

  // Se l'immagine carica dopo e non abbiamo ancora auto-scrollato, riallinea
  const handleImageLoad = () => {
    if (!hasAutoScrolled) scrollTitleIntoView(false);
  };

  const handleUserQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userQuestion.trim()) {
      onAddUserQuestion(gem.id, userQuestion.trim());
      setUserQuestion('');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`Scopri questa gemma di conoscenza: "${gem.title}" su Curiow!`);
    alert("Contenuto copiato negli appunti!");
  };

  const handleFilterSelect = (filter: Filter) => {
    if (onSelectFilter) onSelectFilter(filter);
    if (filter.type === 'channel') {
      onNavigate('feed');
    }
  };

  // --- Rendering contenuti template ---
  const renderMiniThread = (content: any) => {
    const steps = Array.isArray(content.steps) ? content.steps : [];
    return (
      <div className="mt-6 space-y-6">
        <div className="space-y-4">
          {steps.map((s: any, idx: number) => (
            <div key={idx} className="relative pl-10">
              <div className="absolute left-0 top-0 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold shadow">{idx+1}</div>
                {idx < steps.length -1 && <div className="flex-1 w-px bg-gradient-to-b from-indigo-400 via-indigo-300 to-transparent mt-1"/>}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{s.title}</h3>
              <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        {content.payoff && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-indigo-500/10 border border-emerald-400/30 dark:border-emerald-400/20">
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

  const renderMythVsReality = (content: any) => {
    return (
      <div className="mt-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">Mito</p>
            <p className="mt-2 text-rose-800 dark:text-rose-200 font-medium leading-relaxed whitespace-pre-wrap">{content.myth}</p>
          </div>
          <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.15),transparent_60%)]"/>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Realtà</p>
            <p className="mt-2 text-emerald-800 dark:text-emerald-200 font-medium leading-relaxed whitespace-pre-wrap">{content.reality}</p>
          </div>
        </div>
        {content.evidence && (
          <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Evidenze</p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{content.evidence}</p>
          </div>
        )}
        {content.why_it_matters && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 border border-indigo-300/30 dark:border-indigo-300/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Perché conta</p>
            <p className="mt-2 font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">{content.why_it_matters}</p>
          </div>
        )}
      </div>
    );
  };

  const renderFactCard = (content: any) => {
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

  const renderProsCons = (content: any) => {
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

  const renderQuickExplainer = (content: any) => {
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

  const renderStructuredContent = () => {
    const content = (gem as any).content;
    if (!content || !content.template) return null;
    switch (content.template) {
      case 'mini_thread':
        return renderMiniThread(content);
      case 'myth_vs_reality':
        return renderMythVsReality(content);
      case 'fact_card':
        return renderFactCard(content);
      case 'pros_cons':
        return renderProsCons(content);
      case 'quick_explainer':
        return renderQuickExplainer(content);
      default:
        return null;
    }
  };
  // --- fine rendering contenuti template ---

  return (
    <div className="max-w-2xl mx-auto">
        <Header
          isLoggedIn={isLoggedIn}
          user={user}
          onLogin={onLogin}
          onLogout={onLogout}
          onNavigate={onNavigate}
          showFilters={true}
          selectedFilter={selectedFilter}
          onSelectFilter={handleFilterSelect}
          channels={channels}
          initialFiltersOpen={false}
          onBack={onBack}
        />
        <article>
            <div className="p-5 sm:p-8">
                {/* Immagine prima */}
                <img ref={imgRef} src={gem.imageUrl} alt={gem.title} onLoad={handleImageLoad} className="w-full h-auto object-cover md:rounded-lg" />
                {/* Titolo sotto immagine (ancora) */}
                <h1 id="gem-title" className="mt-4 text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-tight">{gem.title}</h1>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 items-center">
                    <button
                        onClick={() => isFavorite ? onRemoveRequest(gem.id) : onSaveRequest(gem.id)}
                        className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                        <HeartIcon className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                        <span className="text-sm font-medium">{isFavorite ? 'Rimuovi' : 'Salva'}</span>
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                    >
                        <ShareIcon className="w-6 h-6" />
                        <span className="text-sm font-medium">Condividi</span>
                    </button>
                </div>
                {gem.tags && gem.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 items-center">
                        <TagIcon className="w-5 h-5 text-slate-400 dark:text-slate-500"/>
                        {gem.tags.map(tag => (
                            <button 
                                key={tag} 
                                onClick={() => onTagSelect(tag)}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                {/* Contenuto descrizione o template */}
                {(() => { const structuredContent = renderStructuredContent(); return structuredContent ? structuredContent : (
                  <p className="mt-6 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{gem.description}</p>
                ); })()}

                {/* Fonti */}
                {(() => { const sources = (gem as any).search_results && (gem as any).search_results.length > 0 ? (gem as any).search_results : gem.sources; return sources && sources.length > 0 && (
                    <section className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
                         <button
                            onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                            className="w-full flex justify-between items-center text-left"
                            aria-expanded={isSourcesOpen}
                         >
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                                <LinkIcon className="w-5 h-5 mr-2 text-slate-500"/>
                                Fonti
                            </h2>
                            <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform ${isSourcesOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isSourcesOpen && (
                            <ul className="mt-3 space-y-2">
                                {sources.map((source: any, index: number) => (
                                    <li key={index}>
                                        <a 
                                            href={source.uri} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                                        >
                                        {index+1}. {source.title || source.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                ); })()}
            </div>
        </article>
    </div>
  );
};

export default GemDetailView;
