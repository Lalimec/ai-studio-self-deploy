import React from 'react';
import { DownloadIcon } from './Icons';

interface DownloadProgressModalProps {
  message: string;
  progress: number; // 0-100
}

const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({ message, progress }) => {
  // Split the message into a status and an optional detail (e.g., a filename)
  const [status, detail] = message.includes(':') ? message.split(/:(.*)/s) : [message, ''];
  const statusText = status + (detail ? ':' : '');
  const detailText = detail.trim();
  
  return (
    <div
      className="fixed inset-0 bg-[var(--color-bg-base)] bg-opacity-70 flex items-center justify-center z-[100] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-dialog-title"
    >
      <div className="bg-[var(--color-bg-surface)] rounded-2xl shadow-xl w-full max-w-md p-8 m-4 flex flex-col items-center text-center">
        <DownloadIcon className="w-12 h-12 text-[var(--color-primary-accent)] mb-4" />
        <h2 id="progress-dialog-title" className="text-2xl font-bold text-[var(--color-text-main)] mb-2">
          Preparing Your Download
        </h2>
        
        <div className="text-[var(--color-text-dim)] mb-6 w-full min-h-[4.5rem] flex flex-col justify-center items-center">
          <p>{statusText}</p>
          {detailText && (
            <code className="mt-2 block w-full text-xs bg-[var(--color-bg-base)] text-[var(--color-primary-accent)] p-2 rounded-md break-all font-mono shadow-inner">
              {detailText}
            </code>
          )}
        </div>

        <div className="w-full bg-[var(--color-bg-muted)] rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[var(--color-primary-accent)] to-[var(--color-secondary)] h-4 rounded-full transition-all duration-300 ease-linear"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default DownloadProgressModal;