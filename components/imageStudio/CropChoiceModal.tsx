/// <reference lib="dom" />
import React from 'react';

interface CropChoiceModalProps {
    isOpen: boolean;
    onCrop: () => void;
    onUseOriginals: () => void;
    onCancel: () => void;
}
export const CropChoiceModal: React.FC<CropChoiceModalProps> = ({ isOpen, onCrop, onUseOriginals, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-[var(--color-bg-surface)] rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
                <h3 className="text-lg font-semibold text-[var(--color-text-main)] mt-4">Crop Images?</h3>
                <p className="mt-2 text-sm text-[var(--color-text-dim)]">
                    Crop your images to a consistent aspect ratio for better results, or use the original images.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                    <button
                        onClick={onCrop}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--color-primary)] text-base font-medium text-[var(--color-text-on-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-ring)] sm:text-sm"
                    >
                        Crop Images
                    </button>
                    <button
                        onClick={onUseOriginals}
                        className="w-full inline-flex justify-center rounded-md border border-[var(--color-border-default)] shadow-sm px-4 py-2 bg-[var(--color-bg-muted)] text-base font-medium text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-ring)] sm:text-sm"
                    >
                        Use Originals
                    </button>
                     <button
                        onClick={onCancel}
                        type="button"
                        className="w-full inline-flex justify-center text-sm text-[var(--color-text-dim)] hover:text-[var(--color-text-light)]"
                    >
                        Cancel Upload
                    </button>
                </div>
            </div>
        </div>
    );
};