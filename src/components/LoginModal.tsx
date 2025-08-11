import React, { useState } from 'react';
import { SparklesIcon } from './icons';

interface LoginModalProps {
  onLoginAttempt: (email: string, pass: string) => Promise<void>;
  onSignUpAttempt: (email: string, pass: string, firstName: string, lastName: string) => Promise<void>;
  onGoogleAuth: () => Promise<void>;
  onCancel: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLoginAttempt, onSignUpAttempt, onGoogleAuth, onCancel }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        if (isLoginView) {
            await onLoginAttempt(email, password);
        } else {
            if(!firstName || !lastName) {
                setError("Nome e cognome sono obbligatori.");
                setIsLoading(false);
                return;
            }
            await onSignUpAttempt(email, password, firstName, lastName);
        }
        // onCancel will be called from App.tsx on successful login
    } catch (err: any) {
        setError(err.message || 'Si è verificato un errore.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <SparklesIcon className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoginView ? 'Bentornato!' : 'Crea il tuo account'}
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
            {isLoginView ? 'Accedi per continuare la tua avventura.' : 'Unisciti a Curiow per salvare le tue scoperte.'}
        </p>
        
        <form onSubmit={handleSubmit} className="mt-6 text-left space-y-4">
            {!isLoginView && (
                <div className="flex gap-4">
                    <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome</label>
                        <input id="firstName" name="firstName" type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                            className="mt-1 block w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cognome</label>
                        <input id="lastName" name="lastName" type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                            className="mt-1 block w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 dark:text-white" />
                    </div>
                </div>
            )}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="mt-1 block w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 dark:text-white" />
            </div>
             <div>
                <label htmlFor="password"className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="mt-1 block w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 dark:text-white" />
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <div className="pt-2 flex flex-col gap-3">
                <button type="submit" disabled={isLoading}
                    className="w-full px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all">
                    {isLoading ? 'Caricamento...' : (isLoginView ? 'Accedi' : 'Registrati')}
                </button>

                {/* Separatore */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-300 dark:border-slate-600" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">oppure</span>
                    </div>
                </div>

                {/* Bottone Google */}
                <button type="button" onClick={onGoogleAuth} disabled={isLoading}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {isLoginView ? 'Accedi con Google' : 'Registrati con Google'}
                </button>

                 <button type="button" onClick={() => { setIsLoginView(!isLoginView); setError(''); }}
                    className="w-full text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    {isLoginView ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;