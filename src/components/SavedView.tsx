import React, { useState } from 'react';
import { SavedList, Gem } from '../types';
import { ChevronLeftIcon, PlusCircleIcon } from './icons';
import GemCard from './GemCard';

interface SavedViewProps {
    allGems: Gem[];
    allFavoriteIds: string[];
    savedLists: SavedList[];
    onUpdateLists: (lists: SavedList[]) => void;
    onSelectGem: (gemId: string) => void;
    onToggleFavorite: (gemId: string) => void;
    onLoginRequest: () => void;
    onBack: () => void;
}

const SavedView: React.FC<SavedViewProps> = ({ allGems, allFavoriteIds, savedLists, onUpdateLists, onSelectGem, onToggleFavorite, onLoginRequest, onBack }) => {
    const [newListName, setNewListName] = useState('');
    const userLists = savedLists.filter(l => l.id !== 'default');
    const [selectedListId, setSelectedListId] = useState<string | 'all'>('all');

    const handleCreateList = (e: React.FormEvent) => {
        e.preventDefault();
        if (newListName.trim()) {
            const newList: SavedList = {
                id: self.crypto.randomUUID(),
                name: newListName.trim(),
                gemIds: [],
            };
            onUpdateLists([newList, ...savedLists]);
            setNewListName('');
        }
    };
    
    const getGemsForList = (): Gem[] => {
        if (selectedListId === 'all') {
            return allGems.filter(gem => allFavoriteIds.includes(gem.id));
        }
        const list = savedLists.find(l => l.id === selectedListId);
        return list ? allGems.filter(gem => list.gemIds.includes(gem.id)) : [];
    };

    const getButtonClass = (id: string) => {
        const baseClass = 'px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 text-left';
        if (selectedListId === id) {
            return `${baseClass} bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300`;
        }
        return `${baseClass} text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`;
    };

    const gemsInView = getGemsForList();

    return (
        <div className="max-w-5xl mx-auto">
            <header className="sticky top-0 z-10 flex items-center p-2 sm:p-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700/50">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Torna indietro"
                >
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <h1 className="ml-4 text-xl font-bold text-slate-900 dark:text-white">Le tue Liste</h1>
            </header>

            <div className="flex flex-col md:flex-row">
                <aside className="w-full md:w-64 lg:w-72 p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
                    <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Liste</h2>
                    <nav className="mt-4 flex flex-col space-y-1">
                        <button onClick={() => setSelectedListId('all')} className={getButtonClass('all')}>
                            Tutti i Preferiti ({allFavoriteIds.length})
                        </button>
                        {userLists.map(list => (
                             <button key={list.id} onClick={() => setSelectedListId(list.id)} className={getButtonClass(list.id)}>
                                {list.name} ({list.gemIds.length})
                            </button>
                        ))}
                    </nav>

                    <form onSubmit={handleCreateList} className="mt-6">
                         <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nuova Lista</h2>
                         <div className="mt-2 flex space-x-2">
                            <input
                                type="text"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                placeholder="Nome della lista..."
                                className="flex-grow bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md py-1.5 px-3 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button type="submit" className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400" disabled={!newListName.trim()}>
                                <PlusCircleIcon className="w-5 h-5" />
                            </button>
                         </div>
                    </form>
                </aside>
                
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {gemsInView.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-xl mx-auto">
                           {gemsInView.map(gem => (
                                <GemCard
                                    key={gem.id}
                                    gem={gem}
                                    isLoggedIn={true}
                                    isFavorite={allFavoriteIds.includes(gem.id)}
                                    onSaveRequest={onToggleFavorite} /* Using onToggleFavorite here to just remove from all lists */
                                    onSelect={onSelectGem}
                                    onLoginRequest={onLoginRequest}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center pt-20 text-slate-500 dark:text-slate-400">
                            <h3 className="text-xl font-semibold">Nessuna gemma in questa lista</h3>
                            <p className="mt-2 max-w-md mx-auto">
                                {selectedListId === 'all' 
                                    ? "Salva le tue gemme preferite cliccando sul cuore. Le troverai tutte qui."
                                    : "Aggiungi gemme a questa lista dalla loro pagina di dettaglio o dal popup di salvataggio."
                                }
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SavedView;