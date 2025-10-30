import React, { useState } from 'react';
import { PiDownloadSimple, PiX, PiWarning, PiSpinner, PiCube, PiTrash } from 'react-icons/pi';
import { GenerationResult, AppFile } from '../types';
import { ProgressBar } from './ProgressBar';
import { sanitizeFilename } from '../utils/fileUtils';

interface GeneratedImageDisplayProps {
    generationResults: GenerationResult[];
    isLoading: boolean;
    error: string | null;
    onImageClick: (url: string) => void;
    onDownloadAll: () => void;
    onRetryAll: () => void;
    onRetryOne: (key: string) => void;
    onClearGallery: () => void;
    onRemoveImage: (key: string) => void;
    includeOriginals: boolean;
    onIncludeOriginalsChange: (checked: boolean) => void;
    imageFiles: AppFile[];
    filenameTemplate: string;
    progress: { completed: number; total: number; };
    setId: string;
}

export const GeneratedImageDisplay: React.FC<GeneratedImageDisplayProps> = ({ 
    generationResults, isLoading, error, onImageClick, onDownloadAll, 
    onRetryAll, onRetryOne, onClearGallery, onRemoveImage,
    includeOriginals, onIncludeOriginalsChange,
    imageFiles, filenameTemplate,
    progress, setId
}) => {
    const [expandedWarnings, setExpandedWarnings] = useState<Set<string>>(new Set());

    const toggleWarningExpansion = (key: string) => {
        setExpandedWarnings(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const getDownloadFilename = (result: GenerationResult): string => {
        const { originalImageIndex, originalPromptIndex, batchTimestamp } = result;

        const appFile = imageFiles[originalImageIndex];
        if (!appFile) {
            return `generated-image-${originalImageIndex}-${originalPromptIndex + 1}.png`;
        }
        
        const originalFile = appFile.file;
        const shortId = appFile.id;
        const timestamp = batchTimestamp;
        let baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.'));
        const extension = originalFile.name.substring(originalFile.name.lastIndexOf('.') + 1) || 'png';
        
        // Strip "cropped_" prefix to get the true original filename
        if (baseName.startsWith('cropped_')) {
            baseName = baseName.substring(8); // "cropped_".length is 8
        }
        
        const sanitizedBaseName = sanitizeFilename(baseName);

        const filename = filenameTemplate
            .replace('{timestamp}', String(timestamp))
            .replace('{set_id}', setId)
            .replace('{original_filename}', sanitizedBaseName)
            .replace('{version_index}', String(originalPromptIndex + 1))
            .replace('{short_id}', shortId);

        return `${filename}.${extension}`;
    };

    const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
    const hasResults = generationResults.length > 0;
    const isFinished = !isLoading && hasResults;
    const failedCount = generationResults.filter(r => r.status === 'error' || r.status === 'warning').length;

    if (!hasResults && !isLoading) {
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center bg-slate-200/50 rounded-2xl p-4 min-h-[500px]`}>
                {error ? (
                    <div className="text-center text-red-600 bg-red-100 border border-red-400 p-6 rounded-lg">
                        <h3 className="font-bold text-lg mb-2">Generation Failed</h3>
                        <p className="text-sm">{error}</p>
                    </div>
                ) : (
                    <div className="text-center text-slate-500">
                        <PiCube className="mx-auto h-24 w-24 opacity-50"/>
                        <h3 className="mt-4 text-xl font-semibold">Your Images Await</h3>
                        <p className="mt-1 text-sm">Upload images, choose a prompt, and click generate.</p>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className={`w-full h-full flex flex-col bg-slate-200/50 rounded-2xl p-4 min-h-0 gap-4`}>
            {/* Header */}
            <div className="flex-shrink-0 flex justify-between items-center flex-wrap gap-2">
                <h3 className="text-lg font-semibold text-slate-700">
                    {isLoading && progress.total > 0 ? `Generation in Progress... (${progress.completed}/${progress.total})` : "Your Generated Images"}
                </h3>
                {isFinished && (
                    <div className="flex items-center gap-4">
                        {failedCount > 0 && (
                             <button
                                onClick={onRetryAll}
                                className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors"
                                aria-label={`Retry ${failedCount} failed images`}
                            >
                                <PiSpinner className="w-5 h-5" />
                                Retry Failed ({failedCount})
                            </button>
                        )}
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <input 
                                type="checkbox"
                                id="include-originals"
                                checked={includeOriginals}
                                onChange={(e) => onIncludeOriginalsChange(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-600"
                            />
                            <label htmlFor="include-originals">Include originals</label>
                        </div>
                        <button
                            onClick={onDownloadAll}
                            className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors"
                        >
                            <PiDownloadSimple className="w-5 h-5" />
                            Download All
                        </button>
                        <button
                            onClick={onClearGallery}
                            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                            aria-label="Clear all images from the gallery"
                        >
                            <PiX className="w-5 h-5" />
                            Clear Gallery
                        </button>
                    </div>
                )}
            </div>
            
            {/* Progress Bar or Final Error Summary */}
            {isLoading && progress.total > 0 ? (
                <div className="flex-shrink-0">
                    <ProgressBar 
                        progress={progressPercent} 
                        completed={progress.completed} 
                        total={progress.total} 
                    />
                </div>
            ) : (
                isFinished && error && (
                    <div className="flex-shrink-0 text-center text-orange-600 bg-orange-100 border border-orange-400 p-2 rounded-lg">
                         <p className="text-sm font-semibold">{error}</p>
                    </div>
                )
            )}
            
            {/* Results Grid */}
            <div className="flex-grow w-full overflow-y-auto overflow-x-hidden p-2 columns-2 sm:columns-3 gap-4 min-h-0 custom-scrollbar">
                {generationResults.map((result) => {
                    if (result.status === 'success' && result.url) {
                        return (
                            <div key={result.key} className="group relative cursor-pointer break-inside-avoid mb-4" onClick={() => onImageClick(result.url!)}>
                                <img src={result.url} alt={`Generated figure for image ${result.originalImageIndex + 1} version ${result.originalPromptIndex + 1}`} className="w-full h-auto block rounded-lg shadow-md" />
                                <div className="absolute top-2 right-2 flex flex-col items-center gap-2">
                                    <a
                                        href={result.url}
                                        download={getDownloadFilename(result)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-violet-600 focus:opacity-100"
                                        aria-label="Download image"
                                    >
                                        <PiDownloadSimple className="w-5 h-5" />
                                    </a>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRemoveImage(result.key); }}
                                        className="p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 focus:opacity-100"
                                        aria-label="Remove image"
                                    >
                                        <PiTrash className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        );
                    }
                    if (result.status === 'warning') {
                        const isExpanded = expandedWarnings.has(result.key);
                        return (
                            <div key={result.key} className="group relative break-inside-avoid mb-4">
                                <div 
                                    onClick={() => toggleWarningExpansion(result.key)}
                                    className="cursor-pointer p-4 bg-amber-100 border border-amber-300 rounded-lg flex flex-col items-center justify-center text-center min-h-[16rem]"
                                    role="button"
                                    aria-expanded={isExpanded}
                                >
                                    <PiWarning className="w-8 h-8 text-amber-500 mb-2" />
                                    <p className="text-sm font-semibold text-amber-800">Image Not Generated</p>
                                    <p className="text-xs text-amber-700 mt-1">{result.error}</p>
                                    {isExpanded && result.modelResponse && (
                                        <div className="mt-4 w-full text-left bg-amber-50 p-2 rounded-md border border-amber-200 max-h-48 overflow-y-auto custom-scrollbar">
                                            <p className="text-xs font-semibold text-amber-900 mb-1">Model's Response:</p>
                                            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">{result.modelResponse}</pre>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRetryOne(result.key); }}
                                    className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                    aria-label="Retry image generation"
                                >
                                    <PiSpinner className="w-5 h-5" />
                                </button>
                            </div>
                        );
                    }
                    if (result.status === 'error') {
                        return (
                            <div key={result.key} className="group relative p-4 bg-red-100 border border-red-300 rounded-lg flex flex-col items-center justify-center text-center min-h-[16rem] break-inside-avoid mb-4">
                                <PiWarning className="w-8 h-8 text-red-500 mb-2" />
                                <p className="text-sm font-semibold text-red-700">Image Failed</p>
                                <p className="text-xs text-red-600 mt-1 line-clamp-3">{result.error}</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRetryOne(result.key); }}
                                    className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                    aria-label="Retry image generation"
                                >
                                    <PiSpinner className="w-5 h-5" />
                                </button>
                            </div>
                        );
                    }
                    // 'pending' state
                    return (
                        <div key={result.key} className="h-64 bg-slate-300 rounded-lg flex items-center justify-center animate-pulse break-inside-avoid mb-4">
                             <PiCube className="w-10 h-10 text-slate-400 opacity-50" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};