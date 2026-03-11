import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const CustomToast: React.FC<ToastProps> = ({ message, type }) => {
  // Tailwind classes based on toast type
  const getColorClasses = () => {
    switch (type) {
      case 'error':
        return 'bg-red-500 text-white';
      case 'success':
        return 'bg-green-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div
      className={`fixed top-5 right-5 px-4 py-3 rounded-lg shadow-lg animate-fade-in ${getColorClasses()}`}
      role="alert"
    >
      {message}
    </div>
  );
};

export default CustomToast;
