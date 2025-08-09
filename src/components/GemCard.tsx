import React from 'react';
import { Gem } from '../types';
import { HeartIcon, ShareIcon, TagIcon } from './icons';

interface GemCardProps {
  gem: Gem;
  isLoggedIn: boolean;
  isFavorite: boolean;
  onSaveRequest: (gemId: string) => void;
  onSelect: (gemId: string) => void;
  onLoginRequest: () => void;
}

const GemCard: React.FC<GemCardProps> = ({ gem, isLoggedIn, isFavorite, onSaveRequest, onSelect, onLoginRequest }) => {

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
        onSaveRequest(gem.id);
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

  return (
    <div 
        onClick={handleCardClick}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden snap-center group transition-transform duration-200 ease-in-out hover:scale-105 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`Vedi dettagli per: ${gem.title}`}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
    >
      <img src={gem.imageUrl} alt={gem.title} className="w-full h-auto object-cover aspect-[3/4]" />
      
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