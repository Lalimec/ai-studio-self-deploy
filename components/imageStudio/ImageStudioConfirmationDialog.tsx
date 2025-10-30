/// <reference lib="dom" />
import React from 'react';
import { PiWarningIcon } from '../Icons';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    onDownloadAndConfirm?: () => Promise<void>; // Make optional for general use
}
export const ImageStudioConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onCancel, onConfirm, onDownloadAndConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-[var(--color-bg-surface)] rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-[var(--color-warning-bg)]">
                   <PiWarningIcon className="h-6 w-6 text-[var(--color-warning)]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-main)] mt-4">Clear Gallery?</h3>
                <p className="mt-2 text-sm text-[var(--color-text-dim)]">
                    Uploading new images will clear all current results. Do you want to download the existing gallery first?
                </p>
                <div className="mt-6 flex flex-col gap-3">
                    {onDownloadAndConfirm && (
                        <button
                            onClick={onDownloadAndConfirm}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--color-primary)] text-base font-medium text-[var(--color-text-on-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-ring)] sm:text-sm"
                        >
                            Download & Continue
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--color-destructive)] text-base font-medium text-[var(--color-text-on-primary)] hover:bg-[var(--color-destructive-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-destructive)] sm:text-sm"
                    >
                        Clear Without Downloading
                    </button>
                    <button
                        onClick={onCancel}
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-[var(--color-border-default)] shadow-sm px-4 py-2 bg-[var(--color-bg-muted)] text-base font-medium text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-ring)] sm:text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};