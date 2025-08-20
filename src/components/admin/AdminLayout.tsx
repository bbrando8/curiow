import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { User, UserRole } from '../../types';

interface AdminLayoutProps {
  currentUser: User | null;
}

const menuItems = [
  { to: '/admin/gems', label: 'Gems', icon: '💎', roles: [UserRole.ADMIN] },
  { to: '/admin/users', label: 'Utenti', icon: '👥', roles: [UserRole.ADMIN] },
  { to: '/admin/topics', label: 'Argomenti', icon: '💡', roles: [UserRole.ADMIN] },
  { to: '/admin/channels', label: 'Canali', icon: '📺', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
  { to: '/admin/feedback', label: 'Feedback', icon: '💬', roles: [UserRole.ADMIN] },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ currentUser }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const filtered = menuItems.filter(mi => currentUser && mi.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="w-60 lg:w-72 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
        <div className="h-16 px-4 flex items-center border-b border-gray-200 dark:border-slate-700">
          <button onClick={()=>navigate('/')} className="text-xl font-bold text-indigo-600">Curiow Admin</button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filtered.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <span className="mr-2 text-base">{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>
        {currentUser && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <div className="font-semibold text-slate-700 dark:text-slate-200">{currentUser.firstName} {currentUser.lastName}</div>
            <div className="uppercase tracking-wide mt-0.5">{currentUser.role}</div>
          </div>
        )}
      </aside>
      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;

