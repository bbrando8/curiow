import React from 'react';

interface GemDetailTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const GemDetailTabs: React.FC<GemDetailTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex gap-2 mt-6 mb-4">
      <button
        className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'tips' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
        onClick={() => setActiveTab('tips')}
      >
        Tips
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'saggio' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
        onClick={() => setActiveTab('saggio')}
      >
        Saggio
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'approfondimenti' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
        onClick={() => setActiveTab('approfondimenti')}
      >
        Approfondimenti
      </button>
    </div>
  );
};

export default GemDetailTabs;

