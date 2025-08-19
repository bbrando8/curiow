import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { fetchAllUsers, searchUsers, promoteUserRole } from '../../services/firestoreService';
import { useUserPermissions } from '../../services/roleService';
import { ChevronLeftIcon } from '../icons';

interface UserManagementProps {
  currentUser: User | null;
  onBack: () => void;
}

// Modal di conferma per cambio ruolo
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

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, onBack }) => {
  const [users, setUsers] = useState<(User & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtri e ricerca
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');

  // Paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);

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

  const permissions = useUserPermissions(currentUser);

  useEffect(() => {
    if (!permissions.isAdmin) return;
    loadUsers();
  }, [permissions.isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const fetchedUsers = await fetchAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      setLoading(true);
      try {
        const searchResults = await searchUsers(searchTerm);
        setUsers(searchResults);
      } catch (error) {
        console.error('Errore nella ricerca:', error);
      }
      setLoading(false);
    } else {
      loadUsers();
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

  const handlePromoteUser = async (userId: string, newRole: UserRole, userName: string) => {
    const roleLabels = {
      [UserRole.USER]: 'Utente',
      [UserRole.MODERATOR]: 'Moderatore',
      [UserRole.ADMIN]: 'Amministratore',
      [UserRole.BETATESTER]: 'Beta Tester'
    } as const;

    showConfirmation(
      'Conferma cambio ruolo',
      `Sei sicuro di voler cambiare il ruolo di "${userName}" a "${roleLabels[newRole]}"?`,
      async () => {
        try {
          await promoteUserRole(userId, newRole);
          await loadUsers();
        } catch (error) {
          console.error('Errore nella promozione:', error);
        }
      },
      'Conferma'
    );
  };

  // Filtri combinati
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === '' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Paginazione
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Reset pagina quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole, usersPerPage]);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-red-100 text-red-800 border-red-200';
      case UserRole.MODERATOR: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case UserRole.BETATESTER: return 'bg-purple-100 text-purple-800 border-purple-200';
      case UserRole.USER: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleEmoji = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return '👑';
      case UserRole.MODERATOR: return '🛡️';
      case UserRole.BETATESTER: return '🧪';
      case UserRole.USER: return '👤';
      default: return '❓';
    }
  };

  const formatDate = (date: any) => {
    try {
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
        <h1 className="ml-4 text-xl font-bold text-slate-900 dark:text-white">Gestione Utenti</h1>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-600">{users.length}</div>
            <div className="text-sm text-gray-600">Totali</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-green-600">{users.filter(u => u.role === UserRole.USER).length}</div>
            <div className="text-sm text-gray-600">Utenti</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-purple-600">{users.filter(u => u.role === UserRole.BETATESTER).length}</div>
            <div className="text-sm text-gray-600">Beta Tester</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-yellow-600">{users.filter(u => u.role === UserRole.MODERATOR).length}</div>
            <div className="text-sm text-gray-600">Moderatori</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-red-600">{users.filter(u => u.role === UserRole.ADMIN).length}</div>
            <div className="text-sm text-gray-600">Amministratori</div>
          </div>
        </div>

        {/* Filtri e ricerca */}
        <div className="bg-white rounded-lg shadow border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cerca utenti</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cerca per email o nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  🔍
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtra per ruolo</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tutti i ruoli</option>
                <option value={UserRole.USER}>👤 Utenti</option>
                <option value={UserRole.BETATESTER}>🧪 Beta Tester</option>
                <option value={UserRole.MODERATOR}>🛡️ Moderatori</option>
                <option value={UserRole.ADMIN}>👑 Amministratori</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Elementi per pagina</label>
              <select
                value={usersPerPage}
                onChange={(e) => setUsersPerPage(Number(e.target.value))}
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
                onClick={loadUsers}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                🔄 Aggiorna
              </button>
            </div>
          </div>
        </div>

        {/* Tabella */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Caricamento utenti...</span>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ruolo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data registrazione
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-semibold text-sm">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeColor(user.role)}`}>
                          {getRoleEmoji(user.role)} {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {user.role !== UserRole.ADMIN && (
                            <select
                              onChange={(e) => {
                                if (e.target.value && e.target.value !== user.role) {
                                  handlePromoteUser(user.id, e.target.value as UserRole, `${user.firstName} ${user.lastName}`);
                                  e.target.value = ''; // Reset selection
                                }
                              }}
                              defaultValue=""
                              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                            >
                              <option value="">Cambia ruolo</option>
                              {user.role !== UserRole.USER && <option value={UserRole.USER}>👤 → Utente</option>}
                              {user.role !== UserRole.BETATESTER && <option value={UserRole.BETATESTER}>🧪 → Beta Tester</option>}
                              {user.role !== UserRole.MODERATOR && <option value={UserRole.MODERATOR}>🛡️ → Moderatore</option>}
                              {user.role !== UserRole.ADMIN && <option value={UserRole.ADMIN}>👑 → Admin</option>}
                            </select>
                          )}
                          {user.role === UserRole.ADMIN && (
                            <span className="text-xs text-gray-500 italic">Admin protetto</span>
                          )}
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
                      Mostrando <span className="font-medium">{indexOfFirstUser + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> di{' '}
                      <span className="font-medium">{filteredUsers.length}</span> risultati
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

export default UserManagement;

