import React, { useState } from 'react';
import { SavedList } from '../types';
import { HeartIcon, PlusCircleIcon, BookmarkSquareIcon } from './icons';

interface SaveToListModalProps {
    isOpen: boolean;
    onClose: () => void;
    lists: SavedList[];
    gemId: string;
    onSaveToList: (listId: string) => void;
    onCreateAndSave: (listName: string) => void;
    onToggleDefaultFavorite: (gemId: string) => void;
    isSavedToDefault: boolean;
}

const SaveToListModal: React.FC<SaveToListModalProps> = ({
    isOpen,
    onClose,
    lists,
    gemId,
    onSaveToList,
    onCreateAndSave,
    onToggleDefaultFavorite,
    isSavedToDefault,
}) => {
    const [newListName, setNewListName] = useState('');

    if (!isOpen) return null;
    
    const handleCreateList = (e: React.FormEvent) => {
        e.preventDefault();
        if (newListName.trim()) {
            onCreateAndSave(newListName.trim());
            setNewListName('');
            onClose();
        }
    };

    const handleSaveToListClick = (listId: string) => {
        onSaveToList(listId);
        onClose();
    };
    
    const handleToggleDefault = () => {
        onToggleDefaultFavorite(gemId);
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 text-center transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <BookmarkSquareIcon className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Salva in una lista</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Organizza le tue gemme per ritrovarle facilmente.</p>

                <div className="mt-4 text-left space-y-2 max-h-40 overflow-y-auto pr-2">
                    <button
                        onClick={handleToggleDefault}
                        className="w-full flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-left transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <HeartIcon className={`w-5 h-5 mr-3 flex-shrink-0 ${isSavedToDefault ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                        Preferiti
                    </button>
                    {lists.map(list => (
                        <button
                            key={list.id}
                            onClick={() => handleSaveToListClick(list.id)}
                            className="w-full flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-left transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                             <BookmarkSquareIcon className={`w-5 h-5 mr-3 flex-shrink-0 ${list.gemIds.includes(gemId) ? 'text-indigo-500' : 'text-slate-400'}`} />
                            <span className="flex-grow">{list.name}</span>
                            <span className="text-xs text-slate-400">{list.gemIds.length}</span>
                        </button>
                    ))}
                </div>

                <form onSubmit={handleCreateList} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            placeholder="Crea una nuova lista..."
                            className="flex-grow bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-1.5 px-3 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button type="submit" className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400" disabled={!newListName.trim()}>
                            <PlusCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                </form>
                 <div className="mt-4">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-all"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveToListModal;
