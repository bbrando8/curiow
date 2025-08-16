import React from 'react';

interface AdminConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  actionText: string;
  actionType?: 'primary' | 'danger';
}

const AdminConfirmationModal: React.FC<AdminConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  actionText,
  actionType = 'primary'
}) => {
  if (!isOpen) return null;

  const actionButtonClass = actionType === 'danger'
    ? "px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
    : "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors";

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
            className={actionButtonClass}
          >
            {actionText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminConfirmationModal;
