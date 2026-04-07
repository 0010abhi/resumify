import React, { createContext, useState, useContext } from 'react';
import CustomToast from '../components/app-components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | 'warning';
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider = ({ children }: { children: any }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    // Auto-hide after 5 seconds
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <ToastContext.Provider value={{ showToast, toastMessage, toastType }}>
      {children}
      {toastMessage && <CustomToast message={toastMessage} type={toastType} />}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
