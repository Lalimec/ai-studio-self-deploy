import React from 'react';
import { Toast as ToastType } from '../types';
import { CloseIcon, AlertCircleIcon } from './Icons';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 7000); // 7 seconds until auto-dismiss

    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, onRemove]);
  
  const bgColor = {
      error: 'bg-[var(--color-destructive)]',
      success: 'bg-[var(--color-success)]',
      info: 'bg-[var(--color-primary)]',
  }[toast.type];

  const icon = {
      error: <AlertCircleIcon className="w-6 h-6" />,
      success: null, // Add success icon later if needed
      info: null, // Add info icon later if needed
  }[toast.type];

  return (
    <div 
        className={`relative flex items-start w-full max-w-sm p-4 text-[var(--color-text-on-primary)] ${bgColor} rounded-lg shadow-lg animate-fade-in mb-4`}
        role="alert"
        aria-live="assertive"
    >
      {icon && <div className="flex-shrink-0 mr-3">{icon}</div>}
      <div className="flex-1 mr-4">
        <p className="text-sm font-semibold break-all">{toast.message}</p>
      </div>
      <button onClick={() => onRemove(toast.id)} className="p-1 -m-1 rounded-full hover:bg-white/20" aria-label="Dismiss" title="Dismiss notification">
        <CloseIcon className="w-5 h-5" />
      </button>
    </div>
  );
};


interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: number) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-[100]">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

export default ToastContainer;