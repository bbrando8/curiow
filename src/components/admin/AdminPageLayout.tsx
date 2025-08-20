import React from 'react';
import { ChevronLeftIcon } from '../icons';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserRole } from '../../types';

interface AdminPageLayoutProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  withSidebar?: boolean;
  currentUserRole?: UserRole;
}

const menuItems = [
  { to: '/admin/gems', label: 'Gems', icon: '💎', roles: [UserRole.ADMIN] },
  { to: '/admin/users', label: 'Utenti', icon: '👥', roles: [UserRole.ADMIN] },
  { to: '/admin/topics', label: 'Argomenti', icon: '💡', roles: [UserRole.ADMIN] },
  { to: '/admin/channels', label: 'Canali', icon: '📺', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
  { to: '/admin/feedback', label: 'Feedback', icon: '💬', roles: [UserRole.ADMIN] },
];

const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  title,
  onBack,
  children,
  actions,
  withSidebar = true,
  currentUserRole
}) => {
  const navigate = useNavigate();
  const filteredMenu = withSidebar
    ? menuItems.filter(mi => !currentUserRole || mi.roles.includes(currentUserRole))
    : [];

  if (!withSidebar) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={onBack}
                  className="mr-4 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
              </div>
              {actions && (
                <div className="flex items-center space-x-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 lg:w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 px-4 flex items-center border-b border-gray-200">
          <button onClick={() => navigate('/')} className="text-lg font-bold text-indigo-600">Curiow Admin</button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredMenu.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <span className="mr-2">{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
            {actions && <div className="flex items-center space-x-3">{actions}</div>}
          </div>
        </div>
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminPageLayout;
