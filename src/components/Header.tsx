import React, { useState, useRef, useEffect } from 'react';
import { TOPICS } from '../constants';
import { Topic, Channel, Filter, User } from '../types';
import { SparklesIcon, UserCircleIcon, BookmarkSquareIcon, Cog6ToothIcon, TagIcon, ChevronDownIcon } from './icons';
import { useUserPermissions } from '../services/roleService';

interface HeaderProps {
  isLoggedIn: boolean;
  user?: User | null;
  onLogin: () => void;
  onLogout: () => void;
  selectedFilter: Filter;
  onSelectFilter: (filter: Filter) => void;
  onNavigate: (view: 'feed' | 'saved' | 'profile' | 'dashboard' | 'topics') => void;
  channels: Channel[];
}

const Header: React.FC<HeaderProps> = ({ isLoggedIn, onLogin, onLogout, selectedFilter, onSelectFilter, onNavigate, channels }) => {
  const getButtonClass = (filter: Filter) => {
    const baseClass = 'px-3 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 focus:ring-indigo-500 whitespace-nowrap';
    
    if (selectedFilter.type === filter.type && ('value' in selectedFilter && 'value' in filter ? selectedFilter.value === filter.value : true)) {
      return `${baseClass} bg-indigo-600 text-white shadow-md`;
    }
    return `${baseClass} bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700`;
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => { onSelectFilter({ type: 'all' }); onNavigate('feed'); }} className="flex items-center space-x-2">
            <SparklesIcon className="w-7 h-7 text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Curiow</h1>
          </button>
          <div className="flex items-center space-x-2 sm:space-x-4">
             {isLoggedIn && (
                 <>
                    <button
                        onClick={() => {
                            console.log('Saved button clicked');
                            onNavigate('saved');
                        }}
                        title="Liste Salvate"
                        className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BookmarkSquareIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onNavigate('profile');
                        }}
                        title="Profilo e Impostazioni"
                        className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Cog6ToothIcon className="w-6 h-6" />
                    </button>
                 </>
             )}
             {isLoggedIn ? (
                <button
                    onClick={onLogout}
                    className="flex items-center space-x-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <UserCircleIcon className="w-6 h-6" />
                    <span className="hidden sm:inline">Logout</span>
                </button>
             ) : (
                <button
                    onClick={onLogin}
                    className="flex items-center space-x-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <UserCircleIcon className="w-6 h-6" />
                    <span className="hidden sm:inline">Login</span>
                </button>
             )}
          </div>
        </div>
        <div className="pb-4 overflow-x-auto">
            <nav className="flex items-center space-x-2 sm:space-x-3">
                <button onClick={() => onSelectFilter({ type: 'all' })} className={getButtonClass({ type: 'all' })}>Tutti</button>
                {isLoggedIn && <button onClick={() => onSelectFilter({ type: 'favorites' })} className={getButtonClass({ type: 'favorites' })}>Preferiti</button>}
                {selectedFilter.type === 'tag' && (
                  <>
                    <div className="border-l border-slate-300 dark:border-slate-600 h-6 mx-2"></div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tag</span>
                    <button onClick={() => {}} className={getButtonClass(selectedFilter)}>
                      <TagIcon className="w-3 h-3 inline-block mr-1.5"/>{selectedFilter.value}
                    </button>
                  </>
                )}
                <div className="border-l border-slate-300 dark:border-slate-600 h-6 mx-2"></div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Canali</span>
                {channels.map(channel => (
                    <button key={channel.id} onClick={() => onSelectFilter({type: 'channel', value: channel.id})} className={getButtonClass({type: 'channel', value: channel.id})}>
                        {channel.emoji} {channel.name}
                    </button>
                ))}
                <div className="border-l border-slate-300 dark:border-slate-600 h-6 mx-2"></div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Argomenti</span>
                {TOPICS.map(topic => (
                    <button key={topic} onClick={() => onSelectFilter({type: 'topic', value: topic})} className={getButtonClass({type: 'topic', value: topic})}>
                        {topic.split(' ')[0]}
                    </button>
                ))}
            </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;