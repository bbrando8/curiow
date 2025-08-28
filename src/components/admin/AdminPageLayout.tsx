import React from 'react';
import { ChevronLeftIcon } from '../icons';

interface AdminPageLayoutProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  title,
  onBack,
  children,
  actions
}) => {
  return (
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
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto bg-gray-50">
        {children}
      </div>
    </div>
  );
};

export default AdminPageLayout;
