

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
            <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
                <h3 className="text-lg font-semibold text-slate-900 mt-4">Crop Images?</h3>
                <p className="mt-2 text-sm text-slate-500">
                    Crop your images to a consistent aspect ratio for better results, or use the original images.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                    <button
                        onClick={onCrop}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-violet-600 text-base font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 sm:text-sm"
                    >
                        Crop Images
                    </button>
                    <button
                        onClick={onUseOriginals}
                        className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    >
                        Use Originals
                    </button>
                     <button
                        onClick={onCancel}
                        type="button"
                        className="w-full inline-flex justify-center text-sm text-slate-500 hover:text-slate-700"
                    >
                        Cancel Upload
                    </button>
                </div>
            </div>
        </div>
    );
};