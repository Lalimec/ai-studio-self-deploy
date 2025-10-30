import React, { useState, ChangeEvent } from 'react';
import { PiUploadSimple, PiTrash } from 'react-icons/pi';

interface ImageUploaderProps {
    onImageSelect: (files: File[]) => void;
    imagePreviewUrls: string[];
    onRemoveImage: (index: number) => void;
    setId: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, imagePreviewUrls, onRemoveImage, setId }) => {
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

        const files = Array.from((e.dataTransfer as any).files as FileList);
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
             <div className="flex justify-between items-baseline mb-2">
                <label htmlFor="file-upload" className="block text-sm font-medium text-slate-700">1. Upload Character Image(s)</label>
                {setId && (
                    <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-1 rounded">
                        Set ID: {setId}
                    </span>
                )}
            </div>
            <div 
                className={`mt-1 flex justify-center items-center rounded-lg border-2 border-dashed px-4 py-4 transition-colors duration-300 bg-slate-50 relative min-h-[192px] ${isDraggingOver ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-violet-400'}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragEvent}
                onDrop={handleDrop}
            >
                {numImages > 0 ? (
                    numImages === 1 ? (
                        <div className="w-full text-center">
                            <div className="relative group inline-block">
                                <img 
                                    src={imagePreviewUrls[0]} 
                                    alt="Preview 1" 
                                    className="max-h-48 w-auto mx-auto h-auto rounded-md shadow-sm" 
                                />
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveImage(0); }}
                                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-600 focus:opacity-100"
                                    aria-label="Remove image 1"
                                >
                                    <PiTrash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full columns-2 md:columns-3 gap-2">
                            {imagePreviewUrls.map((url, index) => (
                               <div key={index} className="relative group break-inside-avoid mb-2">
                                    <img src={url} alt={`Preview ${index + 1}`} className="w-full h-auto block rounded-md shadow-sm" />
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onRemoveImage(index);
                                        }}
                                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 focus:opacity-100"
                                        aria-label={`Remove image ${index + 1}`}
                                    >
                                        <PiTrash className="w-4 h-4" />
                                    </button>
                               </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="text-center pointer-events-none">
                        <PiUploadSimple className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="mt-4 flex text-sm leading-6 text-slate-600">
                            <p className="pl-1">Click to upload or drag and drop</p>
                        </div>
                        <p className="text-xs leading-5 text-slate-500">Select one or more images (PNG, JPG, WEBP)</p>
                    </div>
                )}
                <input id="file-upload" name="file-upload" type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
            </div>
        </div>
    );
};