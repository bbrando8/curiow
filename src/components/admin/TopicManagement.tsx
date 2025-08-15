import React, { useState, useEffect } from 'react';
import { TopicSuggestion, UserRole } from '../../types';
import {
  fetchTopicSuggestions,
  createTopicSuggestion,
  updateTopicSuggestion,
  deleteTopicSuggestion
} from '../../services/firestoreService';
import { useUserPermissions } from '../../services/roleService';
import { generateTopicSuggestionDetails } from '../../services/apiService';
import { ChevronLeftIcon } from '../icons';

interface TopicManagementProps {
  currentUser: { role: UserRole; permissions: any; uid?: string } | null;
  onBack: () => void;
}

// Modal di conferma per cambio stato
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  action: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen, onClose, onConfirm, title, message, action
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {action}
          </button>
        </div>
      </div>
    </div>
  );
};

const TopicManagement: React.FC<TopicManagementProps> = ({ currentUser, onBack }) => {
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filtri e ricerca
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'converted'>('all');
  const [textSearch, setTextSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  // Paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [topicsPerPage, setTopicsPerPage] = useState(10);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: () => void;
    title: string;
    message: string;
    actionText: string;
  }>({
    isOpen: false,
    action: () => {},
    title: '',
    message: '',
    actionText: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    originalSuggestion: '',
    title: '',
    objective: '',
    tags: '',
  });

  const permissions = useUserPermissions(currentUser);

  useEffect(() => {
    if (!permissions.isAdmin) return;
    loadTopics();
  }, [statusFilter, permissions.isAdmin]);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const fetchedTopics = await fetchTopicSuggestions(
        statusFilter === 'all' ? undefined : statusFilter
      );
      setTopics(fetchedTopics);
    } catch (error) {
      console.error('Errore nel caricamento argomenti:', error);
    }
    setLoading(false);
  };

  const showConfirmation = (title: string, message: string, action: () => void, actionText: string) => {
    setConfirmModal({
      isOpen: true,
      action,
      title,
      message,
      actionText
    });
  };

  const handleStatusChange = async (topicId: string, newStatus: 'pending' | 'approved' | 'converted') => {
    const statusLabels = {
      pending: 'In attesa',
      approved: 'Approvato',
      converted: 'Convertito'
    };

    showConfirmation(
      'Conferma cambio stato',
      `Sei sicuro di voler cambiare lo stato dell'argomento a "${statusLabels[newStatus]}"?`,
      async () => {
        try {
          await updateTopicSuggestion(topicId, { status: newStatus });
          await loadTopics();
        } catch (error) {
          console.error('Errore nel cambio status:', error);
        }
      },
      'Conferma'
    );
  };

  const handleDelete = (topicId: string) => {
    showConfirmation(
      'Conferma eliminazione',
      'Sei sicuro di voler eliminare questo argomento? Questa azione non può essere annullata.',
      async () => {
        try {
          await deleteTopicSuggestion(topicId);
          await loadTopics();
        } catch (error) {
          console.error('Errore nell\'eliminazione:', error);
        }
      },
      'Elimina'
    );
  };

  const handleGenerateDetails = async () => {
    if (!formData.originalSuggestion) return;
    setIsGenerating(true);
    try {
      const details = await generateTopicSuggestionDetails(formData.originalSuggestion);
      setFormData(prev => ({
        ...prev,
        title: details.title || '',
        objective: details.objective || '',
        tags: Array.isArray(details.tags) ? details.tags.join(', ') : '',
      }));
    } catch (error) {
      console.error('Errore nella generazione dei dettagli:', error);
      // Potresti voler mostrare un messaggio di errore all'utente qui
    }
    setIsGenerating(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) {
      return;
    }

    try {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      await createTopicSuggestion(
        formData.title,
        formData.objective,
        tags,
        currentUser.uid,
        formData.originalSuggestion
      );

      setShowCreateModal(false); // Chiudi la modale
      await loadTopics(); // Ricarica i dati
    } catch (error) {
      console.error('Errore nella creazione del suggerimento:', error);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;

    try {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      await updateTopicSuggestion(editingTopic.id, {
        title: formData.title,
        objective: formData.objective,
        tags,
      });
      setEditingTopic(null); // Chiudi la modale di modifica
      await loadTopics();
    } catch (error) {
      console.error('Errore nell\'aggiornamento:', error);
    }
  };

  const openEditModal = (topic: TopicSuggestion) => {
    setEditingTopic(topic);
    setFormData({
      title: topic.title,
      objective: topic.objective,
      tags: topic.tags.join(', '),
      originalSuggestion: topic.originalSuggestion || '',
    });
  };

  const resetForm = () => {
    setFormData({ originalSuggestion: '', title: '', objective: '', tags: '' });
    setEditingTopic(null);
    setShowCreateModal(false);
  };

  useEffect(() => {
    if (!showCreateModal && !editingTopic) {
      resetForm();
    }
  }, [showCreateModal, editingTopic]);

  // Filtro combinato per ricerca
  const filteredTopics = topics.filter(topic => {
    const objective = topic.objective || '';
    const title = topic.title || '';
    const tags = topic.tags || [];

    const matchesText = objective.toLowerCase().includes(textSearch.toLowerCase()) ||
                        title.toLowerCase().includes(textSearch.toLowerCase());
    const matchesTag = tagSearch === '' || tags.some(tag =>
      tag.toLowerCase().includes(tagSearch.toLowerCase())
    );
    return matchesText && matchesTag;
  });

  // Paginazione
  const indexOfLastTopic = currentPage * topicsPerPage;
  const indexOfFirstTopic = indexOfLastTopic - topicsPerPage;
  const currentTopics = filteredTopics.slice(indexOfFirstTopic, indexOfLastTopic);
  const totalPages = Math.ceil(filteredTopics.length / topicsPerPage);

  // Reset pagina quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1);
  }, [textSearch, tagSearch, statusFilter, topicsPerPage]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'converted': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'converted': return '💎';
      default: return '❓';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'In attesa';
      case 'approved': return 'Approvato';
      case 'converted': return 'Convertito in gemma';
      default: return status;
    }
  };

  const formatDate = (date: any) => {
    try {
      // Gestisce sia Timestamp di Firestore che Date JavaScript
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Data non valida';
    }
  };

  if (!permissions.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso Negato</h2>
          <p className="text-gray-600">Solo gli amministratori possono accedere a questa pagina.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <header className="sticky top-0 z-10 flex items-center p-2 sm:p-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700/50">
        <button
          onClick={onBack}
          className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Torna indietro"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="ml-4 text-xl font-bold text-slate-900 dark:text-white">Gestione Argomenti</h1>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-600">{topics.length}</div>
            <div className="text-sm text-gray-600">Totali</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-yellow-600">{topics.filter(t => t.status === 'pending').length}</div>
            <div className="text-sm text-gray-600">In attesa</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-green-600">{topics.filter(t => t.status === 'approved').length}</div>
            <div className="text-sm text-gray-600">Approvati</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">{topics.filter(t => t.status === 'converted').length}</div>
            <div className="text-sm text-gray-600">Convertiti</div>
          </div>
        </div>

        {/* Filtri e ricerca */}
        <div className="bg-white rounded-lg shadow border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ricerca nel testo</label>
              <input
                type="text"
                placeholder="Cerca negli argomenti..."
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ricerca nei tag</label>
              <input
                type="text"
                placeholder="Cerca per tag..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtra per stato</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tutti gli stati</option>
                <option value="pending">In attesa</option>
                <option value="approved">Approvati</option>
                <option value="converted">Convertiti</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Elementi per pagina</label>
              <select
                value={topicsPerPage}
                onChange={(e) => setTopicsPerPage(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + Nuovo Argomento
              </button>
            </div>
          </div>
        </div>

        {/* Tabella */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Caricamento argomenti...</span>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Argomento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data creazione
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentTopics.map((topic) => (
                    <tr key={topic.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900 max-w-md">
                          {topic.title}
                        </div>
                        <div className="text-sm text-gray-600 max-w-md mt-1">
                          {topic.objective}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {topic.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                              #{tag}
                            </span>
                          ))}
                          {topic.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{topic.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(topic.status)}`}>
                          {getStatusEmoji(topic.status)} {topic.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(topic.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Dropdown per cambio stato */}
                          <select
                            value={topic.status}
                            onChange={(e) => handleStatusChange(topic.id, e.target.value as any)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="pending">⏳ In attesa</option>
                            <option value="approved">✅ Approvato</option>
                            <option value="converted">💎 Convertito</option>
                          </select>

                          <button
                            onClick={() => openEditModal(topic)}
                            className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
                            title="Modifica"
                          >
                            ✏️
                          </button>

                          <button
                            onClick={() => handleDelete(topic.id)}
                            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                            title="Elimina"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginazione */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Precedente
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Successivo
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{indexOfFirstTopic + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(indexOfLastTopic, filteredTopics.length)}</span> di{' '}
                      <span className="font-medium">{filteredTopics.length}</span> risultati
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        ←
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        →
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Creazione/Modifica */}
        {(showCreateModal || editingTopic) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {editingTopic ? 'Modifica Argomento' : 'Nuovo Argomento'}
                </h2>

                <form onSubmit={editingTopic ? handleUpdate : handleCreate}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idea iniziale
                    </label>
                    <textarea
                      value={formData.originalSuggestion}
                      onChange={(e) => setFormData({...formData, originalSuggestion: e.target.value})}
                      required={!editingTopic}
                      disabled={!!editingTopic || !!formData.title}
                      rows={3}
                      placeholder="Descrivi l'argomento che vorresti sviluppare in una gemma..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  {!formData.title && !editingTopic && (
                    <div className="flex justify-end mb-4">
                      <button
                        type="button"
                        onClick={handleGenerateDetails}
                        disabled={!formData.originalSuggestion || isGenerating}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-green-300"
                      >
                        {isGenerating ? 'Generazione...' : 'Genera Dettagli'}
                      </button>
                    </div>
                  )}

                  {(formData.title || editingTopic) && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Titolo
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          required
                          placeholder="Titolo generato per l'argomento"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Obiettivo
                        </label>
                        <textarea
                          value={formData.objective}
                          onChange={(e) => setFormData({...formData, objective: e.target.value})}
                          required
                          rows={5}
                          placeholder="Obiettivo generato per l'argomento..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tag (separati da virgole)
                        </label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={(e) => setFormData({...formData, tags: e.target.value})}
                          placeholder="es: storia, arte, scienza, tecnologia"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          I tag aiutano a categorizzare l'argomento
                        </p>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => editingTopic ? setEditingTopic(null) : setShowCreateModal(false)}
                          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Annulla
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          {editingTopic ? 'Aggiorna' : 'Salva Argomento'}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal di conferma */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({...confirmModal, isOpen: false})}
          onConfirm={confirmModal.action}
          title={confirmModal.title}
          message={confirmModal.message}
          action={confirmModal.actionText}
        />
      </div>
    </div>
  );
};

export default TopicManagement;
