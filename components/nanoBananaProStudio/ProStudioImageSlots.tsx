import React, { useCallback, useState } from 'react';
import { PiTrashIcon, UploadIcon } from '../Icons';
import { AppFile } from '../../types';

interface ProStudioImageSlotsProps {
    imageFiles: AppFile[];
    imagePreviewUrls: string[];
    onFilesSelected: (files: File[], startSlot?: number) => void;
    onRemoveImage: (id: string) => void;
    maxImages?: number;
}

export const ProStudioImageSlots: React.FC<ProStudioImageSlotsProps> = ({
    imageFiles,
    imagePreviewUrls,
    onFilesSelected,
    onRemoveImage,
    maxImages = 6
}) => {
    const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

    const handleDrop = useCallback((e: React.DragEvent, slotIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverSlot(null);

        const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
        );

        if (files.length > 0) {
            onFilesSelected(files, slotIndex);
        }
    }, [onFilesSelected]);

    const handleDragOver = useCallback((e: React.DragEvent, slotIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverSlot(slotIndex);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverSlot(null);
    }, []);

    const handleClick = useCallback((slotIndex: number) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length > 0) {
                onFilesSelected(files, slotIndex);
            }
        };
        input.click();
    }, [onFilesSelected]);

    const slots = Array.from({ length: maxImages }, (_, index) => {
        const imageFile = imageFiles[index];
        const previewUrl = imagePreviewUrls[index];
        const hasImage = !!imageFile;
        const isDragOver = dragOverSlot === index;

        return (
            <div
                key={index}
                className={`
                    relative aspect-square rounded-xl border-2 border-dashed
                    transition-all duration-200
                    ${hasImage
                        ? 'border-[var(--color-border-default)] bg-[var(--color-bg-base)]'
                        : isDragOver
                            ? 'border-[var(--color-primary-accent)] bg-[var(--color-bg-surface)]'
                            : 'border-[var(--color-border-default)] hover:border-[var(--color-primary)]'
                    }
                    ${!hasImage ? 'cursor-pointer' : ''}
                `}
                onDrop={(e) => !hasImage && handleDrop(e, index)}
                onDragOver={(e) => !hasImage && handleDragOver(e, index)}
                onDragLeave={(e) => !hasImage && handleDragLeave(e)}
                onClick={() => !hasImage && handleClick(index)}
            >
                {hasImage && previewUrl ? (
                    <div className="group relative w-full h-full">
                        <img
                            src={previewUrl}
                            alt={`Image ${index + 1}`}
                            className="w-full h-full object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-xl flex items-center justify-center">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveImage(imageFile.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-[var(--color-destructive)] hover:bg-[var(--color-destructive-hover)] rounded-full text-white"
                                aria-label={`Remove image ${index + 1}`}
                            >
                                <PiTrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-dim)] pointer-events-none p-4">
                        <UploadIcon className="h-10 w-10 mb-2" />
                        <p className="text-xs font-semibold text-center">Click or drag & drop</p>
                    </div>
                )}
            </div>
        );
    });

    return (
        <div className="w-full">
            <div className="grid grid-cols-2 gap-3">
                {slots}
            </div>
        </div>
    );
};
