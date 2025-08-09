import React, { useState } from 'react';
import { Gem, UserQuestion } from '../types';
import { ChevronLeftIcon, HeartIcon, ShareIcon, PaperAirplaneIcon, SparklesIcon, PlusCircleIcon, TagIcon, LinkIcon, ChevronDownIcon } from './icons';

interface GemDetailViewProps {
  gem: Gem;
  isFavorite: boolean;
  onBack: () => void;
  onSaveRequest: (gemId: string) => void;
  onAddUserQuestion: (gemId: string, question: string) => void;
  onTagSelect: (tag: string) => void;
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

const GemDetailView: React.FC<GemDetailViewProps> = ({ gem, isFavorite, onBack, onSaveRequest, onAddUserQuestion, onTagSelect }) => {
  const [userQuestion, setUserQuestion] = useState('');
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);

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

  return (
    <div className="max-w-2xl mx-auto">
        <header className="sticky top-0 z-10 flex items-center p-2 sm:p-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700/50">
            <button
                onClick={onBack}
                className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Torna indietro"
            >
                <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <span className="ml-4 font-semibold text-slate-800 dark:text-slate-200">{gem.topic}</span>
        </header>
        
        <article>
            <img src={gem.imageUrl} alt={gem.title} className="w-full h-auto object-cover md:rounded-b-lg" />

            <div className="p-5 sm:p-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-tight">{gem.title}</h1>
                
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 items-center">
                    <button
                        onClick={() => onSaveRequest(gem.id)}
                        className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                        <HeartIcon className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                        <span className="text-sm font-medium">{isFavorite ? 'Salvato' : 'Salva'}</span>
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

                <p className="mt-6 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{gem.description}</p>

                <section className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                        <PlusCircleIcon className="w-6 h-6 mr-2 text-indigo-500"/>
                        Approfondisci
                    </h2>
                    
                    {gem.suggestedQuestions && gem.suggestedQuestions.length > 0 && (
                        <div className="mt-4 p-4 bg-indigo-50 dark:bg-slate-800/50 rounded-lg">
                            <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Spunti di riflessione:</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {gem.suggestedQuestions.map((q, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => setUserQuestion(q)}
                                        className="px-2.5 py-1 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium border border-indigo-200 dark:border-slate-600 hover:bg-indigo-100 dark:hover:bg-slate-600 transition-colors"
                                    >
                                       " {q} "
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Fai una domanda per scoprire di più.</p>
                    <form onSubmit={handleUserQuestionSubmit} className="mt-2 flex items-center space-x-2">
                        <input
                            type="text"
                            value={userQuestion}
                            onChange={(e) => setUserQuestion(e.target.value)}
                            placeholder="Fai una domanda su questo argomento..."
                            className="flex-grow bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-full py-2 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button type="submit" className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={!userQuestion.trim()}>
                            <PaperAirplaneIcon className="w-5 h-5"/>
                        </button>
                    </form>

                    {gem.userQuestions.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Approfondimenti precedenti:</h3>
                            {gem.userQuestions.map(dd => <UserQuestionItem key={dd.id} userQuestion={dd} />)}
                        </div>
                    )}
                </section>
                
                {gem.sources && gem.sources.length > 0 && (
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
                                {gem.sources.map((source, index) => (
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
                )}
            </div>
        </article>
    </div>
  );
};

export default GemDetailView;