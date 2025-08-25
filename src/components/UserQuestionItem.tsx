import React from 'react';
import { SparklesIcon } from './icons';
import { UserQuestion } from '../types';

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

export default UserQuestionItem;

