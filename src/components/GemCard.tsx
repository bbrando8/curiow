import React from 'react';
import { Gem } from '../types';
import { HeartIcon, ShareIcon, TagIcon, ChevronDownIcon, SparklesIcon } from './icons';

interface GemCardProps {
  gem: Gem;
  isLoggedIn: boolean;
  isFavorite: boolean;
  onSaveRequest: (gemId: string) => void;
  onRemoveRequest: (gemId: string) => void;
  onSelect: (gemId: string) => void;
  onLoginRequest: () => void;
  onView?: () => void; // Nuova prop per tracciare le visualizzazioni
}

const GemCard: React.FC<GemCardProps> = ({ gem, isLoggedIn, isFavorite, onSaveRequest, onRemoveRequest, onSelect, onLoginRequest, onView }) => {

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
    if (!isLoggedIn) {
        onLoginRequest();
    } else {
        navigator.clipboard.writeText(`Scopri questa gemma di conoscenza: "${gem.title}" su Curiow!`);
        alert("Contenuto copiato negli appunti!");
    }
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

  return (
    <div
        onClick={handleCardClick}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden snap-center group transition-transform duration-200 ease-in-out hover:scale-105 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`Vedi dettagli per: ${gem.title}`}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
    >
      <div className="relative">
        <img src={gem.imageUrl} alt={gem.title} className="w-full h-auto object-cover aspect-[3/4]" />
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
              <button
                onClick={handleShareClick}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-indigo-100 dark:hover:bg-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                title="Condividi"
                aria-label="Condividi gemma"
              >
                  <ShareIcon className="w-6 h-6" />
              </button>
          </div>
        </div>
        {gem.tags && gem.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
                <TagIcon className="w-4 h-4 text-slate-400 dark:text-slate-500"/>
                {gem.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium">
                        {tag}
                    </span>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default GemCard;
