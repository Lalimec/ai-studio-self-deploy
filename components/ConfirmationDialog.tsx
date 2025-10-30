import React from 'react';
import { AlertCircleIcon, CloseIcon } from './Icons';

interface ConfirmationDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  title?: string;
  confirmVariant?: 'primary' | 'destructive';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  title = 'Are you sure?',
  confirmVariant = 'destructive',
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);
  
  const confirmButtonClasses = {
      destructive: 'bg-[var(--color-destructive)] hover:bg-[var(--color-destructive-hover)] shadow-color-[var(--color-shadow-destructive)]/30',
      primary: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-color-[var(--color-shadow-primary)]/30',
  };

  return (
    <div
      className="fixed inset-0 bg-[var(--color-bg-base)] bg-opacity-80 flex items-center justify-center z-50 animate-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="bg-[var(--color-bg-surface)] rounded-2xl shadow-xl w-full max-w-md p-6 m-4 transform transition-all animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
           <h2 id="dialog-title" className="text-2xl font-bold text-[var(--color-text-main)] flex items-center gap-3">
             <AlertCircleIcon className="w-8 h-8 text-[var(--color-warning-accent)]" />
             {title}
           </h2>
           <button onClick={onCancel} className="p-1 rounded-full text-[var(--color-text-dim)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-main)] transition-colors" aria-label="Close dialog" title="Close dialog">
             <CloseIcon className="w-6 h-6" />
           </button>
        </div>
        
        <p className="text-[var(--color-text-light)] mb-6">{message}</p>
        
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-lg font-semibold text-[var(--color-text-main)] bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] transition-colors"
            title={cancelText}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 rounded-lg font-semibold text-white transition-colors shadow-md ${confirmButtonClasses[confirmVariant]}`}
            title={confirmText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;