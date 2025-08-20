import React, { useState, useRef, useEffect } from 'react';
import { User, Filter, Channel } from '../types';
import { SparklesIcon, UserCircleIcon, BookmarkSquareIcon, Cog6ToothIcon, ChevronDownIcon, TagIcon } from './icons';
import { useUserPermissions } from '../services/roleService';
import { TOPICS } from '../constants';

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
  channels
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const permissions = useUserPermissions(user);

  // Chiudi il menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMenuItemClick = (view: 'profile' | 'dashboard' | 'saved' | 'feed') => {
    setShowProfileMenu(false);
    if (onNavigate) {
      onNavigate(view);
    }
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

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700/50">
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

            {/* User Actions */}
            <div className="flex items-center space-x-3">
              {isLoggedIn ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Menu profilo"
                  >
                    <UserCircleIcon className="w-8 h-8" />
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-30">
                      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-full">
                          {user?.name || user?.email || 'Utente'}
                        </p>
                        <p className="text-xs text-slate-500 truncate dark:text-slate-400 truncate max-w-full">{user?.email}</p>
                      </div>

                      <button
                        onClick={() => handleMenuItemClick('saved')}
                        className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <BookmarkSquareIcon className="w-4 h-4 mr-3" />
                        Salvati
                      </button>

                      <button
                        onClick={() => handleMenuItemClick('profile')}
                        className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <UserCircleIcon className="w-4 h-4 mr-3" />
                        Profilo
                      </button>

                      {permissions.canManageContent && (
                        <button
                          onClick={() => handleMenuItemClick('dashboard')}
                          className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Cog6ToothIcon className="w-4 h-4 mr-3" />
                          Admin
                        </button>
                      )}

                      <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-1">
                        <button
                          onClick={onLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onLogin}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Accedi
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Filtri - mostrati solo se showFilters è true */}
      {showFilters && onSelectFilter && (
        <div className="sticky top-16 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/50">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap gap-2">
              {/* Filtro Tutti */}
              <button
                onClick={() => onSelectFilter({ type: 'all' })}
                className={getButtonClass({ type: 'all' })}
              >
                Tutti
              </button>

              {/* Filtro Preferiti (solo se l'utente è loggato) */}
              {isLoggedIn && (
                <button
                  onClick={() => onSelectFilter({ type: 'favorites' })}
                  className={getButtonClass({ type: 'favorites' })}
                >
                  ♥ Preferiti
                </button>
              )}

              {/* Filtri per Canali */}
              {channels && channels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => onSelectFilter({ type: 'channel', value: channel.id })}
                  className={getButtonClass({ type: 'channel', value: channel.id })}
                >
                  {channel.name}
                </button>
              ))}

              {/* Filtri per Topic */}
              {TOPICS.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => onSelectFilter({ type: 'topic', value: topic.name })}
                  className={getButtonClass({ type: 'topic', value: topic.name })}
                >
                  <TagIcon className="w-3 h-3 mr-1" />
                  {topic.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
