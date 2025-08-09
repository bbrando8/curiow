import React, { useState, useEffect } from 'react';
import { TopicSuggestion, UserRole } from '../../types';
import {
  fetchTopicSuggestions,
  createTopicSuggestion,
  updateTopicSuggestion,
  deleteTopicSuggestion
} from '../../services/firestoreService';
import { useUserPermissions } from '../../services/roleService';
import { ChevronLeftIcon } from '../icons';

interface TopicManagementProps {
  currentUser: { role: UserRole; permissions: any; uid?: string } | null;
  onBack: () => void;
}

const TopicManagement: React.FC<TopicManagementProps> = ({ currentUser, onBack }) => {
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicSuggestion | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'converted'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [topicsPerPage] = useState(8);

  // Form state
  const [formData, setFormData] = useState({
    text: '',
    tags: '',
  });

  const permissions = useUserPermissions(currentUser);

  useEffect(() => {
    if (!permissions.isAdmin) {
      return;
    }
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    try {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      await createTopicSuggestion(formData.text, tags, currentUser.uid);
      setFormData({ text: '', tags: '' });
      setShowCreateModal(false);
      await loadTopics();
      alert('Argomento creato con successo!');
    } catch (error) {
      console.error('Errore nella creazione:', error);
      alert('Errore nella creazione dell\'argomento');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;

    try {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      await updateTopicSuggestion(editingTopic.id, {
        text: formData.text,
        tags,
      });
      setFormData({ text: '', tags: '' });
      setEditingTopic(null);
      await loadTopics();
      alert('Argomento aggiornato con successo!');
    } catch (error) {
      console.error('Errore nell\'aggiornamento:', error);
      alert('Errore nell\'aggiornamento dell\'argomento');
    }
  };

  const handleStatusChange = async (topicId: string, newStatus: 'pending' | 'approved' | 'converted') => {
    try {
      await updateTopicSuggestion(topicId, { status: newStatus });
      await loadTopics();
      alert(`Status cambiato a ${newStatus} con successo!`);
    } catch (error) {
      console.error('Errore nel cambio status:', error);
      alert('Errore nel cambio status');
    }
  };

  const handleDelete = async (topicId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo argomento?')) {
      try {
        await deleteTopicSuggestion(topicId);
        await loadTopics();
        alert('Argomento eliminato con successo!');
      } catch (error) {
        console.error('Errore nell\'eliminazione:', error);
        alert('Errore nell\'eliminazione dell\'argomento');
      }
    }
  };

  const openEditModal = (topic: TopicSuggestion) => {
    setEditingTopic(topic);
    setFormData({
      text: topic.text,
      tags: topic.tags.join(', '),
    });
  };

  const resetForm = () => {
    setFormData({ text: '', tags: '' });
    setEditingTopic(null);
    setShowCreateModal(false);
  };

  // Filtro per ricerca
  const filteredTopics = topics.filter(topic =>
    topic.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Paginazione
  const indexOfLastTopic = currentPage * topicsPerPage;
  const indexOfFirstTopic = indexOfLastTopic - topicsPerPage;
  const currentTopics = filteredTopics.slice(indexOfFirstTopic, indexOfLastTopic);
  const totalPages = Math.ceil(filteredTopics.length / topicsPerPage);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'converted': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
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
        <div className="mb-8">
          <p className="mt-2 text-gray-600">Crea e gestisci gli argomenti che diventeranno gemme</p>
        </div>

        {/* Filtri e Azioni */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Cerca argomenti o tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tutti gli stati</option>
            <option value="pending">In attesa</option>
            <option value="approved">Approvati</option>
            <option value="converted">Convertiti</option>
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nuovo Argomento
          </button>
        </div>

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

        {/* Griglia Argomenti */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Caricamento argomenti...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {currentTopics.map((topic) => (
                <div key={topic.id} className="bg-white rounded-lg shadow border p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(topic.status)}`}>
                      {getStatusEmoji(topic.status)} {topic.status}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(topic)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(topic.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-3 line-clamp-3">
                    {topic.text}
                  </h3>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {topic.tags.map((tag, index) => (
                      <span key={index} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="text-xs text-gray-500 mb-4">
                    Creato il {new Date(topic.createdAt).toLocaleDateString('it-IT')}
                  </div>

                  {/* Cambio Status */}
                  <select
                    value={topic.status}
                    onChange={(e) => handleStatusChange(topic.id, e.target.value as any)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="pending">⏳ In attesa</option>
                    <option value="approved">✅ Approvato</option>
                    <option value="converted">💎 Convertito</option>
                  </select>
                </div>
              ))}
            </div>

            {/* Paginazione */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  ← Precedente
                </button>

                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-md text-sm ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Successivo →
                </button>
              </div>
            )}
          </>
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
                      Testo dell'argomento
                    </label>
                    <textarea
                      value={formData.text}
                      onChange={(e) => setFormData({...formData, text: e.target.value})}
                      required
                      rows={4}
                      placeholder="Descrivi l'argomento che vorresti sviluppare in una gemma..."
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
                      onClick={resetForm}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      {editingTopic ? 'Aggiorna' : 'Crea'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicManagement;
