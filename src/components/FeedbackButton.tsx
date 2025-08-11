import React, { useState, forwardRef, useImperativeHandle } from 'react';

interface FeedbackButtonProps {
  onClick: () => void;
}

export interface FeedbackButtonRef {
  showSuccess: () => void;
}

const FeedbackButton = forwardRef<FeedbackButtonRef, FeedbackButtonProps>(({ onClick }, ref) => {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = () => {
    onClick();
  };

  const showSuccessAnimation = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  useImperativeHandle(ref, () => ({
    showSuccess: showSuccessAnimation
  }));

  return (
    <button
      onClick={handleClick}
      className={`fixed right-6 top-1/2 transform -translate-y-1/2 z-40
                 ${showSuccess ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white
                 rounded-full p-4 shadow-lg transition-all duration-300
                 hover:scale-110 focus:outline-none focus:ring-4
                 ${showSuccess ? 'focus:ring-green-300' : 'focus:ring-blue-300'}`}
      title="Dai feedback"
    >
      {showSuccess ? (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      )}
    </button>
  );
});

FeedbackButton.displayName = 'FeedbackButton';

export default FeedbackButton;
