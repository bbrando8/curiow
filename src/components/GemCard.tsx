import React from 'react';
import { Gem } from '../types';
import { HeartIcon, ShareIcon, TagIcon, ChevronDownIcon, SparklesIcon, FacebookIcon, InstagramIcon, WhatsappIcon, MailIcon, CopyIcon } from './icons';
import { trackEvent } from '../services/firebase';

interface GemCardProps {
  gem: Gem;
  isLoggedIn: boolean;
  isFavorite: boolean;
  onSaveRequest: (gemId: string) => void;
  onRemoveRequest: (gemId: string) => void;
  onSelect: (gemId: string) => void;
  onLoginRequest: () => void;
  onView?: () => void; // Nuova prop per tracciare le visualizzazioni
  onTagClick?: (tag: string) => void; // opzionale: click su tag per filtrare/ricercare
}

const GemCard: React.FC<GemCardProps> = ({ gem, isLoggedIn, isFavorite, onSaveRequest, onRemoveRequest, onSelect, onLoginRequest, onView, onTagClick }) => {

  const [showShareBar, setShowShareBar] = React.useState(false);
  const handleCardClick = () => {
    if (!isLoggedIn) {
      onLoginRequest();
    } else {
      onSelect(gem.id);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
        onLoginRequest();
    } else {
        if (isFavorite) {
          onRemoveRequest(gem.id);
        } else {
          onSaveRequest(gem.id);
        }
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareBar(v => { const nv = !v; trackEvent('share_bar_toggle', { open: nv, gem_id: gem.id, context: 'card' }); return nv; });
  };

  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/gem/${gem.id}` : '';
  const shareText = `Scopri questa gemma su Curiow: ${gem.title}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + currentUrl)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent('Consiglio: ' + gem.title)}&body=${encodeURIComponent(shareText + '\n' + currentUrl)}`;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(currentUrl).catch(()=>{});
    trackEvent('share', { channel: 'copy_link', gem_id: gem.id, context: 'card' });
    alert('Link copiato!');
  };

  const handleInstagram = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(currentUrl).catch(()=>{});
    trackEvent('share', { channel: 'instagram_copy', gem_id: gem.id, context: 'card' });
    alert('Link copiato! Apri Instagram e incolla nella tua story/post.');
  };

  const [showSummary, setShowSummary] = React.useState(false); // controllo manuale (click)
  const [isHovering, setIsHovering] = React.useState(false); // stato hover
  const [canHover, setCanHover] = React.useState(false);
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
      const update = () => setCanHover(mq.matches);
      update();
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
  }, []);
  const actualOpen = showSummary || (canHover && isHovering);
  const summary = (gem.content as any)?.summary as string | undefined;

  React.useEffect(() => {
    if (onView) {
      onView();
    }
  }, [onView]);

  const [showShareSummary, setShowShareSummary] = React.useState(false); // (non usato, placeholder eventuale)
  const shareWrapperRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!showShareBar) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (!shareWrapperRef.current) return;
      if (shareWrapperRef.current.contains(e.target as Node)) return; // click interno => ignora
      setShowShareBar(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showShareBar]);

  return (
    <div
        onClick={handleCardClick}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg snap-center group transition-transform duration-200 ease-in-out hover:scale-105 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`Vedi dettagli per: ${gem.title}`}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
    >
      <div className="relative overflow-hidden rounded-t-xl">
        {gem.videoUrl ? (
          <video
            src={gem.videoUrl}
            className="w-full h-auto object-cover aspect-[3/4]"
            muted
            loop
            playsInline
            onMouseEnter={(e) => {
              const video = e.target as HTMLVideoElement;
              video.play().catch(() => {});
            }}
            onMouseLeave={(e) => {
              const video = e.target as HTMLVideoElement;
              video.pause();
              video.currentTime = 0;
            }}
            onTouchStart={(e) => {
              const video = e.target as HTMLVideoElement;
              video.play().catch(() => {});
            }}
            onTouchEnd={(e) => {
              const video = e.target as HTMLVideoElement;
              video.pause();
              video.currentTime = 0;
            }}
          />
        ) : (
          <img src={gem.imageUrl} alt={gem.title} className="w-full h-auto object-cover aspect-[3/4]" />
        )}
        {summary && (
          <div className="absolute inset-x-0 bottom-0" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowSummary(s => !s); }}
              className={`w-full text-left group/summary focus:outline-none`}
              aria-expanded={actualOpen}
              aria-controls={`summary-${gem.id}`}
              aria-label={actualOpen ? 'Chiudi sintesi' : 'Apri sintesi'}
            >
              <div className={`relative overflow-hidden transition-all duration-300 ease-out bg-gradient-to-t from-slate-900/90 via-slate-900/70 to-slate-900/20 backdrop-blur-sm text-white ${actualOpen ? 'max-h-60 sm:max-h-72' : 'max-h-16'}`}>
                <div className="p-3 pr-10">
                  <p id={`summary-${gem.id}`} className={`text-xs leading-snug whitespace-pre-line ${actualOpen ? '' : 'line-clamp-2'}`}>{summary}</p>
                </div>
                <div className="absolute right-2 top-2 flex items-center gap-1 text-[10px] uppercase font-semibold opacity-80">
                  <SparklesIcon className="w-4 h-4" />
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${actualOpen ? 'rotate-180' : ''}`} />
                </div>
                <div className="absolute inset-0 ring-1 ring-white/10 rounded-t" />
              </div>
            </button>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{gem.topic}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{gem.title}</h3>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
              <button
                onClick={handleFavoriteClick}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-slate-700 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title={isFavorite ? 'Modifica salvataggio' : 'Salva come preferito'}
                aria-label={isFavorite ? 'Modifica salvataggio' : 'Salva come preferito'}
              >
                  <HeartIcon className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
              <div className="relative" ref={shareWrapperRef}>
                <button
                  onClick={handleShareClick}
                  className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-indigo-100 dark:hover:bg-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                  title="Condividi"
                  aria-label="Condividi gemma"
                >
                    <ShareIcon className="w-6 h-6" />
                </button>
                {showShareBar && (
                  <div
                    className="absolute -top-2 right-0 -translate-y-full z-30 flex gap-1 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700"
                    onClick={e=>e.stopPropagation()}
                  >
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={()=>trackEvent('share',{channel:'facebook', gem_id: gem.id, context:'card'})}
                      aria-label="Facebook"
                      title="Facebook"
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-700 text-[#1877F2] transition-colors"
                    >
                      <FacebookIcon className="w-5 h-5" />
                    </a>
                    <button
                      onClick={handleInstagram}
                      aria-label="Instagram (copia link)"
                      title="Instagram (copia link)"
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-pink-100 dark:hover:bg-pink-700 text-pink-500 transition-colors"
                    >
                      <InstagramIcon className="w-5 h-5" />
                    </button>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={()=>trackEvent('share',{channel:'whatsapp', gem_id: gem.id, context:'card'})}
                      aria-label="WhatsApp"
                      title="WhatsApp"
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-700 text-emerald-500 transition-colors"
                    >
                      <WhatsappIcon className="w-5 h-5" />
                    </a>
                    <a
                      href={emailUrl}
                      onClick={()=>trackEvent('share',{channel:'email', gem_id: gem.id, context:'card'})}
                      aria-label="Email"
                      title="Email"
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-700 text-indigo-500 transition-colors"
                    >
                      <MailIcon className="w-5 h-5" />
                    </a>
                    <button
                      onClick={handleCopyLink}
                      aria-label="Copia link"
                      title="Copia link"
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <CopyIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
          </div>
        </div>
        {gem.tags && gem.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
                <TagIcon className="w-4 h-4 text-slate-400 dark:text-slate-500"/>
                {gem.tags.map(tag => (
                    onTagClick ? (
                      <button
                        key={tag}
                        type="button"
                        onClick={(e)=>{ e.stopPropagation(); onTagClick(tag); }}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-700 text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-200 rounded-full text-xs font-medium transition-colors"
                        aria-label={`Filtra per tag ${tag}`}
                      >{tag}</button>
                    ) : (
                      <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    )
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default GemCard;
