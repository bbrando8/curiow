import React, { useState, useEffect } from 'react';
import { BetaFeedback } from '../../types';
import * as feedbackService from '../../services/feedbackService';
import AdminPageLayout from './AdminPageLayout';
import AdminConfirmationModal from './AdminConfirmationModal';

interface FeedbackManagementProps {
  onBack: () => void;
}

const FeedbackManagement: React.FC<FeedbackManagementProps> = ({ onBack }) => {
  const [feedbacks, setFeedbacks] = useState<BetaFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtri
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Opzioni per i filtri
  const [sections, setSections] = useState<string[]>([]);
  const [users, setUsers] = useState<Array<{userId: string, userEmail: string}>>([]);

  // Modal di conferma
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadFeedbacks();
  }, [selectedSection, selectedUser, selectedStatus, startDate, endDate]);

  const loadInitialData = async () => {
    try {
      const [sectionsData, usersData] = await Promise.all([
        feedbackService.getUniqueSections(),
        feedbackService.getUniqueUsers()
      ]);
      setSections(sectionsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Errore nel caricamento dei dati iniziali:', err);
    }
  };

  const loadFeedbacks = async () => {
    setIsLoading(true);
    setError('');

    try {
      const filters: any = {};

      if (selectedSection) filters.section = selectedSection;
      if (selectedUser) filters.userId = selectedUser;
      if (selectedStatus) filters.status = selectedStatus;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const data = await feedbackService.fetchFeedbacks(filters);
      setFeedbacks(data);
    } catch (err) {
      setError('Errore nel caricamento dei feedback');
      console.error('Errore nel caricamento dei feedback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedSection('');
    setSelectedUser('');
    setSelectedStatus('');
    setStartDate('');
    setEndDate('');
  };

  const handleStatusChange = async (feedbackId: string, newStatus: 'inviato' | 'letto' | 'risolto') => {
    try {
      await feedbackService.updateFeedbackStatus(feedbackId, newStatus);
      await loadFeedbacks(); // Ricarica i feedback
    } catch (err) {
      console.error('Errore nell\'aggiornamento dello stato:', err);
      alert('Errore nell\'aggiornamento dello stato');
    }
  };

  const handleDelete = (feedbackId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Elimina Feedback',
      message: 'Sei sicuro di voler eliminare questo feedback? Questa azione non può essere annullata.',
      action: 'Elimina',
      onConfirm: async () => {
        try {
          await feedbackService.deleteFeedback(feedbackId);
          await loadFeedbacks(); // Ricarica i feedback
        } catch (err) {
          console.error('Errore nell\'eliminazione del feedback:', err);
          alert('Errore nell\'eliminazione del feedback');
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'inviato':
        return 'bg-blue-100 text-blue-800';
      case 'letto':
        return 'bg-yellow-100 text-yellow-800';
      case 'risolto':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <AdminPageLayout title="Feedback Tester" onBack={onBack}>
      {/* Filtri */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Filtri</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="section-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Sezione
            </label>
            <select
              id="section-filter"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tutte le sezioni</option>
              {sections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Utente
            </label>
            <select
              id="user-filter"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tutti gli utenti</option>
              {users.map(user => (
                <option key={user.userId} value={user.userId}>
                  {user.userEmail}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Stato
            </label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tutti gli stati</option>
              <option value="inviato">Inviato</option>
              <option value="letto">Letto</option>
              <option value="risolto">Risolto</option>
            </select>
          </div>

          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
              Data inizio
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
              Data fine
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancella filtri
          </button>
        </div>
      </div>

      {/* Lista feedback */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-200">
              Nessun feedback trovato con i filtri selezionati
            </div>
          ) : (
            feedbacks.map(feedback => (
              <div key={feedback.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {feedback.section}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(feedback.status)}`}>
                        {feedback.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <span className="font-medium">{feedback.userName}</span>
                      <span>{feedback.userEmail}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Creato: {formatDate(feedback.createdAt)}
                      {feedback.updatedAt && feedback.updatedAt.getTime() !== feedback.createdAt.getTime() && (
                        <span className="ml-4">
                          Aggiornato: {formatDate(feedback.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <select
                      value={feedback.status}
                      onChange={(e) => handleStatusChange(feedback.id, e.target.value as any)}
                      className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="inviato">Inviato</option>
                      <option value="letto">Letto</option>
                      <option value="risolto">Risolto</option>
                    </select>
                    <button
                      onClick={() => handleDelete(feedback.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="Elimina feedback"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {feedback.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal di conferma */}
      <AdminConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        actionText={confirmModal.action}
        actionType="danger"
      />
    </AdminPageLayout>
  );
};

export default FeedbackManagement;
