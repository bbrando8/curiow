import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, UserCircleIcon, Cog6ToothIcon, ShieldCheckIcon } from './icons';
import { User, UserRole } from '../types';

interface ProfileViewProps {
    user: User;
    onUpdateUser: (user: User) => void;
    onBack: () => void;
    onNavigate: (view: 'dashboard') => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser, onBack, onNavigate }) => {
    const [formData, setFormData] = useState<User>(user);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setFormData(user);
    }, [user]);

    useEffect(() => {
        setIsDirty(formData.firstName !== user.firstName || formData.lastName !== user.lastName);
    }, [formData, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateUser(formData);
        setIsDirty(false);
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
                <h1 className="ml-4 text-xl font-bold text-slate-900 dark:text-white">Profilo e Impostazioni</h1>
            </header>

            <main className="p-5 sm:p-8">
                 <form onSubmit={handleSubmit}>
                    <div className="flex flex-col items-center">
                        <UserCircleIcon className="w-24 h-24 text-slate-400 dark:text-slate-500" />
                        <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{user.firstName} {user.lastName}</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                
                    <section className="mt-10 border-t border-slate-200 dark:border-slate-700 pt-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                            <Cog6ToothIcon className="w-6 h-6 mr-2 text-slate-500" />
                            I tuoi dati
                        </h3>
                        <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="mt-1 block w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cognome</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        id="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="mt-1 block w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                             <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email (Credenziale)</label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={formData.email}
                                    disabled
                                    className="mt-1 block w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 sm:text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                                <button type="button" className="mt-1 w-full sm:w-auto px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Cambia Password
                                </button>
                            </div>
                        </div>
                    </section>

                    {user.role === UserRole.ADMIN && (
                        <section className="mt-10 border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                                <ShieldCheckIcon className="w-6 h-6 mr-2 text-slate-500" />
                                Area Amministrazione
                            </h3>
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => onNavigate('dashboard')}
                                    className="w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Vai alla Dashboard
                                </button>
                            </div>
                        </section>
                    )}
                     <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                        <button
                            type="submit"
                            disabled={!isDirty}
                            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                        >
                            Salva Modifiche
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default ProfileView;