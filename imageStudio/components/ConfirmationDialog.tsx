import React from 'react';
// FIX: The ConfirmationDialog component was generic and did not support the `isOpen` or `onDownloadAndConfirm` props.
// This update transforms it into the specific dialog required by `imageStudio/App.tsx` to handle clearing the gallery,
// adding the necessary props and logic for three actions (Download & Continue, Clear, Cancel) and visibility control.
import { AlertCircleIcon } from '../../components/Icons';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onDownloadAndConfirm?: () => Promise<void>;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  onDownloadAndConfirm,
}) => {
  if (!isOpen) {
    return null;
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-amber-100">
          <AlertCircleIcon className="h-6 w-6 text-amber-500" aria-hidden="true" />
        </div>
        <h3 id="dialog-title" className="text-lg font-semibold text-slate-900 mt-4">Clear Gallery?</h3>
        <p className="mt-2 text-sm text-slate-500">
          Uploading new images will clear all current results. Do you want to download the existing gallery first?
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {onDownloadAndConfirm && (
            <button
              onClick={onDownloadAndConfirm}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-violet-600 text-base font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 sm:text-sm"
            >
              Download & Continue
            </button>
          )}
          <button
            onClick={onConfirm}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
          >
            Clear Without Downloading
          </button>
          <button
            onClick={onCancel}
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
