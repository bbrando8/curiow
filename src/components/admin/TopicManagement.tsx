import React, { useState, useEffect } from 'react';
import { TopicSuggestion, UserRole, Channel } from '../../types';
import {
  fetchTopicSuggestions,
  createTopicSuggestion,
  updateTopicSuggestion,
  deleteTopicSuggestion,
  fetchAllChannels
} from '../../services/firestoreService';
import { useUserPermissions } from '../../services/roleService';
import { generateTopicSuggestionDetails } from '../../services/apiService';
import AdminPageLayout from './AdminPageLayout';

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
  const [channels, setChannels] = useState<(Channel & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Selezione multipla
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'pending' | 'approved' | 'converted' | ''>('');

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
    channelId: '',
  });

  const permissions = useUserPermissions(currentUser);

  useEffect(() => {
    if (!permissions.isAdmin) return;
    loadTopics();
    loadChannels();
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

  const loadChannels = async () => {
    try {
      const fetchedChannels = await fetchAllChannels();
      setChannels(fetchedChannels);
    } catch (error) {
      console.error('Errore nel caricamento canali:', error);
    }
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

  // Gestione selezione multipla
  const handleSelectTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTopics.length === currentTopics.length) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics(currentTopics.map(topic => topic.id));
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkAction || selectedTopics.length === 0) return;

    const statusLabels = {
      pending: 'In attesa',
      approved: 'Approvato',
      converted: 'Convertito'
    };

    showConfirmation(
      'Conferma cambio stato multiplo',
      `Sei sicuro di voler cambiare lo stato di ${selectedTopics.length} argomenti a "${statusLabels[bulkAction]}"?`,
      async () => {
        try {
          // Esegui l'aggiornamento per tutti gli argomenti selezionati
          await Promise.all(
            selectedTopics.map(topicId =>
              updateTopicSuggestion(topicId, { status: bulkAction })
            )
          );

          // Reset selezione e ricarica dati
          setSelectedTopics([]);
          setBulkAction('');
          await loadTopics();
        } catch (error) {
          console.error('Errore nel cambio status multiplo:', error);
        }
      },
      'Conferma'
    );
  };

  const handleBulkDelete = () => {
    if (selectedTopics.length === 0) return;

    showConfirmation(
      'Conferma eliminazione multipla',
      `Sei sicuro di voler eliminare ${selectedTopics.length} argomenti? Questa azione non può essere annullata.`,
      async () => {
        try {
          // Esegui l'eliminazione per tutti gli argomenti selezionati
          await Promise.all(
            selectedTopics.map(topicId => deleteTopicSuggestion(topicId))
          );

          // Reset selezione e ricarica dati
          setSelectedTopics([]);
          await loadTopics();
        } catch (error) {
          console.error('Errore nell\'eliminazione multipla:', error);
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
        channelId: details.channelId || '',
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
        formData.originalSuggestion,
        formData.channelId
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
        channelId: formData.channelId,
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
      channelId: topic.channelId || '',
    });
  };

  const resetForm = () => {
    setFormData({ originalSuggestion: '', title: '', objective: '', tags: '', channelId: '' });
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

    // Aggiunta del filtro stato locale per assicurarsi che funzioni
    const matchesStatus = statusFilter === 'all' || topic.status === statusFilter;

    return matchesText && matchesTag && matchesStatus;
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
    <AdminPageLayout
      title="Gestione Argomenti"
      onBack={onBack}
      currentUserRole={currentUser?.role}
    >
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

      {/* Barra azioni bulk - visibile solo quando ci sono elementi selezionati */}
      {selectedTopics.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedTopics.length} argomenti selezionati
              </span>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-blue-900">Cambia stato a:</label>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value as any)}
                  className="text-xs border border-blue-300 rounded px-2 py-1 bg-white"
                >
                  <option value="">Seleziona stato...</option>
                  <option value="pending">⏳ In attesa</option>
                  <option value="approved">✅ Approvato</option>
                  <option value="converted">💎 Convertito</option>
                </select>
                <button
                  onClick={handleBulkStatusChange}
                  disabled={!bulkAction}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                >
                  Applica
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                🗑️ Elimina selezionati
              </button>
              <button
                onClick={() => setSelectedTopics([])}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                Deseleziona tutto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabella */}
      {loading ? (
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="h-6 bg-gray-200 rounded-full"></div>
              <div className="h-4 bg-gray-200 rounded-full mt-2"></div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="h-6 bg-gray-200 rounded-full"></div>
              <div className="h-4 bg-gray-200 rounded-full mt-2"></div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="h-6 bg-gray-200 rounded-full"></div>
              <div className="h-4 bg-gray-200 rounded-full mt-2"></div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="h-6 bg-gray-200 rounded-full"></div>
              <div className="h-4 bg-gray-200 rounded-full mt-2"></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <div className="h-4 bg-gray-200 rounded-full"></div>
              </div>

              <div>
                <div className="h-4 bg-gray-200 rounded-full"></div>
              </div>

              <div>
                <div className="h-4 bg-gray-200 rounded-full"></div>
              </div>

              <div>
                <div className="h-4 bg-gray-200 rounded-full"></div>
              </div>

              <div className="flex items-end">
                <div className="h-10 bg-blue-600 rounded-md w-full"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTopics.length === currentTopics.length && selectedTopics.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      aria-label="Seleziona tutti"
                    />
                    <span className="ml-2">Argomento</span>
                  </div>
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
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(topic.id)}
                        onChange={() => handleSelectTopic(topic.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        aria-label={`Seleziona ${topic.title}`}
                      />
                      <div className="ml-2 flex items-center space-x-2">
                        <div className="text-sm font-bold text-gray-900 max-w-md">
                          {topic.title}
                        </div>
                        {/* Icona per mostrare l'objective al hover */}
                        <div className="relative group">
                          <div className="w-5 h-5 bg-blue-100 hover:bg-blue-200 rounded-full flex items-center justify-center cursor-help transition-colors">
                            <span className="text-xs text-blue-600 font-bold">?</span>
                          </div>
                          {/* Tooltip con l'objective - più largo per migliore leggibilità */}
                          <div className="absolute left-0 top-6 z-10 invisible group-hover:visible bg-gray-800 text-white text-sm rounded-lg px-4 py-3 shadow-lg w-96 max-w-screen-sm">
                            <div className="font-semibold mb-2">Obiettivo argomento:</div>
                            <div className="leading-relaxed">{topic.objective}</div>
                            {/* Freccia del tooltip */}
                            <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-800 transform rotate-45"></div>
                          </div>
                        </div>
                      </div>
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
      )}

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center mt-4">
          <div className="text-sm text-gray-700">
            Mostrando {indexOfFirstTopic + 1}-{Math.min(indexOfLastTopic, filteredTopics.length)} di {filteredTopics.length} argomenti
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Precedente
            </button>
            <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md">
              {currentPage} di {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Successiva
            </button>
          </div>
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

                {/* Pulsante Chiudi sempre visibile */}
                <div className="flex justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingTopic) setEditingTopic(null);
                      else setShowCreateModal(false);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Chiudi
                  </button>

                  {/* Pulsante Genera Dettagli solo in creazione */}
                  {!formData.title && !editingTopic && (
                    <button
                      type="button"
                      onClick={handleGenerateDetails}
                      disabled={!formData.originalSuggestion || isGenerating}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-green-300"
                    >
                      {isGenerating ? 'Generazione...' : 'Genera Dettagli'}
                    </button>
                  )}
                </div>

                {(formData.title || editingTopic) && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Canale
                      </label>
                      <select
                        value={formData.channelId}
                        onChange={(e) => setFormData({...formData, channelId: e.target.value})}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Seleziona un canale...</option>
                        {channels.map(channel => (
                          <option key={channel.id} value={channel.id}>{channel.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Seleziona il canale in cui pubblicare l'argomento
                      </p>
                    </div>

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
    </AdminPageLayout>
  );
};

export default TopicManagement;
