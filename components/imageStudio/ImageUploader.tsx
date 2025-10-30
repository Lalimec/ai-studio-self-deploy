/// <reference lib="dom" />
import React, { useState, ChangeEvent } from 'react';
import { UploadIcon, PiTrashIcon, PiWarningIcon } from '../Icons';
import { AppFile } from '../../types';

interface ImageUploaderProps {
    onImageSelect: (files: File[]) => void;
    imagePreviewUrls: string[];
    onRemoveImage: (index: number) => void;
    onRemoveAll: () => void;
    imageFiles: AppFile[];
    inputImageWarnings: Record<string, string>;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, imagePreviewUrls, onRemoveImage, onRemoveAll, imageFiles, inputImageWarnings }) => {
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onImageSelect(Array.from(e.target.files));
        }
    };

    const handleDragEvent = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvent(e);
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvent(e);
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvent(e);
        setIsDraggingOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files && files.length > 0) {
            const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
            const validFiles = files.filter(file => acceptedTypes.includes((file as File).type));
            if (validFiles.length > 0) {
              onImageSelect(validFiles);
            }
        }
    };

    const numImages = imagePreviewUrls.length;

    return (
        <div className="w-full">
            <div 
                className={`flex justify-center items-center rounded-lg border-2 border-dashed px-4 py-4 transition-colors duration-300 relative ${numImages === 0 ? 'aspect-[8/5]' : ''} ${isDraggingOver ? 'border-[var(--color-primary-accent)] bg-[var(--color-bg-surface-light)]' : 'border-[var(--color-border-default)] hover:border-[var(--color-primary)]'}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragEvent}
                onDrop={handleDrop}
            >
                 {numImages > 0 && (
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveAll(); }}
                        className="absolute top-2 right-2 p-2 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-destructive)] focus:opacity-100 z-10"
                        aria-label="Remove all uploaded images"
                        title="Remove all images"
                    >
                        <PiTrashIcon className="w-5 h-5" />
                    </button>
                )}
                {numImages > 0 ? (
                    <div className="w-full columns-2 md:columns-3 gap-2">
                        {imagePreviewUrls.map((url, index) => {
                            const appFile = imageFiles[index];
                            const warning = appFile ? inputImageWarnings[appFile.id] : undefined;
                            return (
                               <div key={index} className="relative group break-inside-avoid mb-2">
                                    <img src={url} alt={`Preview ${index + 1}`} className="w-full h-auto block rounded-md shadow-sm" />
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onRemoveImage(index);
                                        }}
                                        className="absolute top-1 right-1 p-1 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[var(--color-destructive-hover)] focus:opacity-100"
                                        aria-label={`Remove image ${index + 1}`}
                                    >
                                        <PiTrashIcon className="w-4 h-4" />
                                    </button>
                                    {warning && (
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-[var(--color-warning-bg)] p-1 text-center text-xs text-[var(--color-text-main)] font-semibold flex items-center justify-center gap-1 rounded-b-md border-t border-[var(--color-warning-border)]"
                                            title={warning}
                                        >
                                            <PiWarningIcon className="w-4 h-4 flex-shrink-0 text-[var(--color-warning)]" />
                                            <span className="truncate">Invalid Ratio</span>
                                        </div>
                                    )}
                               </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-[var(--color-text-dim)] pointer-events-none">
                        <UploadIcon className="h-10 w-10 mb-3" />
                        <p className="text-md font-semibold text-center">Click or drag & drop</p>
                        <p className="text-xs leading-5 text-[var(--color-text-dimmer)] mt-1">Select one or more images (PNG, JPG, WEBP)</p>
                    </div>
                )}
                <input id="file-upload" name="file-upload" type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
            </div>
        </div>
    );
};