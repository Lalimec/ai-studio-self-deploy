/// <reference lib="dom" />
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StudioImage, TimelinePair, GeneratedImage, GeneratedBabyImage, ImageStudioResultImage } from '../../types';
import TimelinePairCard from './TimelinePairCard';
import TimelinePairLightbox from './TimelinePairLightbox';
import { TrashIcon, HairStudioIcon, BabyIcon, ImageStudioIcon, AdClonerIcon, UploadIcon, SendToEndIcon, SendToStartIcon, PrepareMagicIcon, VideoIcon, DownloadIcon, TranslateIcon, CloseIcon, EyeOffIcon } from '../Icons';
import { useTimelineStudio } from '../../hooks/useTimelineStudio';
import { VideoSettingsPanel } from '../VideoSettingsPanel';

interface TimelineStudioProps {
    logic: ReturnType<typeof useTimelineStudio>;
    hairImages: GeneratedImage[];
    babyImages: GeneratedBabyImage[];
    imageStudioImages: ImageStudioResultImage[];
    adClonerImageCount: number;
    showBetaFeatures: boolean;
    onImport: (source: 'hair' | 'baby' | 'imageStudio' | 'adCloner') => void;
}

const FinalVideoPlayerModal: React.FC<{
  videoUrl: string;
  onClose: () => void;
  onDownload: () => void;
  sessionId: string | null;
}> = ({ videoUrl, onClose, onDownload, sessionId }) => {
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="relative w-full max-w-4xl flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <div className='flex justify-between items-center'>
                    <h3 className="text-xl font-bold text-[var(--color-text-main)]">Stitched Timeline Video</h3>
                    <div className='flex items-center gap-2'>
                        <button onClick={onDownload} className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors text-sm" title="Download stitched video">
                            <DownloadIcon className="w-4 h-4" /> Download Stitched Video
                        </button>
                        <button onClick={onClose} className="text-[var(--color-text-main)] bg-black/50 rounded-full p-2 hover:bg-opacity-75 z-20" title="Close Player">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                <div className="w-full aspect-video bg-black rounded-lg shadow-2xl overflow-hidden">
                    <video
                        key={videoUrl}
                        src={videoUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>
        </div>
    );
};

const SourceButton: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    count?: number;
    onClick: () => void;
    disabled?: boolean;
}> = ({ icon, title, description, count, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`relative bg-[var(--color-bg-surface-light)] p-6 rounded-xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105 hover:bg-[var(--color-bg-muted-hover)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full h-full`}
    >
        <div className="relative">
            {icon}
            {count !== undefined && count > 0 && <span className="absolute -top-2 -right-2 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] text-xs font-bold rounded-full px-2 py-0.5">{count}</span>}
        </div>
        <h3 className="text-xl font-bold mt-4 text-[var(--color-text-main)]">{title}</h3>
        <p className="text-[var(--color-text-dim)] mt-1 text-sm">{description}</p>
    </button>
);


const TimelineStudio: React.FC<TimelineStudioProps> = (props) => {
    const { logic, hairImages, babyImages, imageStudioImages, adClonerImageCount, showBetaFeatures, onImport } = props;
    const {
        timelineImages,
        timelinePairs,
        timelineAspectRatio,
        handleImagesUpload,
        handleReorderImages,
        handleUpdatePairPrompt,
        handleEnhancePairPrompt,
        handleTranslatePairPrompt,
        handleGenerateSingleVideo,
        handleClearAll,
        handleRemoveImage,
        handleSendToStart,
        handleSendToEnd,
        generalPrompt, setGeneralPrompt,
        videoSettings, setVideoSettings,
        handleEnhanceGeneralPrompt,
        handleTranslateGeneralPrompt,
        handlePrepareAll,
        handleRewriteAllPrompts,
        handleGenerateAllVideos,
        handleDownloadAll,
        handleDownloadSinglePair,
        handleStitchVideos,
        isPreparingAll,
        isGeneratingAllVideos,
        isStitching,
        isBusy,
        allVideosGenerated,
        sessionId,
        lightboxPairIndex,
        handlePairClick,
        handleCloseLightbox,
        setLightboxPairIndex,
        setConfirmAction,
        stitchedVideoUrl,
        handleCloseStitchedPlayer,
        handleDownloadStitchedVideo,
        handleTogglePairDisabled,
        handleIgnoreOddEvenPairs,
    } = logic;
    
    // Local state for smooth dnd reordering
    const [localTimelineImages, setLocalTimelineImages] = useState(timelineImages);
    useEffect(() => {
        setLocalTimelineImages(timelineImages);
    }, [timelineImages]);

    const dragItem = useRef<number | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // File upload drag-and-drop logic
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const dragCounter = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const handleUploadClick = () => inputRef.current?.click();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    const handleFileDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDraggingOver(true);
        }
    };
    
    const handleFileDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDraggingOver(false);
        }
    };
    
    const handleFileDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        dragCounter.current = 0;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const imageFiles = Array.from(e.dataTransfer.files).filter((file: File) => file.type.startsWith('image/'));
            if (imageFiles.length > 0) {
                handleImagesUpload(imageFiles);
            }
            e.dataTransfer.clearData();
        }
    };

    // Item reordering drag-and-drop logic
    const handleItemDragStart = (index: number) => {
        dragItem.current = index;
        setDraggedIndex(index);
    };

    const handleItemDragEnter = (index: number) => {
        if (dragItem.current === null || dragItem.current === index) return;
        
        const newImages = [...localTimelineImages];
        const [draggedItemContent] = newImages.splice(dragItem.current, 1);
        newImages.splice(index, 0, draggedItemContent);

        dragItem.current = index;
        setLocalTimelineImages(newImages);
    };

    const handleItemDragEnd = () => {
        const oldPairs = timelinePairs;
        const newPairDefs = new Set<string>();
        for (let i = 0; i < localTimelineImages.length - 1; i++) {
            newPairDefs.add(`${localTimelineImages[i].id}-${localTimelineImages[i+1].id}`);
        }

        const destroyedPairs = oldPairs.filter(p => {
            const key = `${p.startImageId}-${p.endImageId}`;
            return !newPairDefs.has(key) && (p.videoPrompt || p.videoSrc);
        });
    
        if (destroyedPairs.length > 0) {
            setConfirmAction({
                title: "Reorder Images?",
                message: `Reordering will delete ${destroyedPairs.length} pair(s) with generated prompts or videos. Are you sure you want to continue?`,
                confirmText: "Continue",
                onConfirm: () => handleReorderImages(localTimelineImages),
                onCancel: () => setLocalTimelineImages(timelineImages) // Revert visual change
            });
        } else {
            handleReorderImages(localTimelineImages);
        }

        dragItem.current = null;
        setDraggedIndex(null);
    };

    const handleItemDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // This is necessary to allow dropping
    };

    if (timelineImages.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <h2 className="text-3xl font-bold text-[var(--color-text-light)] mb-4">Welcome to the Timeline Studio</h2>
                <p className="text-[var(--color-text-dim)] mb-8 text-lg">Create videos from a sequence of images. Start by adding images below.</p>
                <div className="max-w-5xl w-full flex flex-col gap-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <SourceButton
                            icon={<HairStudioIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                            title="Import from Hair Studio"
                            description="Use your generated hairstyles."
                            count={hairImages.length}
                            onClick={() => onImport('hair')}
                            disabled={hairImages.length === 0 || isBusy}
                        />
                        <SourceButton
                            icon={<BabyIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                            title="Import from Baby Studio"
                            description="Use your generated baby photos."
                            count={babyImages.length}
                            onClick={() => onImport('baby')}
                            disabled={babyImages.length === 0 || isBusy}
                        />
                        <SourceButton
                            icon={<ImageStudioIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                            title="Import from Image Studio"
                            description="Use your batch generated images."
                            count={imageStudioImages.length}
                            onClick={() => onImport('imageStudio')}
                            disabled={imageStudioImages.length === 0 || isBusy}
                        />
                        {showBetaFeatures && (
                             <SourceButton
                                icon={<AdClonerIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                                title="Import from Ad Cloner"
                                description="Use latest ad variations."
                                count={adClonerImageCount}
                                onClick={() => onImport('adCloner')}
                                disabled={adClonerImageCount === 0 || isBusy}
                            />
                        )}
                    </div>
                    <div
                        onDragEnter={handleFileDragEnter} onDragLeave={handleFileDragLeave} onDragOver={handleFileDragOver} onDrop={handleFileDrop}
                        className={`relative w-full border-4 border-dashed rounded-xl p-12 sm:p-20 transition-colors ${isDraggingOver ? 'border-[var(--color-primary-accent)] bg-[var(--color-bg-surface-light)]' : 'border-[var(--color-border-default)] hover:border-[var(--color-primary)]'}`}
                    >
                        <div className="flex flex-col items-center text-[var(--color-text-dim)] pointer-events-none">
                            <UploadIcon className="h-16 w-16 mb-4" />
                            <p className="text-xl font-semibold mb-2">Drag & drop your images here</p>
                            <p className="mb-6">or</p>
                            <button onClick={handleUploadClick} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] font-bold py-3 px-6 rounded-lg transition-colors shadow-md shadow-[var(--color-shadow-primary)]/30 pointer-events-auto">
                                Browse Files
                            </button>
                        </div>
                        <input 
                            ref={inputRef} type="file" className="sr-only" accept="image/*" multiple
                            onChange={(e) => { if (e.target.files) handleImagesUpload(Array.from(e.target.files)); (e.target as HTMLInputElement).value = ''; }}
                        />
                    </div>
                </div>
            </div>
        );
    }
    
    const findImageById = (id: string) => timelineImages.find(img => img.id === id);

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-8">
            <header className="flex justify-between items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <button onClick={handleUploadClick} className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors text-sm" title="Upload more images">
                        <UploadIcon className="w-4 h-4" /> Upload More
                    </button>
                    <input ref={inputRef} type="file" className="sr-only" accept="image/*" multiple onChange={(e) => { if (e.target.files) handleImagesUpload(Array.from(e.target.files)); e.target.value = ''; }} />

                    <button onClick={() => onImport('hair')} disabled={isBusy || hairImages.length === 0} className="flex items-center gap-2 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface-light)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Import images from Hair Studio">
                        <HairStudioIcon className="w-4 h-4" /> Import from Hair
                    </button>
                     <button onClick={() => onImport('baby')} disabled={isBusy || babyImages.length === 0} className="flex items-center gap-2 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface-light)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Import images from Baby Studio">
                        <BabyIcon className="w-4 h-4" /> Import from Baby
                    </button>
                     <button onClick={() => onImport('imageStudio')} disabled={isBusy || imageStudioImages.length === 0} className="flex items-center gap-2 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface-light)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Import images from Image Studio">
                        <ImageStudioIcon className="w-4 h-4" /> Import from Image
                    </button>
                </div>

                 <div className="flex items-center gap-2 flex-shrink-0">
                    {sessionId && <div className="hidden lg:inline-block bg-[var(--color-bg-muted-hover)] text-[var(--color-text-dim)] text-sm font-mono py-1.5 px-3 rounded-lg animate-fade-in truncate">Set ID: {sessionId}</div>}
                    <button onClick={handlePrepareAll} disabled={isBusy || timelinePairs.length === 0} className="flex items-center gap-2 bg-[var(--color-action-prepare)] hover:bg-[var(--color-action-prepare-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm"><PrepareMagicIcon className={`w-4 h-4 ${isPreparingAll ? 'animate-spin' : ''}`} />{isPreparingAll ? 'Preparing...' : 'Prepare All'}</button>
                    <button onClick={handleGenerateAllVideos} disabled={isBusy || timelinePairs.length === 0} className="flex items-center gap-2 bg-[var(--color-action-generate)] hover:bg-[var(--color-action-generate-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm"><VideoIcon className={`w-4 h-4 ${isGeneratingAllVideos ? 'animate-spin' : ''}`} />{isGeneratingAllVideos ? 'Generating...' : 'Generate Videos'}</button>
                    <button onClick={handleStitchVideos} disabled={isBusy || !allVideosGenerated} className="flex items-center gap-2 bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm" title={allVideosGenerated ? "Play all videos in sequence" : "Generate all videos first"}><PrepareMagicIcon className={`w-4 h-4 ${isStitching ? 'animate-spin' : ''}`} />{isStitching ? 'Stitching...' : 'Stitch Videos'}</button>
                    <button onClick={() => handleIgnoreOddEvenPairs('odd')} disabled={isBusy || timelinePairs.length === 0} className="flex items-center gap-2 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Toggle ignore on all odd-numbered pairs (1st, 3rd, etc.)">
                        <EyeOffIcon className="w-4 h-4" /> Ignore Odd
                    </button>
                    <button onClick={() => handleIgnoreOddEvenPairs('even')} disabled={isBusy || timelinePairs.length === 0} className="flex items-center gap-2 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Toggle ignore on all even-numbered pairs (2nd, 4th, etc.)">
                        <EyeOffIcon className="w-4 h-4" /> Ignore Even
                    </button>
                    <button onClick={handleDownloadAll} disabled={isBusy || timelinePairs.length === 0} className="flex items-center gap-2 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm"><DownloadIcon className="w-4 h-4" />Download All</button>
                    <button onClick={handleClearAll} disabled={isBusy} className="flex items-center gap-2 bg-[var(--color-destructive)] hover:bg-[var(--color-destructive-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] disabled:cursor-not-allowed text-sm" title="Remove all images from this session">
                        <TrashIcon className="w-4 h-4" /> Clear All
                    </button>
                </div>
            </header>

            <VideoSettingsPanel
                settings={videoSettings}
                onSettingsChange={setVideoSettings}
                disabled={isBusy}
            />

            <div 
                className={`relative bg-[var(--color-bg-surface-light)] p-4 rounded-xl border border-[var(--color-border-default)] transition-all ${isDraggingOver ? 'border-dashed border-2 border-[var(--color-primary-accent)] scale-105 bg-[var(--color-bg-muted-hover)]' : ''}`}
                onDragEnter={handleFileDragEnter}
                onDragLeave={handleFileDragLeave}
                onDragOver={handleFileDragOver}
                onDrop={handleFileDrop}
            >
                <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-2">Image Sequence</h2>
                <p className="text-sm text-[var(--color-text-dim)] mb-4">Drag to reorder, hover for actions, or use mouse wheel to scroll. You can also drop new image files to upload.</p>
                <div 
                    ref={scrollContainerRef}
                    className="w-full overflow-x-auto custom-scrollbar pb-2"
                >
                    <div className="flex items-center gap-4">
                        {localTimelineImages.map((image, index) => (
                             <div
                                key={image.id}
                                draggable
                                onDragStart={() => handleItemDragStart(index)}
                                onDragEnter={() => handleItemDragEnter(index)}
                                onDragEnd={handleItemDragEnd}
                                onDragOver={handleItemDragOver}
                                className={`group relative w-24 h-32 bg-[var(--color-bg-muted-hover)] rounded-md overflow-hidden flex-shrink-0 cursor-grab active:cursor-grabbing shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg ${draggedIndex === index ? 'opacity-30 scale-95 shadow-2xl ring-2 ring-[var(--color-primary-accent)]' : 'opacity-100'}`}
                            >
                                <img src={image.src} alt={`Sequence image ${image.filename}`} className="w-full h-full object-cover pointer-events-none" />
                                <div className="absolute top-1 left-1 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full pointer-events-none">
                                    {index + 1}
                                </div>
                                 <div className="absolute top-1/2 -translate-y-1/2 right-1 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={(e) => { e.stopPropagation(); handleSendToStart(image.id); }} className="p-1.5 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-primary-hover)]" title="Send to start">
                                        <SendToStartIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleSendToEnd(image.id); }} className="p-1.5 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-primary-hover)]" title="Send to end">
                                        <SendToEndIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(image.id); }} className="p-1.5 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-destructive-hover)]" title="Remove image">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                 {isDraggingOver && (
                    <div className="pointer-events-none absolute inset-0 bg-[var(--color-bg-flash)] rounded-xl flex items-center justify-center">
                        <UploadIcon className="w-16 h-16 text-[var(--color-primary-accent)]" />
                    </div>
                )}
            </div>

            <div className="flex items-start gap-4">
                <div className="relative flex-grow">
                    <textarea
                        value={generalPrompt}
                        onChange={(e) => setGeneralPrompt(e.target.value)}
                        placeholder='Provide a high-level instruction for all transitions (e.g., "a slow, happy transition," "morph quickly with a flash of light"). This will be used when you click "Prepare All" or "Rewrite Prompts".'
                        className="prompt-textarea w-full h-24 bg-[var(--color-bg-surface-light)] border-2 border-[var(--color-border-default)] rounded-lg p-3 pr-12 text-base text-[var(--color-text-light)] focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-colors resize-none disabled:opacity-50"
                        disabled={isBusy}
                    />
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                         <button onClick={() => handleEnhanceGeneralPrompt()} disabled={isBusy || !generalPrompt} className="text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:opacity-50 disabled:cursor-not-allowed" title="Enhance: Refine this prompt using AI">
                            <PrepareMagicIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleTranslateGeneralPrompt()} disabled={isBusy || !generalPrompt} className="text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:opacity-50 disabled:cursor-not-allowed" title="Translate to English & Refine">
                            <TranslateIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <button onClick={handleRewriteAllPrompts} disabled={isBusy || timelinePairs.length === 0} className="flex items-center justify-center gap-2 h-24 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface-light)] disabled:text-[var(--color-text-dimmer)] text-base">
                    <PrepareMagicIcon className={`w-5 h-5 ${isPreparingAll ? 'animate-spin' : ''}`} />{isPreparingAll ? 'Rewriting...' : 'Rewrite Prompts'}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {timelinePairs.map((pair, index) => {
                    const startImage = findImageById(pair.startImageId);
                    const endImage = findImageById(pair.endImageId);
                    
                    if (!startImage || !endImage) return null;

                    return (
                        <TimelinePairCard
                            key={pair.id}
                            startImage={startImage}
                            endImage={endImage}
                            pair={pair}
                            aspectRatio={timelineAspectRatio}
                            onUpdatePrompt={handleUpdatePairPrompt}
                            onEnhancePrompt={handleEnhancePairPrompt}
                            onTranslatePrompt={handleTranslatePairPrompt}
                            onGenerateVideo={handleGenerateSingleVideo}
                            onDownloadSingle={handleDownloadSinglePair}
                            onCardClick={() => handlePairClick(index)}
                            onToggleDisabled={handleTogglePairDisabled}
                        />
                    );
                })}
            </div>

            {lightboxPairIndex !== null && (
                <TimelinePairLightbox
                    pairs={timelinePairs}
                    images={timelineImages}
                    currentIndex={lightboxPairIndex}
                    setCurrentIndex={setLightboxPairIndex}
                    onClose={handleCloseLightbox}
                />
            )}
            
            {stitchedVideoUrl && (
                <FinalVideoPlayerModal 
                    videoUrl={stitchedVideoUrl}
                    onClose={handleCloseStitchedPlayer}
                    onDownload={handleDownloadStitchedVideo}
                    sessionId={sessionId}
                />
            )}
        </div>
    );
};

export default React.memo(TimelineStudio);