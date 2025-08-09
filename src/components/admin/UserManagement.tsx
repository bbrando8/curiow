import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { fetchAllUsers, searchUsers, promoteUserRole } from '../../services/firestoreService';
import { useUserPermissions } from '../../services/roleService';

interface UserManagementProps {
  currentUser: User | null;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<(User & { id: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');

  const permissions = useUserPermissions(currentUser);

  useEffect(() => {
    if (!permissions.isAdmin) {
      return; // Solo gli admin possono accedere a questa pagina
    }
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

  const handlePromoteUser = async (userId: string, newRole: UserRole) => {
    try {
      await promoteUserRole(userId, newRole);
      await loadUsers(); // Ricarica la lista
      alert(`Utente promosso a ${newRole} con successo!`);
    } catch (error) {
      console.error('Errore nella promozione:', error);
      alert('Errore nella promozione utente');
    }
  };

  const filteredUsers = selectedRole
    ? users.filter(user => user.role === selectedRole)
    : users;

  // Paginazione
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-red-100 text-red-800';
      case UserRole.MODERATOR: return 'bg-yellow-100 text-yellow-800';
      case UserRole.USER: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestione Utenti</h1>
        <p className="mt-2 text-gray-600">Gestisci i ruoli e i permessi degli utenti</p>
      </div>

      {/* Filtri e Ricerca */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca per email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
            >
              🔍
            </button>
          </div>
        </div>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as UserRole | '')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tutti i ruoli</option>
          <option value={UserRole.USER}>Utenti</option>
          <option value={UserRole.MODERATOR}>Moderatori</option>
          <option value={UserRole.ADMIN}>Amministratori</option>
        </select>

        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Aggiorna
        </button>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === UserRole.USER).length}</div>
          <div className="text-sm text-gray-600">Utenti</div>
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

      {/* Tabella Utenti */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento utenti...</p>
          </div>
        ) : (
          <>
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
                    Registrato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {user.role !== UserRole.ADMIN && (
                        <select
                          onChange={(e) => {
                            if (e.target.value && e.target.value !== user.role) {
                              handlePromoteUser(user.id, e.target.value as UserRole);
                            }
                          }}
                          defaultValue=""
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">Cambia ruolo</option>
                          {user.role !== UserRole.USER && <option value={UserRole.USER}>→ Utente</option>}
                          {user.role !== UserRole.MODERATOR && <option value={UserRole.MODERATOR}>→ Moderatore</option>}
                          {user.role !== UserRole.ADMIN && <option value={UserRole.ADMIN}>→ Admin</option>}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
