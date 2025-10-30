/// <reference lib="dom" />
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ImageCropper, { ImageCropperRef } from '../ImageCrop';
import { dataURLtoFile } from '../utils/fileUtils';
import { CROP_RATIOS } from '../constants';
import { PiCheck, PiSpinner } from 'react-icons/pi';

interface MultiCropViewProps {
    files: File[];
    onConfirm: (croppedFiles: File[]) => void;
    onCancel: () => void;
}

export const MultiCropView: React.FC<MultiCropViewProps> = ({ files, onConfirm, onCancel }) => {
    const [aspectRatio, setAspectRatio] = useState(CROP_RATIOS.find(r => r.label === '4:5')?.value || 4/5);
    const cropperRefs = useRef<(ImageCropperRef | null)[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        cropperRefs.current = cropperRefs.current.slice(0, files.length);
    }, [files]);
    
    const imageUrls = useMemo(() => files.map(file => URL.createObjectURL(file)), [files]);
    useEffect(() => {
        return () => imageUrls.forEach(url => URL.revokeObjectURL(url));
    }, [imageUrls]);

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
        <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8 flex flex-col">
            <header className="flex-shrink-0 mb-6">
                <h1 className="text-3xl font-bold text-slate-800 text-center">Crop Your Images</h1>
                <p className="text-slate-500 text-center mt-2">Adjust each image, then confirm to proceed.</p>
            </header>
            <div className="flex-shrink-0 mb-6 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 sticky top-4 z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                 <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700">Aspect Ratio:</label>
                    <div className="flex flex-wrap justify-center gap-2">
                        {CROP_RATIOS.map(ratioInfo => (
                            <button
                                key={ratioInfo.label}
                                onClick={() => setAspectRatio(ratioInfo.value)}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${aspectRatio === ratioInfo.value ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-violet-200'}`}
                            >
                                {ratioInfo.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="w-full sm:w-auto flex items-center gap-4">
                    <button onClick={onCancel} className="w-full sm:w-auto text-sm font-semibold text-slate-600 hover:text-slate-800 py-2 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isProcessing}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isProcessing ? <PiSpinner className="animate-spin w-5 h-5"/> : <PiCheck className="w-5 h-5"/>}
                        Confirm Crops
                    </button>
                </div>
            </div>
            <main className="flex-grow w-full max-w-7xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {imageUrls.map((url, index) => (
                        <div key={url} className="flex flex-col gap-2">
                             <ImageCropper
                                ref={el => { cropperRefs.current[index] = el; }}
                                imageSrc={url}
                                aspectRatio={aspectRatio}
                            />
                            <p className="text-xs text-slate-500 truncate text-center" title={files[index].name}>{files[index].name}</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};