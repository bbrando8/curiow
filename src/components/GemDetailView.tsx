import React, { useState, useEffect, useRef } from 'react';
import { Gem, UserQuestion, User, Filter, Channel } from '../types';
import { ChevronLeftIcon, HeartIcon, ShareIcon, PaperAirplaneIcon, SparklesIcon, PlusCircleIcon, TagIcon, LinkIcon, ChevronDownIcon, LightBulbIcon, BookOpenIcon, FacebookIcon, InstagramIcon, WhatsappIcon, MailIcon, CopyIcon, MagnifyingGlassIcon, TrashIcon } from './icons';
import { trackEvent, getIdToken } from '../services/firebase';
import { usePageMeta } from '../hooks/usePageMeta';
import Header from './Header';
import { fetchGeneratedQuestionsByGem, fetchDeepTopicSessions, DeepTopicSession, deleteDeepTopicSession, getSessionTitle } from '../services/firestoreService';
import AdminConfirmationModal from './admin/AdminConfirmationModal';
import SectionQuestionsChat from './SectionQuestionsChat';

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
  currentUserId?: string; // nuovo per sessioni approfondimenti
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

const GemDetailView: React.FC<GemDetailViewProps> = ({ gem, isFavorite, onBack, onSaveRequest, onRemoveRequest, onAddUserQuestion, onTagSelect, isLoggedIn, user, onLogin, onLogout, onNavigate, selectedFilter, onSelectFilter, channels, currentUserId }) => {
  const [userQuestion, setUserQuestion] = useState('');
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // nuovo stato per tab
  const [activeTab, setActiveTab] = useState<'tips' | 'saggio' | 'approfondimenti'>('tips');
  // stato per chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  // refs per animazione cross-fade
  const tipsRef = useRef<HTMLDivElement | null>(null);
  const saggioRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [showShareBar, setShowShareBar] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<(any)[]>([]);
  const [deepSessions, setDeepSessions] = useState<DeepTopicSession[]>([]);
  const [currentChatSessionId, setCurrentChatSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionTitles, setSessionTitles] = useState<Record<string,string>>({});
  const [pendingSessionsRefresh, setPendingSessionsRefresh] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false); // nuovo per evitare loop su 0 risultati
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<DeepTopicSession | null>(null);
  // RIMOSSI stati vecchia chat generale
  // const [generalChatOpen, setGeneralChatOpen] = useState(false);
  // const [generalAutoQId, setGeneralAutoQId] = useState<string | undefined>(undefined);
  // const [generalAutoCustom, setGeneralAutoCustom] = useState<string | undefined>(undefined);
  // const [generalCustomInput, setGeneralCustomInput] = useState('');

  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/gem/${gem.id}` : '';
  const rawSummary: string = (gem as any)?.content?.summary || '';
  const rawDescription: string = (gem as any)?.content?.description || '';
  const baseText = rawSummary || rawDescription;
  const descriptionSnippet = baseText ? baseText.replace(/\s+/g,' ').slice(0,180) : 'Gemme di conoscenza su Curiow.';
  const shareText = `Scopri questa gemma su Curiow: ${gem.title}`;

  usePageMeta({
    title: `${gem.title} | Curiow`,
    description: descriptionSnippet,
    image: gem.imageUrl,
    url: currentUrl,
    type: 'article'
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
    } catch {
      const tmp = document.createElement('input');
      tmp.value = currentUrl; document.body.appendChild(tmp); tmp.select(); document.execCommand('copy'); document.body.removeChild(tmp);
    }
    trackEvent('share', { channel: 'copy_link', gem_id: gem.id });
    alert('Link copiato!');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      trackEvent('share_attempt', { channel: 'web_share', gem_id: gem.id });
      try {
        await navigator.share({ title: gem.title, text: shareText, url: currentUrl });
        trackEvent('share', { channel: 'web_share', gem_id: gem.id });
      } catch { /* annullato */ }
    } else {
      handleCopyLink();
    }
  };

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + currentUrl)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent('Consiglio: ' + gem.title)}&body=${encodeURIComponent(shareText + '\n' + currentUrl)}`;
  // Instagram non ha share URL web: fallback copia link

  // funzione misura altezza contenuto attivo
  const measureActiveHeight = () => {
    const el = activeTab === 'tips' ? tipsRef.current : saggioRef.current;
    if (el) {
      // usa scrollHeight per includere overflow
      const h = el.scrollHeight;
      setContentHeight(h);
    }
  };

  useEffect(() => {
    // misura dopo cambio tab / gem
    requestAnimationFrame(() => measureActiveHeight());
  }, [activeTab, gem.id]);

  useEffect(() => {
    // misura al resize per mantenere altezza coerente
    const onResize = () => measureActiveHeight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  useEffect(()=>{
    let mounted = true;
    fetchGeneratedQuestionsByGem(gem.id).then(qs=>{ if(mounted){ setGeneratedQuestions(qs); } }).catch(e=>console.error('Err fetch questions', e));
    return ()=>{ mounted=false; };
  },[gem.id]);

  // Funzioni domande per sezione
  const getSectionQuestions = (section: string, stepIndex?: number) => {
    return generatedQuestions.filter(q => q.section === section && (section !== 'step' || q.stepIndex === stepIndex)).slice(0,3);
  };
  const generalQuestions = generatedQuestions.filter(q => q.section === 'general').slice(0,3);

  const renderMiniThread = (content: any) => {
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
      // Aggiungi sempre le domande generali alle domande di sezione
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

  const renderMythVsReality = (content: any) => {
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
      // Aggiungi sempre le domande generali alle domande di sezione
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

  // Testo completo del saggio (nuovo: può essere in gem.content.description)
  const fullDescription: string | undefined = (gem as any)?.content?.description;

  // Utility: segmentazione in paragrafi leggibili (solo visualizzazione)
  const buildParagraphs = (text?: string): string[] => {
    if (!text) return [];
    const normalized = text.replace(/\r\n?/g, '\n').trim();
    // Se l'autore ha già usato paragrafi (doppie newline) rispetta quelli
    const explicit = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    if (explicit.length > 1) return explicit;
    // Altrimenti suddividi per punto + spazio + Maiuscola (mantieni il punto)
    const periodSplit = normalized
      // comprime whitespace multiplo a singolo spazio per consistenza
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .split(/(?<=\.)\s+(?=[A-ZÀ-ÖØ-Ý])/)
      .map(s => s.trim())
      .filter(Boolean);
    if (periodSplit.length > 1) return periodSplit;
    // fallback: ritorna intero blocco
    return [normalized];
  };

  const paragraphs = buildParagraphs(fullDescription);

  // Calcolo tempo di lettura (200 wpm medio)
  const readingTime = (() => {
    if (!fullDescription) return null;
    const words = fullDescription.trim().split(/\s+/).filter(Boolean).length;
    const WPM = 200; // media adulti IT
    const minutesFloat = words / WPM;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60);
    const display = minutes < 1 ? `${seconds < 10 ? '~15s' : `${seconds}s`}` : `${minutes} min${minutes === 1 ? '' : ''}${seconds >= 30 && minutes < 10 ? ' +' : ''}`;
    return { words, minutes, seconds, display };
  })();

  useEffect(() => {
    // Log JWT Firebase solo per admin quando si accede al dettaglio di una gemma
    if (user?.role === 'admin') { // confronto stringa per evitare dipendenza aggiuntiva da enum
      getIdToken()
        .then(token => {
          if (token) {
            console.log('[ADMIN][JWT] Firebase ID Token:', token);
          } else {
            console.log('[ADMIN][JWT] Nessun token disponibile.');
          }
        })
        .catch(err => console.warn('[ADMIN][JWT] Errore recupero token:', err));
    }
  }, [user?.role, gem.id]);

  const refreshSessions = async () => {
    if(!currentUserId) return;
    setLoadingSessions(true);
    try {
      const data = await fetchDeepTopicSessions(gem.id, currentUserId, 100);
      setDeepSessions(data);
      const entries = await Promise.all(
        data.map(async s => {
          try { const title = await getSessionTitle(s.sessionId || s.id, currentUserId, gem.id); return [s.sessionId || s.id, title] as [string,string]; } catch { return [s.sessionId || s.id, 'Sessione']; }
        })
      );
      setSessionTitles(prev => ({ ...prev, ...Object.fromEntries(entries) }));
    } catch(e){ console.warn('Err fetch sessions', e);} finally { setLoadingSessions(false); setSessionsLoaded(true); }
  }
  useEffect(()=>{
    const handler = () => {
      if (activeTab === 'approfondimenti') refreshSessions(); else setPendingSessionsRefresh(true);
    };
    window.addEventListener('curiow-chat-refresh-sessions', handler);
    return () => window.removeEventListener('curiow-chat-refresh-sessions', handler);
  }, [currentUserId, gem.id, activeTab]);
  useEffect(()=>{
    if (activeTab === 'approfondimenti') {
      if (!sessionsLoaded && !loadingSessions) {
        refreshSessions();
      } else if (pendingSessionsRefresh && !loadingSessions) {
        setPendingSessionsRefresh(false);
        refreshSessions();
      }
    }
  }, [activeTab, deepSessions.length, loadingSessions, pendingSessionsRefresh, currentUserId, gem.id, sessionsLoaded]);
  useEffect(()=>{
    const handler = (ev: any) => { setCurrentChatSessionId(ev.detail?.sessionId || null); };
    window.addEventListener('curiow-chat-current-session', handler);
    return ()=> window.removeEventListener('curiow-chat-current-session', handler);
  },[]);

  // Gestione apertura chat tramite evento globale
  useEffect(() => {
    const openChatHandler = () => {
      setIsChatOpen(true);
      window.history.pushState({ chat: true, tab: activeTab }, '', '');
    };
    window.addEventListener('curiow-chat-open', openChatHandler);
    window.addEventListener('curiow-chat-use-session', openChatHandler);
    window.addEventListener('curiow-chat-new-session', openChatHandler);
    return () => {
      window.removeEventListener('curiow-chat-open', openChatHandler);
      window.removeEventListener('curiow-chat-use-session', openChatHandler);
      window.removeEventListener('curiow-chat-new-session', openChatHandler);
    };
  }, [activeTab]);

  // Gestione history per chat/tab
  useEffect(() => {
    window.history.replaceState({ chat: isChatOpen, tab: activeTab }, '', '');
  }, []);
  useEffect(() => {
    window.history.pushState({ chat: isChatOpen, tab: activeTab }, '', '');
  }, [isChatOpen, activeTab]);
  useEffect(() => {
    const onPopState = (ev: PopStateEvent) => {
      const state = ev.state || {};
      if (state.chat) {
        setIsChatOpen(true);
      } else if (isChatOpen) {
        setIsChatOpen(false);
      } else if (state.tab && state.tab !== 'tips') {
        setActiveTab('tips');
      } else if (activeTab !== 'tips') {
        setActiveTab('tips');
      } else {
        onBack();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isChatOpen, activeTab, onBack]);

  // Funzione di apertura chat
  const handleOpenChat = () => {
    setIsChatOpen(true);
    window.history.pushState({ chat: true, tab: activeTab }, '', '');
  };

  // Funzione di chiusura chat
  const handleCloseChat = () => {
    setIsChatOpen(false);
    window.history.pushState({ chat: false, tab: activeTab }, '', '');
  };

  // Logica di back personalizzata
  const handleBack = () => {
    if (isChatOpen) {
      setIsChatOpen(false);
      return;
    }
    if (activeTab !== 'tips') {
      setActiveTab('tips');
      return;
    }
    onBack();
  };

  return (
    <>
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
          onBack={handleBack}
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
                        onClick={()=> setShowShareBar(v=>{const nv=!v; trackEvent('share_bar_toggle',{ open: nv, gem_id: gem.id }); return nv;})}
                        className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                    >
                        <ShareIcon className="w-6 h-6" />
                        <span className="text-sm font-medium">Condividi</span>
                    </button>
                    {navigator.share && (
                      <button
                        onClick={handleNativeShare}
                        className="hidden sm:inline-flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 text-xs"
                      >
                        <span>Share rapido</span>
                      </button>
                    )}
                </div>
                {showShareBar && (
                  <div className="mt-3 flex flex-wrap gap-2 items-center animate-fade-in">
                    <a href={facebookUrl} onClick={()=>trackEvent('share',{channel:'facebook', gem_id: gem.id})} target="_blank" rel="noopener noreferrer" title="Facebook" className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-700 text-[#1877F2] transition-colors" aria-label="Condividi su Facebook">
                      <FacebookIcon className="w-5 h-5" />
                    </a>
                    <button onClick={()=>{handleCopyLink(); trackEvent('share',{channel:'instagram_copy', gem_id: gem.id});}} title="Instagram (copia link)" className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-pink-100 dark:hover:bg-pink-700 text-pink-500 transition-colors" aria-label="Condividi su Instagram (copia link)">
                      <InstagramIcon className="w-5 h-5" />
                    </button>
                    <a href={whatsappUrl} onClick={()=>trackEvent('share',{channel:'whatsapp', gem_id: gem.id})} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-700 text-emerald-500 transition-colors" aria-label="Condividi su WhatsApp">
                      <WhatsappIcon className="w-5 h-5" />
                    </a>
                    <a href={emailUrl} onClick={()=>trackEvent('share',{channel:'email', gem_id: gem.id})} title="Email" className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-700 text-indigo-500 transition-colors" aria-label="Condividi via Email">
                      <MailIcon className="w-5 h-5" />
                    </a>
                    <button onClick={handleCopyLink} title="Copia link" className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors" aria-label="Copia link">
                      <CopyIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}

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

                {/* Tabs Tips / Saggio */}
                <div className="mt-8 flex justify-end">
                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 p-1 shadow-inner ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                    <button
                      onClick={() => setActiveTab('tips')}
                      aria-pressed={activeTab==='tips'}
                      title="Vista Tips (strutturata)"
                      className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 group ${activeTab==='tips' ? 'bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'}`}
                    >
                      <LightBulbIcon className="w-5 h-5" />
                      {activeTab==='tips' && <span className="absolute -bottom-1 h-1 w-4 rounded-full bg-white/70 dark:bg-white/40"/>}
                    </button>
                    <button
                      onClick={() => setActiveTab('saggio')}
                      aria-pressed={activeTab==='saggio'}
                      title="Vista Saggio (testo completo)"
                      className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 group ${activeTab==='saggio' ? 'bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'}`}
                    >
                      <BookOpenIcon className="w-5 h-5" />
                      {activeTab==='saggio' && <span className="absolute -bottom-1 h-1 w-4 rounded-full bg-white/70 dark:bg-white/40"/>}
                    </button>
                    <button
                      onClick={() => setActiveTab('approfondimenti')}
                      aria-pressed={activeTab==='approfondimenti'}
                      title="Vista Approfondimenti (sessioni)"
                      className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 group ${activeTab==='approfondimenti' ? 'bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'}`}
                    >
                      <MagnifyingGlassIcon className="w-5 h-5" />
                      {activeTab==='approfondimenti' && <span className="absolute -bottom-1 h-1 w-4 rounded-full bg-white/70 dark:bg-white/40"/>}
                    </button>
                  </div>
                </div>

                <div className="mt-6 relative" style={{ height: contentHeight ? contentHeight : undefined }}>
                  {/* Pannello Tips */}
                  <div
                    ref={tipsRef}
                    className={`absolute inset-0 transition-opacity duration-400 ease-in-out ${activeTab==='tips' ? 'opacity-100' : 'opacity-0 pointer-events-none'} overflow-visible`}
                  >
                    {(() => { const structuredContent = renderStructuredContent(); return structuredContent ? structuredContent : (
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{fullDescription || ''}</p>
                    ); })()}
                  </div>
                  {/* Pannello Saggio */}
                  <div
                    ref={saggioRef}
                    className={`absolute inset-0 transition-opacity duration-400 ease-in-out ${activeTab==='saggio' ? 'opacity-100' : 'opacity-0 pointer-events-none'} overflow-visible`}
                  >
                    {fullDescription ? (
                      paragraphs.length > 0 ? (
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                          {readingTime && (
                            <div className="mb-6 flex items-center text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 gap-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">⏱ {readingTime.display}</span>
                              <span className="text-slate-400 dark:text-slate-500">{readingTime.words} parole</span>
                            </div>
                          )}
                          {paragraphs.map((p, i) => {
                            const isKey = p.includes(':') || /—/.test(p);
                            return (
                              <p
                                key={i}
                                className={`text-base md:text-lg leading-relaxed md:leading-loose tracking-[0.015em] text-slate-700 dark:text-slate-300 text-justify hyphens-auto break-words mb-5 last:mb-0 ${i===0 ? 'first-letter:text-4xl first-letter:font-semibold first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:leading-[0.9]' : ''} ${isKey ? 'border-l-2 border-indigo-300 dark:border-indigo-500 pl-3 bg-indigo-50/40 dark:bg-indigo-500/5 rounded-sm' : ''}`}
                                style={{ hyphens: 'auto' }}
                              >
                                {p}
                              </p>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{fullDescription}</p>
                      )
                    ) : (
                      <p className="italic text-slate-500 dark:text-slate-400">Nessun testo disponibile.</p>
                    )}
                  </div>
                  {/* Pannello Approfondimenti */}
                  <div className={`absolute inset-0 transition-opacity duration-400 ease-in-out ${activeTab==='approfondimenti' ? 'opacity-100' : 'opacity-0 pointer-events-none'} overflow-auto px-1 py-1`}>
                    {!isLoggedIn && <p className="text-sm text-slate-500 dark:text-slate-400">Accedi per vedere le tue sessioni di approfondimento.</p>}
                    {isLoggedIn && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sessioni Approfondimenti</h3>
                          <div className="flex gap-2">
                            <button onClick={()=>window.dispatchEvent(new CustomEvent('curiow-chat-new-session', {
                              detail: { questions: generalQuestions.map(q => ({...q, element: { name: 'general', title: null, test: null }})) }
                            }))} className="px-2 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Nuova</button>
                            <button onClick={refreshSessions} className="px-2 py-1 text-xs rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600">Refresh</button>
                          </div>
                        </div>
                        {loadingSessions && <p className="text-xs text-slate-500">Caricamento sessioni...</p>}
                        {!loadingSessions && deepSessions.length===0 && sessionsLoaded && <p className="text-xs text-slate-500">Non sono ancora presenti approfondimenti.</p>}
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
                          {deepSessions.map(s => {
                            const modified = (s as any).modifiedAt?.seconds ? new Date((s as any).modifiedAt.seconds*1000) : (s.modifiedAt instanceof Date ? s.modifiedAt : new Date());
                            const titleRaw = sessionTitles[s.sessionId||s.id] || (s as any).firstQuestion || 'Sessione';
                            const title = titleRaw.length > 80 ? titleRaw.slice(0,77)+'…' : titleRaw;
                            const isActive = currentChatSessionId && (currentChatSessionId === (s.sessionId||s.id));
                            return (
                              <li key={s.id} className={`p-3 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer flex items-start gap-3 group ${isActive ? 'bg-indigo-50 dark:bg-slate-800/60' : ''}`}
                                  onClick={()=>window.dispatchEvent(new CustomEvent('curiow-chat-use-session',{ detail:{ sessionId: s.sessionId||s.id }}))}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-2" title={titleRaw}>{title}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Aggiornata: {modified.toLocaleString()}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <button
                                    onClick={(e)=>{ e.stopPropagation(); setSessionToDelete(s); setDeleteModalOpen(true); }}
                                    className="opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-red-600"
                                    title="Elimina sessione"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                  <SparklesIcon className="w-4 h-4 text-indigo-500" />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Le sessioni si aggiornano quando invii nuove domande.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Domande generate */}
                {false && generatedQuestions.length > 0 && (
                  <div className="mt-8">{/* Blocco disattivato - duplicato */}</div>
                )}

                {/* Domande Generali (prima delle fonti) */}
                {false && generalQuestions.length>0 && (
                  <section className="mt-10 border-t border-slate-200 dark:border-slate-700 pt-6 relative space-y-4">
                    {/* Sezione disattivata: ora sidepanel dedicato */}
                  </section>
                )}

                {/* Fonti */}
                {(() => { const sources = (gem as any).search_results && (gem as any).search_results.length > 0 ? (gem as any).search_results : gem.sources; return sources && sources.length > 0 && (
                    <section className="mt-10 border-t border-slate-200 dark:border-slate-700 pt-6">
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
      <SectionQuestionsChat
        gemId={gem.id}
        elementName="general"
        questions={generalQuestions.map(q=>({...q, element:{ name: 'general', index:0, title: null, test: null }}))}
        gemTitle={gem.title}
        gemDescription={rawDescription || rawSummary || ''}
        userId={currentUserId}
        open={isChatOpen}
        onClose={handleCloseChat}
        onOpen={handleOpenChat}
      />
      <AdminConfirmationModal
        isOpen={deleteModalOpen}
        onClose={()=>{ setDeleteModalOpen(false); setSessionToDelete(null); }}
        onConfirm={()=>{ if(sessionToDelete && currentUserId){ deleteDeepTopicSession(sessionToDelete.sessionId||sessionToDelete.id, currentUserId).then(()=>{ if(currentChatSessionId === (sessionToDelete.sessionId||sessionToDelete.id)) { window.dispatchEvent(new CustomEvent('curiow-chat-new-session',{ detail:{ questions: [] }})); } refreshSessions(); }); }}}
        title="Elimina sessione"
        message="Sei sicuro di voler eliminare definitivamente questa sessione di approfondimento? L'operazione non è reversibile."
        actionText="Elimina"
        actionType="danger"
      />
    </>
  );
};

export default GemDetailView;
