import React, { useState } from 'react';

interface FeedbackModalProps {
  section: string;
  onSubmit: (section: string, message: string) => Promise<void>;
  onCancel: () => void;
  onSuccess?: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ section, onSubmit, onCancel, onSuccess }) => {
  const [currentSection, setCurrentSection] = useState(section);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentSection.trim()) {
      setError('Inserisci una sezione');
      return;
    }

    if (!message.trim()) {
      setError('Inserisci un messaggio di feedback');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSubmit(currentSection.trim(), message.trim());
      onSuccess?.(); // Chiama il callback onSuccess se fornito
      onCancel(); // Chiudi la modale dopo il successo
    } catch (err) {
      setError('Errore nell\'invio del feedback. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Feedback Betatester</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="feedback-section" className="block text-sm font-medium text-gray-700 mb-2">
                Sezione *
              </label>
              <input
                id="feedback-section"
                type="text"
                value={currentSection}
                onChange={(e) => setCurrentSection(e.target.value)}
                placeholder="Es. Feed principale, Dettaglio gem, ecc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-2">
                Messaggio di feedback *
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descrivi il tuo feedback, suggerimenti o problemi riscontrati..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isLoading}
                maxLength={2000}
              />
              <div className="text-xs text-gray-500 mt-1">
                {message.length}/2000 caratteri
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isLoading}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Invio...' : 'Invia Feedback'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
