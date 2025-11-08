/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import EmbeddedImageCropper, { ImageCropperRef } from '../EmbeddedImageCropper';
import { dataURLtoFile } from '../../services/imageUtils';
import { CROP_RATIOS } from '../../constants';
import { PiCheckIcon, PiSpinnerIcon } from '../Icons';

interface MultiCropViewProps {
    files: File[];
    onConfirm: (croppedFiles: File[]) => void;
    onCancel: () => void;
}

export const MultiCropView: React.FC<MultiCropViewProps> = ({ files, onConfirm, onCancel }) => {
    const [aspectRatio, setAspectRatio] = useState(CROP_RATIOS.find(r => r.label === '4:5')?.value || 4/5);
    const cropperRefs = useRef<(ImageCropperRef | null)[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);

    useEffect(() => {
        cropperRefs.current = cropperRefs.current.slice(0, files.length);
    }, [files]);

    // Convert Files to data URLs (same approach as single-image cropper)
    useEffect(() => {
        const loadImages = async () => {
            const dataUrls = await Promise.all(
                files.map(file => {
                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            resolve(e.target?.result as string);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                })
            );
            setImageUrls(dataUrls);
        };
        loadImages();
    }, [files]);

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            const cropPromises = cropperRefs.current.map(ref => ref?.crop() || Promise.reject("Missing cropper ref"));
            const dataUrls = await Promise.all(cropPromises);
            const croppedFiles = dataUrls.map((dataUrl, index) => {
                const originalFile = files[index];
                return dataURLtoFile(dataUrl, `cropped_${originalFile.name}`);
            });
            onConfirm(croppedFiles);
        } catch (error) {
            console.error("Failed to crop images:", error);
            // Optionally show an error to the user
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[var(--color-bg-base)] z-50 p-4 sm:p-6 lg:p-8 flex flex-col animate-fade-in">
            <header className="flex-shrink-0 mb-6">
                <h1 className="text-3xl font-bold text-[var(--color-text-main)] text-center">Crop Your Images</h1>
                <p className="text-[var(--color-text-dim)] text-center mt-2">Adjust each image, then confirm to proceed.</p>
            </header>
            <div className="flex-shrink-0 mb-6 bg-[var(--color-bg-surface)]/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-[var(--color-border-muted)] sticky top-4 z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                 <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-[var(--color-text-light)]">Aspect Ratio:</label>
                    <div className="flex flex-wrap justify-center gap-2">
                        {CROP_RATIOS.map(ratioInfo => (
                            <button
                                key={ratioInfo.label}
                                onClick={() => setAspectRatio(ratioInfo.value)}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${aspectRatio === ratioInfo.value ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'}`}
                            >
                                {ratioInfo.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="w-full sm:w-auto flex items-center gap-4">
                    <button onClick={onCancel} className="w-full sm:w-auto text-sm font-semibold text-[var(--color-text-light)] hover:text-[var(--color-text-main)] py-2 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isProcessing}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-sm hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-ring)] disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isProcessing ? <PiSpinnerIcon className="animate-spin w-5 h-5"/> : <PiCheckIcon className="w-5 h-5"/>}
                        Confirm Crops
                    </button>
                </div>
            </div>
            <main className="flex-grow w-full max-w-7xl mx-auto overflow-y-auto custom-scrollbar">
                {imageUrls.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-[var(--color-text-dim)] text-lg">Loading images...</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {imageUrls.map((url, index) => (
                            <div key={`${files[index].name}-${index}`} className="flex flex-col gap-2">
                                 <EmbeddedImageCropper
                                    ref={el => { cropperRefs.current[index] = el; }}
                                    imageSrc={url}
                                    aspectRatio={aspectRatio}
                                />
                                <p className="text-xs text-[var(--color-text-dimmer)] truncate text-center" title={files[index].name}>{files[index].name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};