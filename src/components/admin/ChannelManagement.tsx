import React, { useState, useEffect } from 'react';
import { Channel } from '../../types';
import {
  fetchAllChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  searchChannels
} from '../../services/firestoreService';
import { useUserPermissions } from '../../services/roleService';
import AdminPageLayout from './AdminPageLayout';
import AdminConfirmationModal from './AdminConfirmationModal';

interface ChannelManagementProps {
  currentUser: { role: any; permissions: any; uid?: string } | null;
  onBack: () => void;
}

interface ChannelFormData {
  name: string;
  description: string;
  isActive: boolean;
}

const ChannelManagement: React.FC<ChannelManagementProps> = ({ currentUser, onBack }) => {
  const [channels, setChannels] = useState<(Channel & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<(Channel & { id: string }) | null>(null);

  // Filtri e ricerca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [channelsPerPage, setChannelsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState<ChannelFormData>({
    name: '',
    description: '',
    isActive: true
  });

  // Modal di conferma
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: () => void;
    title: string;
    message: string;
    actionText: string;
    actionType?: 'primary' | 'danger';
  }>({
    isOpen: false,
    action: () => {},
    title: '',
    message: '',
    actionText: '',
    actionType: 'primary'
  });

  const permissions = useUserPermissions(currentUser);

  useEffect(() => {
    if (!permissions.canManageChannels) return;
    loadChannels();
  }, [permissions.canManageChannels]);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const fetchedChannels = await fetchAllChannels();
      setChannels(fetchedChannels);
    } catch (error) {
      console.error('Errore nel caricamento canali:', error);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      setLoading(true);
      try {
        const results = await searchChannels(searchTerm);
        setChannels(results);
      } catch (error) {
        console.error('Errore nella ricerca:', error);
      }
      setLoading(false);
    } else {
      loadChannels();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true
    });
    setEditingChannel(null);
  };

  const handleCreateChannel = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEditChannel = (channel: Channel & { id: string }) => {
    setFormData({
      name: channel.name,
      description: channel.description,
      isActive: channel.isActive
    });
    setEditingChannel(channel);
    setShowCreateModal(true);
  };

  const handleSaveChannel = async () => {
    if (!formData.name.trim()) {
      alert('Il nome del canale è obbligatorio');
      return;
    }

    try {
      if (editingChannel) {
        await updateChannel(editingChannel.id, formData);
      } else {
        await createChannel(formData);
      }

      setShowCreateModal(false);
      resetForm();
      loadChannels();
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      alert('Errore nel salvataggio del canale');
    }
  };

  const handleDeleteChannel = (channel: Channel & { id: string }) => {
    setConfirmModal({
      isOpen: true,
      title: 'Conferma eliminazione',
      message: `Sei sicuro di voler disattivare il canale "${channel.name}"? Questa azione può essere annullata riattivando il canale.`,
      actionText: 'Disattiva',
      actionType: 'danger',
      action: async () => {
        try {
          await deleteChannel(channel.id);
          loadChannels();
        } catch (error) {
          console.error('Errore nell\'eliminazione:', error);
          alert('Errore nell\'eliminazione del canale');
        }
      }
    });
  };

  const handleToggleStatus = (channel: Channel & { id: string }) => {
    const newStatus = !channel.isActive;
    setConfirmModal({
      isOpen: true,
      title: `Conferma ${newStatus ? 'attivazione' : 'disattivazione'}`,
      message: `Sei sicuro di voler ${newStatus ? 'attivare' : 'disattivare'} il canale "${channel.name}"?`,
      actionText: newStatus ? 'Attiva' : 'Disattiva',
      actionType: newStatus ? 'primary' : 'danger',
      action: async () => {
        try {
          await updateChannel(channel.id, { isActive: newStatus });
          loadChannels();
        } catch (error) {
          console.error('Errore nel cambio stato:', error);
          alert('Errore nel cambio stato del canale');
        }
      }
    });
  };

  // Filtri
  const filteredChannels = channels.filter(channel => {
    if (statusFilter === 'active' && !channel.isActive) return false;
    if (statusFilter === 'inactive' && channel.isActive) return false;
    return true;
  });

  // Paginazione
  const indexOfLastChannel = currentPage * channelsPerPage;
  const indexOfFirstChannel = indexOfLastChannel - channelsPerPage;
  const currentChannels = filteredChannels.slice(indexOfFirstChannel, indexOfLastChannel);
  const totalPages = Math.ceil(filteredChannels.length / channelsPerPage);

  if (!permissions.canManageChannels) {
    return (
      <AdminPageLayout title="Gestione Canali" onBack={onBack}>
        <div className="text-center py-8">
          <p className="text-gray-500">Non hai i permessi per accedere a questa sezione.</p>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      title="Gestione Canali"
      onBack={onBack}
      actions={
        <button
          onClick={handleCreateChannel}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Crea Nuovo Canale
        </button>
      }
    >
      {/* Filtri e ricerca */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cerca canali
            </label>
            <div className="flex">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome o descrizione..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="bg-gray-100 text-gray-700 px-4 py-2 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 transition-colors"
              >
                Cerca
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stato
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="active">Attivi</option>
              <option value="inactive">Disattivati</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canali per pagina
            </label>
            <select
              value={channelsPerPage}
              onChange={(e) => setChannelsPerPage(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={loadChannels}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Ricarica tutti i canali
          </button>
          <p className="text-sm text-gray-500">
            {filteredChannels.length} canali trovati
          </p>
        </div>
      </div>

      {/* Tabella canali */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Caricamento canali...</p>
          </div>
        ) : currentChannels.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nessun canale trovato.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Canale
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrizione
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Creazione
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentChannels.map((channel) => (
                    <tr key={channel.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {channel.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {channel.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          channel.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {channel.isActive ? 'Attivo' : 'Disattivato'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(channel.createdAt).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditChannel(channel)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => handleToggleStatus(channel)}
                            className={`${
                              channel.isActive
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {channel.isActive ? 'Disattiva' : 'Attiva'}
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
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
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
                      Successiva
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{indexOfFirstChannel + 1}</span> a{' '}
                        <span className="font-medium">
                          {Math.min(indexOfLastChannel, filteredChannels.length)}
                        </span>{' '}
                        di <span className="font-medium">{filteredChannels.length}</span> risultati
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
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Creazione/Modifica */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingChannel ? 'Modifica Canale' : 'Crea Nuovo Canale'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Canale *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome del canale"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrizione del canale"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Canale attivo
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveChannel}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingChannel ? 'Salva Modifiche' : 'Crea Canale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal di conferma */}
      <AdminConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        actionText={confirmModal.actionText}
        actionType={confirmModal.actionType}
      />
    </AdminPageLayout>
  );
};

export default ChannelManagement;
