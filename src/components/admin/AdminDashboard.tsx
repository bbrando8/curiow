import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { useUserPermissions } from '../../services/roleService';
import UserManagement from './UserManagement';
import TopicManagement from './TopicManagement';
import FeedbackManagement from './FeedbackManagement';
import ChannelManagement from './ChannelManagement';
import GemsManagement from './GemsManagement';

interface AdminDashboardProps {
  currentUser: User & { id: string } | null;
  onClose: () => void;
}

type DashboardView = 'users' | 'topics' | 'feedback' | 'channels' | 'gems';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onClose }) => {
  const [activeView, setActiveView] = useState<DashboardView>('gems');
  const permissions = useUserPermissions(currentUser);

  const menuItems = [
    {
      id: 'gems' as DashboardView,
      label: 'Gestione Gems',
      icon: '💎',
      description: 'Gestisci le gems e i loro contenuti',
      allowedForAll: false,
      requiresAdmin: true,
    },
    {
      id: 'users' as DashboardView,
      label: 'Gestione Utenti',
      icon: '👥',
      description: 'Gestisci ruoli e permessi degli utenti',
      allowedForAll: false,
      requiresAdmin: true,
    },
    {
      id: 'topics' as DashboardView,
      label: 'Gestione Argomenti',
      icon: '💡',
      description: 'Crea e gestisci gli argomenti per le gemme',
      allowedForAll: false,
      requiresAdmin: true,
    },
    {
      id: 'channels' as DashboardView,
      label: 'Gestione Canali',
      icon: '📺',
      description: 'Gestisci i canali per le trasmissioni',
      allowedForAll: false,
      requiresChannelPermission: true,
    },
    {
      id: 'feedback' as DashboardView,
      label: 'Feedback Tester',
      icon: '💬',
      description: 'Visualizza e gestisci i feedback dei betatester',
      allowedForAll: false,
      requiresAdmin: true,
    },
  ];

  const visibleMenuItems = menuItems.filter(item =>
    item.allowedForAll ||
    (item.requiresAdmin && permissions.isAdmin) ||
    (item.requiresChannelPermission && permissions.canManageChannels)
  );

  const renderActiveView = () => {
    if (!currentUser) return null;

    switch (activeView) {
      case 'users':
        return permissions.isAdmin ? <UserManagement currentUser={currentUser} onBack={() => setActiveView('gems')} /> : null;
      case 'topics':
        return permissions.isAdmin ? (
          <TopicManagement
            currentUser={{ ...currentUser, uid: currentUser.id }}
            onBack={() => setActiveView('gems')}
          />
        ) : null;
      case 'feedback':
        return permissions.isAdmin ? <FeedbackManagement onBack={() => setActiveView('gems')} /> : null;
      case 'channels':
        return permissions.canManageChannels ? (
          <ChannelManagement
            currentUser={currentUser}
            onBack={() => setActiveView('gems')}
          />
        ) : null;
      case 'gems':
        return permissions.isAdmin ? (
          <GemsManagement
            currentUser={currentUser}
            onBack={() => setActiveView('gems')}
          />
        ) : null;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-red-100 text-red-800';
      case UserRole.MODERATOR: return 'bg-yellow-100 text-yellow-800';
      case UserRole.USER: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-hidden">
      <div className="h-full flex">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {currentUser && (
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">
                    {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {currentUser.firstName} {currentUser.lastName}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Menu */}
          <nav className="flex-1 p-3">
            <ul className="space-y-1">
              {visibleMenuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveView(item.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeView === item.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Curiow Dashboard v1.0
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {renderActiveView()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
