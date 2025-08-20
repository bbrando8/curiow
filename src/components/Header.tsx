import React, { useState, useRef, useEffect } from 'react';
import { User, Filter, Channel } from '../types';
import { SparklesIcon, UserCircleIcon, BookmarkSquareIcon, Cog6ToothIcon, ChevronDownIcon, ChevronLeftIcon } from './icons';
import { useUserPermissions } from '../services/roleService';

interface HeaderProps {
  isLoggedIn: boolean;
  user?: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate?: (view: 'feed' | 'saved' | 'profile' | 'dashboard' | 'topics') => void;
  showFilters?: boolean;
  selectedFilter?: Filter;
  onSelectFilter?: (filter: Filter) => void;
  channels?: Channel[];
  initialFiltersOpen?: boolean; // ignorato: menu parte sempre chiuso ora
  onBack?: () => void; // nuovo per GemDetailView
}

const Header: React.FC<HeaderProps> = ({
  isLoggedIn,
  user,
  onLogin,
  onLogout,
  onNavigate,
  showFilters = false,
  selectedFilter,
  onSelectFilter,
  channels,
  onBack,
  // initialFiltersOpen // non usato
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fadeState, setFadeState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const permissions = useUserPermissions(user);

  const openFilters = () => {
    if (fadeState === 'open' || fadeState === 'opening') return;
    setFiltersOpen(true);
    setFadeState('opening');
    requestAnimationFrame(() => setFadeState('open'));
  };
  const startCloseFilters = () => {
    if (fadeState === 'closing' || fadeState === 'closed') return;
    setFadeState('closing');
    setTimeout(() => {
      setFadeState('closed');
      setFiltersOpen(false);
    }, 160); // durata animazione leggermente > 150ms
  };
  const toggleFilters = () => {
    if (fadeState === 'closed') openFilters(); else startCloseFilters();
  };
  const closeFilters = () => startCloseFilters();

  // Gestione click fuori per menu profilo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (fadeState !== 'closed' && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // se clic fuori dal pannello e non sul bottone toggle, chiudi
        const toggleBtn = document.getElementById('toggle-canali-btn');
        if (toggleBtn && toggleBtn.contains(event.target as Node)) return;
        closeFilters();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fadeState]);

  // Chiudi con ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowProfileMenu(false); closeFilters(); } };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleMenuItemClick = (view: 'profile' | 'dashboard' | 'saved' | 'feed') => {
    setShowProfileMenu(false);
    if (onNavigate) onNavigate(view);
  };

  const getButtonClass = (filter: Filter) => {
    const baseClass = 'px-3 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 focus:ring-indigo-500 whitespace-nowrap';

    const isActive = selectedFilter && (
      (filter.type === 'all' && selectedFilter.type === 'all') ||
      (filter.type === 'favorites' && selectedFilter.type === 'favorites') ||
      (filter.type === 'channel' && selectedFilter.type === 'channel' && filter.value === selectedFilter.value) ||
      (filter.type === 'topic' && selectedFilter.type === 'topic' && filter.value === selectedFilter.value)
    );

    if (isActive) {
      return `${baseClass} bg-indigo-600 text-white shadow-sm`;
    }
    return `${baseClass} bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600`;
  };

  const selectedFilterLabel = (() => {
    if (!selectedFilter) return '';
    switch (selectedFilter.type) {
      case 'all': return 'Tutti';
      case 'favorites': return '♥ Preferiti';
      case 'channel': {
        const ch = channels?.find(c => c.id === selectedFilter.value);
        return ch ? ch.name : 'Channel';
      }
      case 'topic': return selectedFilter.value || 'Topic';
      case 'tag': return selectedFilter.value || 'Tag';
      default: return '';
    }
  })();

  const handleSelectAndClose = (filter: Filter) => {
    if (onSelectFilter) onSelectFilter(filter);
    closeFilters();
  };

  const isPanelVisible = fadeState !== 'closed';
  const panelAnimationClasses =
    fadeState === 'opening' ? 'opacity-0 -translate-y-1 scale-95' :
    fadeState === 'open' ? 'opacity-100 translate-y-0 scale-100' :
    fadeState === 'closing' ? 'opacity-0 -translate-y-1 scale-95' : '';

  return (
    <>
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button
                onClick={() => onNavigate && onNavigate('feed')}
                className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <SparklesIcon className="w-8 h-8" />
                <span className="text-xl font-bold">Curiow</span>
              </button>
            </div>
            {/* Azioni utente */}
            <div className="flex items-center space-x-3">
              {isLoggedIn ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowProfileMenu(p => !p)}
                    className="flex items-center space-x-2 p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Menu profilo"
                  >
                    <UserCircleIcon className="w-8 h-8" />
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-40">
                      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-full">{user?.name || user?.email || 'Utente'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-full">{user?.email}</p>
                      </div>
                      <button onClick={() => handleMenuItemClick('saved')} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <BookmarkSquareIcon className="w-4 h-4 mr-3" /> Salvati
                      </button>
                      <button onClick={() => handleMenuItemClick('profile')} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <UserCircleIcon className="w-4 h-4 mr-3" /> Profilo
                      </button>
                      {permissions.canManageContent && (
                        <button onClick={() => handleMenuItemClick('dashboard')} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                          <Cog6ToothIcon className="w-4 h-4 mr-3" /> Admin
                        </button>
                      )}
                      <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-1">
                        <button onClick={onLogout} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={onLogin} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">Accedi</button>
              )}
            </div>
          </div>
          {showFilters && onSelectFilter && (
            <div className="relative py-2">
              <div className="flex items-center gap-2">
                {onBack && (
                  <button
                    onClick={onBack}
                    aria-label="Torna indietro"
                    className="shrink-0 w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-xl md:rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                )}
                <button
                  id="toggle-canali-btn"
                  onClick={toggleFilters}
                  aria-expanded={fadeState === 'open' || fadeState === 'opening'}
                  aria-controls="canali-panel"
                  className="w-full px-4 py-2 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${(fadeState === 'open' || fadeState === 'opening') ? 'rotate-180' : ''}`} />
                  <span>Canali</span>
                  {fadeState === 'closed' && selectedFilterLabel && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200 shadow-sm">
                      {selectedFilterLabel}
                    </span>
                  )}
                </button>
              </div>
              {isPanelVisible && (
                <div
                  id="canali-panel"
                  ref={dropdownRef}
                  className="absolute left-0 right-0 mt-2 z-40"
                >
                  <div className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-4 transition-all duration-150 ease-out origin-top ${panelAnimationClasses}`}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Canali</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-56 overflow-auto pr-1">
                      <button onClick={() => handleSelectAndClose({ type: 'all' })} className={getButtonClass({ type: 'all' })}>Tutti</button>
                      {isLoggedIn && (
                        <button onClick={() => handleSelectAndClose({ type: 'favorites' })} className={getButtonClass({ type: 'favorites' })}>♥ Preferiti</button>
                      )}
                      {channels && channels.map(channel => (
                        <button
                          key={channel.id}
                          onClick={() => handleSelectAndClose({ type: 'channel', value: channel.id })}
                          className={getButtonClass({ type: 'channel', value: channel.id })}
                        >
                          {channel.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
