/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { PiDownloadSimpleIcon, PiCloseIcon, PiWarningIcon, PiSpinnerIcon, PiCubeIcon, PiTrashIcon, RegenerateIcon } from '../Icons';
import { ImageStudioGenerationResult } from '../../types';
import { ProgressBar } from './ProgressBar';
import { JustifiedGallery, useImageDimensions } from './JustifiedGallery';

interface GeneratedImageDisplayProps {
    generationResults: ImageStudioGenerationResult[];
    isLoading: boolean;
    onImageClick: (url: string) => void;
    onRetryOne: (key: string) => void;
    onRemoveImage: (key: string) => void;
    onDownloadSingle: (key: string) => void;
    progress: { completed: number; total: number; };
    emptyIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    pendingAspectRatio?: number; // Aspect ratio for pending placeholders (width/height)
}

export const GeneratedImageDisplay: React.FC<GeneratedImageDisplayProps> = ({
    generationResults, isLoading, onImageClick,
    onRetryOne, onRemoveImage, onDownloadSingle,
    progress,
    emptyIcon: EmptyIcon,
    pendingAspectRatio = 0.8, // Default to 4:5 portrait
}) => {
    const [expandedWarnings, setExpandedWarnings] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

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

    // Measure container width
    useEffect(() => {
        if (!containerRef.current) return;

        const updateWidth = () => {
            if (containerRef.current) {
                // Subtract padding (p-2 = 8px left + 8px right = 16px total)
                setContainerWidth(containerRef.current.offsetWidth - 16);
            }
        };

        updateWidth();

        const resizeObserver = new ResizeObserver(updateWidth);
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
    const hasResults = generationResults.length > 0;
    const IconComponent = EmptyIcon || PiCubeIcon;

    // Separate successful images from errors/warnings/pending
    const sortedResults = [...generationResults].sort((a, b) => b.batchTimestamp - a.batchTimestamp);
    const successfulImages = sortedResults.filter(r => r.status === 'success' && r.url);
    const pendingResults = sortedResults.filter(r => r.status === 'pending');
    const errorWarningResults = sortedResults.filter(r => (r.status === 'error' || r.status === 'warning') && r.status !== 'pending');

    // Load aspect ratios for successful images
    const imageUrls = successfulImages.map(r => r.url!);
    const aspectRatios = useImageDimensions(imageUrls);

    if (!hasResults && !isLoading) {
        return (
            <div className="col-span-full flex flex-col items-center justify-center text-center p-10 rounded-lg min-h-[500px]">
                <div className="text-center">
                    <IconComponent className="mx-auto h-24 w-24 text-[var(--color-border-default)] opacity-75"/>
                    <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-light)]">Your Images Await</h3>
                    <p className="mt-1 text-sm text-[var(--color-text-dimmer)]">Upload images, choose a prompt, and click generate.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`w-full h-full flex flex-col min-h-0 gap-4`}>
            {isLoading && progress.total > 0 ? (
                <div className="flex-shrink-0">
                     <h3 className="text-lg font-semibold text-[var(--color-text-light)] mb-2">
                        {`Generation in Progress... (${progress.completed}/${progress.total})`}
                    </h3>
                    <ProgressBar 
                        progress={progressPercent} 
                        completed={progress.completed} 
                        total={progress.total} 
                    />
                </div>
            ) : null}
            
            {/* Results Gallery */}
            <div ref={containerRef} className="flex-grow w-full overflow-y-auto overflow-x-hidden p-2 min-h-0 custom-scrollbar">
                {/* Justified Gallery for Successful Images + Pending Placeholders */}
                {(successfulImages.length > 0 || pendingResults.length > 0) && containerWidth > 0 && aspectRatios.size === successfulImages.length && (
                    <JustifiedGallery
                        images={[
                            // Pending results FIRST (at top of gallery)
                            // Use special URL prefix to identify pending items
                            ...pendingResults.map(result => ({
                                url: `pending:${result.key}`, // Special prefix to identify pending
                                aspectRatio: pendingAspectRatio, // Use selected aspect ratio
                                key: result.key
                            })),
                            // Successful images with loaded aspect ratios
                            ...successfulImages.map(result => ({
                                url: result.url!,
                                aspectRatio: aspectRatios.get(result.url!) || pendingAspectRatio,
                                key: result.key
                            }))
                        ]}
                        targetRowHeight={192} // Reduced by 40% from 320
                        containerWidth={containerWidth}
                        gap={16}
                        renderImage={(item, width, height) => {
                            // Render pending placeholder (identified by 'pending:' URL prefix)
                            if (item.url.startsWith('pending:')) {
                                return (
                                    <div className="w-full h-full bg-[var(--color-bg-muted)] rounded-lg flex items-center justify-center animate-pulse">
                                        <PiCubeIcon className="w-10 h-10 text-[var(--color-text-dimmer)] opacity-50" />
                                    </div>
                                );
                            }

                            // Render successful image
                            const result = successfulImages.find(r => r.key === item.key)!;
                            return (
                                <div
                                    className="group relative cursor-pointer w-full h-full"
                                    onClick={() => onImageClick(item.url)}
                                >
                                    <div className="w-full h-full overflow-hidden rounded-lg shadow-md">
                                        <img
                                            src={item.url}
                                            alt={`Generated figure for image ${result.originalImageIndex + 1} version ${result.originalPromptIndex + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute top-2 right-2 flex flex-col items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDownloadSingle(result.key); }}
                                            className="p-2 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[var(--color-primary-hover)] focus:opacity-100"
                                            aria-label="Download image and info"
                                            title="Download image and info"
                                        >
                                            <PiDownloadSimpleIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRetryOne(result.key); }}
                                            className="p-2 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[var(--color-primary-hover)] focus:opacity-100"
                                            aria-label="Regenerate image"
                                            title="Regenerate image"
                                        >
                                            <RegenerateIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRemoveImage(result.key); }}
                                            className="p-2 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[var(--color-destructive-hover)] focus:opacity-100"
                                            aria-label="Remove image"
                                            title="Remove image"
                                        >
                                            <PiTrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        }}
                    />
                )}

                {/* Error/Warning Cards in Grid (Pending now in justified gallery) */}
                {errorWarningResults.length > 0 && (
                    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${(successfulImages.length > 0 || pendingResults.length > 0) ? 'mt-4' : ''}`}>
                        {errorWarningResults.map((result) => {
                    if (result.status === 'warning') {
                        const isExpanded = expandedWarnings.has(result.key);
                        return (
                            <div key={result.key} className="group relative aspect-[4/5]">
                                <div
                                    className="h-full p-4 bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-lg flex flex-col items-center justify-center text-center overflow-y-auto custom-scrollbar"
                                >
                                    <div onClick={() => toggleWarningExpansion(result.key)} role="button" aria-expanded={isExpanded} className="cursor-pointer">
                                        <PiWarningIcon className="w-8 h-8 text-[var(--color-warning)] mb-2 mx-auto" />
                                        <p className="text-sm font-semibold text-[var(--color-text-light)]">Image Not Generated</p>
                                        <p className="text-xs text-[var(--color-text-dim)] mt-1 break-all">{result.error}</p>
                                    </div>
                                    
                                    {result.prompt && (
                                        <div className="mt-2 w-full text-left bg-[var(--color-bg-surface)] p-2 rounded-md border border-[var(--color-border-default)] max-h-24 overflow-y-auto custom-scrollbar">
                                            <p className="text-xs font-semibold text-[var(--color-text-main)] mb-1">Attempted Prompt:</p>
                                            <pre className="text-xs text-[var(--color-text-light)] whitespace-pre-wrap font-mono">{result.prompt}</pre>
                                        </div>
                                    )}

                                    {isExpanded && result.modelResponse && (
                                        <div className="mt-2 w-full text-left bg-[var(--color-bg-surface)] p-2 rounded-md border border-[var(--color-border-default)] max-h-48 overflow-y-auto custom-scrollbar">
                                            <p className="text-xs font-semibold text-[var(--color-text-main)] mb-1">Model's Response:</p>
                                            <pre className="text-xs text-[var(--color-text-light)] whitespace-pre-wrap font-mono">{result.modelResponse}</pre>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute top-2 right-2 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-20">
                                    <button onClick={(e) => { e.stopPropagation(); onRetryOne(result.key); }} className="p-2 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-primary-hover)] focus:opacity-100" aria-label="Retry generation">
                                        <PiSpinnerIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onRemoveImage(result.key); }} className="p-2 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-destructive-hover)] focus:opacity-100" aria-label="Remove image">
                                        <PiTrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        );
                    }
                    if (result.status === 'error') {
                        return (
                            <div key={result.key} className="group relative aspect-[4/5]">
                                <div className="h-full p-4 bg-red-900/30 border border-[var(--color-destructive)] rounded-lg flex flex-col items-center justify-center text-center overflow-y-auto custom-scrollbar">
                                <PiWarningIcon className="w-8 h-8 text-[var(--color-destructive)] mb-2" />
                                <p className="text-sm font-semibold text-[var(--color-text-light)]">Image Failed</p>
                                <p className="text-xs text-red-300 mt-1 break-all">{result.error}</p>
                                
                                {result.prompt && (
                                    <div className="mt-2 w-full text-left bg-[var(--color-bg-surface)] p-2 rounded-md border border-[var(--color-border-default)] max-h-24 overflow-y-auto custom-scrollbar">
                                        <p className="text-xs font-semibold text-[var(--color-text-main)] mb-1">Failed Prompt:</p>
                                        <pre className="text-xs text-[var(--color-text-light)] whitespace-pre-wrap font-mono">{result.prompt}</pre>
                                    </div>
                                )}
                                </div>

                                <div className="absolute top-2 right-2 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-20">
                                    <button onClick={(e) => { e.stopPropagation(); onRetryOne(result.key); }} className="p-2 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-primary-hover)] focus:opacity-100" aria-label="Retry generation">
                                        <PiSpinnerIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onRemoveImage(result.key); }} className="p-2 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-destructive-hover)] focus:opacity-100" aria-label="Remove image">
                                        <PiTrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        );
                    }
                    // Note: Pending states are now rendered in the justified gallery above
                    return null;
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};