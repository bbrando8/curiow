import React from 'react';

interface GemDetailChatProps {
  isChatOpen: boolean;
  onCloseChat: () => void;
  children?: React.ReactNode;
}

const GemDetailChat: React.FC<GemDetailChatProps> = ({ isChatOpen, onCloseChat, children }) => {
  if (!isChatOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 max-w-lg w-full relative">
        <button
          className="absolute top-2 right-2 text-slate-500 hover:text-red-500"
          onClick={onCloseChat}
        >
          Chiudi
        </button>
        {children}
      </div>
    </div>
  );
};

export default GemDetailChat;

