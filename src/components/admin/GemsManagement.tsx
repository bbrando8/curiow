import React, { useState, useEffect } from 'react';
import { Gem, Topic, Channel } from '../../types';
import {
  fetchAllGems,
  createGem,
  updateGem,
  deleteGem,
  searchGems,
  fetchAllChannels
} from '../../services/firestoreService';
import { useUserPermissions } from '../../services/roleService';
import AdminPageLayout from './AdminPageLayout';
import AdminConfirmationModal from './AdminConfirmationModal';

interface GemsManagementProps {
  currentUser: { role: any; permissions: any; uid?: string } | null;
  onBack: () => void;
}

interface GemFormData {
  title: string;
  description: string;
  channelId: string;
  imageUrl: string;
  tags: string[];
  suggestedQuestions: string[];
  sources: Array<{ uri: string; title: string }>;
}

const GemsManagement: React.FC<GemsManagementProps> = ({ currentUser, onBack }) => {
  const [gems, setGems] = useState<(Gem & { id: string })[]>([]);
  const [channels, setChannels] = useState<(Channel & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGem, setEditingGem] = useState<(Gem & { id: string }) | null>(null);

  // Filtri e ricerca
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'topic' | 'created'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [gemsPerPage, setGemsPerPage] = useState(10);

  // Accordion per descrizioni
  const [expandedGems, setExpandedGems] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState<GemFormData>({
    title: '',
    description: '',
    channelId: '',
    imageUrl: '',
    tags: [],
    suggestedQuestions: [],
    sources: []
  });

  // Modal di conferma
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: () => void;
    title: string;
    message: string;
  }>({
    isOpen: false,
    action: () => {},
    title: '',
    message: ''
  });

  const permissions = useUserPermissions(currentUser);

  useEffect(() => {
    loadGems();
    loadChannels();
  }, []);

  const loadGems = async () => {
    setLoading(true);
    try {
      const fetchedGems = await fetchAllGems();
      setGems(fetchedGems);
    } catch (error) {
      console.error('Error loading gems:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    setLoading(true);
    try {
      const fetchedChannels = await fetchAllChannels();
      setChannels(fetchedChannels);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      setLoading(true);
      try {
        const searchResults = await searchGems(searchTerm);
        setGems(searchResults);
      } catch (error) {
        console.error('Error searching gems:', error);
      } finally {
        setLoading(false);
      }
    } else {
      loadGems();
    }
  };

  const handleCreateGem = async () => {
    try {
      const newGemData: Omit<Gem, 'id'> = {
        ...formData,
        userQuestions: []
      };
      await createGem(newGemData);
      setShowCreateModal(false);
      resetForm();
      loadGems();
    } catch (error) {
      console.error('Error creating gem:', error);
    }
  };

  const handleUpdateGem = async () => {
    if (!editingGem) return;

    try {
      const updateData: Partial<Gem> = {
        title: formData.title,
        description: formData.description,
        channelId: formData.channelId,
        imageUrl: formData.imageUrl,
        tags: formData.tags,
        suggestedQuestions: formData.suggestedQuestions,
        sources: formData.sources
      };
      await updateGem(editingGem.id, updateData);
      setEditingGem(null);
      resetForm();
      loadGems();
    } catch (error) {
      console.error('Error updating gem:', error);
    }
  };

  const handleDeleteGem = async (gemId: string) => {
    try {
      await deleteGem(gemId);
      loadGems();
    } catch (error) {
      console.error('Error deleting gem:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      channelId: '',
      imageUrl: '',
      tags: [],
      suggestedQuestions: [],
      sources: []
    });
  };

  const openEditModal = (gem: Gem & { id: string }) => {
    setFormData({
      title: gem.title || '',
      description: gem.description || '',
      channelId: gem.channelId || '',
      imageUrl: gem.imageUrl || '',
      tags: gem.tags || [],
      suggestedQuestions: gem.suggestedQuestions || [],
      sources: gem.sources || []
    });
    setEditingGem(gem);
  };

  const toggleGemExpansion = (gemId: string) => {
    const newExpanded = new Set(expandedGems);
    if (newExpanded.has(gemId)) {
      newExpanded.delete(gemId);
    } else {
      newExpanded.add(gemId);
    }
    setExpandedGems(newExpanded);
  };

  // Filtraggio e ordinamento
  const filteredAndSortedGems = gems
    .filter(gem => {
      if (channelFilter !== 'all' && gem.channelId !== channelFilter) return false;
      if (tagFilter && !gem.tags?.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'topic':
          comparison = a.topic.localeCompare(b.topic);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Paginazione
  const indexOfLastGem = currentPage * gemsPerPage;
  const indexOfFirstGem = indexOfLastGem - gemsPerPage;
  const currentGems = filteredAndSortedGems.slice(indexOfFirstGem, indexOfLastGem);
  const totalPages = Math.ceil(filteredAndSortedGems.length / gemsPerPage);

  const addTag = () => {
    const tagInput = document.getElementById('newTag') as HTMLInputElement;
    if (tagInput && tagInput.value.trim()) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.value.trim()]
      });
      tagInput.value = '';
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };

  const addSuggestedQuestion = () => {
    const questionInput = document.getElementById('newQuestion') as HTMLInputElement;
    if (questionInput && questionInput.value.trim()) {
      setFormData({
        ...formData,
        suggestedQuestions: [...formData.suggestedQuestions, questionInput.value.trim()]
      });
      questionInput.value = '';
    }
  };

  const removeSuggestedQuestion = (index: number) => {
    setFormData({
      ...formData,
      suggestedQuestions: formData.suggestedQuestions.filter((_, i) => i !== index)
    });
  };

  const addSource = () => {
    const uriInput = document.getElementById('newSourceUri') as HTMLInputElement;
    const titleInput = document.getElementById('newSourceTitle') as HTMLInputElement;
    if (uriInput && titleInput && uriInput.value.trim() && titleInput.value.trim()) {
      setFormData({
        ...formData,
        sources: [...formData.sources, { uri: uriInput.value.trim(), title: titleInput.value.trim() }]
      });
      uriInput.value = '';
      titleInput.value = '';
    }
  };

  const removeSource = (index: number) => {
    setFormData({
      ...formData,
      sources: formData.sources.filter((_, i) => i !== index)
    });
  };

  return (
    <AdminPageLayout
      title="Gestione Gems"
      subtitle={`${filteredAndSortedGems.length} gems totali`}
      onBack={onBack}
    >
      {/* Filtri e controlli */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Ricerca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cerca gems
            </label>
            <div className="flex">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Titolo, descrizione, tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                🔍
              </button>
            </div>
          </div>

          {/* Filtro per canale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtra per canale
            </label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tutti i canali</option>
              {channels.map(channel => (
                <option key={channel.id} value={channel.id}>{channel.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro per tag */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtra per tag
            </label>
            <input
              type="text"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="Inserisci tag..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Ordinamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordina per
            </label>
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'title' | 'topic' | 'created')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="title">Titolo</option>
                <option value="topic">Topic</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Controlli azioni */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={loadGems}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              🔄 Ricarica
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Gems per pagina:</span>
              <select
                value={gemsPerPage}
                onChange={(e) => setGemsPerPage(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {permissions.canCreateGems && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              ➕ Nuova Gem
            </button>
          )}
        </div>
      </div>

      {/* Lista gems */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento gems...</p>
          </div>
        ) : currentGems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Nessuna gem trovata.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Topic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fonti
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentGems.map((gem) => (
                    <React.Fragment key={gem.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {gem.imageUrl && (
                              <img
                                src={gem.imageUrl}
                                alt={gem.title}
                                className="h-12 w-12 rounded-lg object-cover mr-4"
                              />
                            )}
                            <div>
                              <div className="flex items-center">
                                <h3 className="text-sm font-medium text-gray-900">
                                  {gem.title}
                                </h3>
                                <button
                                  onClick={() => toggleGemExpansion(gem.id)}
                                  className="ml-2 text-gray-400 hover:text-gray-600"
                                >
                                  {expandedGems.has(gem.id) ? '🔽' : '▶️'}
                                </button>
                              </div>
                              <p className="text-sm text-gray-500">
                                {gem.suggestedQuestions?.length || 0} domande suggerite
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {gem.topic}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {gem.tags?.slice(0, 3).map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                {tag}
                              </span>
                            ))}
                            {(gem.tags?.length || 0) > 3 && (
                              <span className="text-xs text-gray-500">
                                +{(gem.tags?.length || 0) - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {gem.sources?.length || 0} fonti
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {permissions.canEditGems && (
                              <button
                                onClick={() => openEditModal(gem)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                ✏️
                              </button>
                            )}
                            {permissions.canDeleteGems && (
                              <button
                                onClick={() => setConfirmModal({
                                  isOpen: true,
                                  action: () => handleDeleteGem(gem.id),
                                  title: 'Elimina Gem',
                                  message: `Sei sicuro di voler eliminare la gem "${gem.title}"? Questa azione non può essere annullata.`
                                })}
                                className="text-red-600 hover:text-red-900"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedGems.has(gem.id) && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50">
                            <div className="max-w-none">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Descrizione:</h4>
                              <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">
                                {gem.description}
                              </p>

                              {(gem.suggestedQuestions?.length || 0) > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">Domande suggerite:</h4>
                                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                    {gem.suggestedQuestions?.map((question, index) => (
                                      <li key={index}>{question}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {(gem.sources?.length || 0) > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">Fonti:</h4>
                                  <ul className="space-y-1">
                                    {gem.sources?.map((source, index) => (
                                      <li key={index} className="text-sm">
                                        <a
                                          href={source.uri}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                          {source.title}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginazione */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Mostrando {indexOfFirstGem + 1}-{Math.min(indexOfLastGem, filteredAndSortedGems.length)} di {filteredAndSortedGems.length} gems
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
          </>
        )}
      </div>

      {/* Modal per creare/modificare gem */}
      {(showCreateModal || editingGem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingGem ? 'Modifica Gem' : 'Nuova Gem'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingGem(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Colonna sinistra */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titolo *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Canale *
                    </label>
                    <select
                      value={formData.channelId}
                      onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Seleziona un canale</option>
                      {channels.map(channel => (
                        <option key={channel.id} value={channel.id}>{channel.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Immagine
                    </label>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        id="newTag"
                        placeholder="Nuovo tag..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Aggiungi
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Colonna destra */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrizione *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Domande Suggerite
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        id="newQuestion"
                        placeholder="Nuova domanda..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && addSuggestedQuestion()}
                      />
                      <button
                        type="button"
                        onClick={addSuggestedQuestion}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Aggiungi
                      </button>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {formData.suggestedQuestions.map((question, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm flex-1">{question}</span>
                          <button
                            type="button"
                            onClick={() => removeSuggestedQuestion(index)}
                            className="text-red-600 hover:text-red-800 ml-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fonti
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="url"
                        id="newSourceUri"
                        placeholder="URL fonte..."
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        id="newSourceTitle"
                        placeholder="Titolo fonte..."
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addSource}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 mb-2"
                    >
                      Aggiungi Fonte
                    </button>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {formData.sources.map((source, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{source.title}</div>
                            <div className="text-xs text-gray-500 truncate">{source.uri}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSource(index)}
                            className="text-red-600 hover:text-red-800 ml-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingGem(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={editingGem ? handleUpdateGem : handleCreateGem}
                  disabled={!formData.title || !formData.description || !formData.channelId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingGem ? 'Salva Modifiche' : 'Crea Gem'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal di conferma */}
      <AdminConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.action();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </AdminPageLayout>
  );
};

export default GemsManagement;
