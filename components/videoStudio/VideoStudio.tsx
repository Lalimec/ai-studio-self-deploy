/// <reference lib="dom" />
import React, { useRef, useCallback, useState } from 'react';
import { StudioImage, GeneratedImage, GeneratedBabyImage, GeneratedArchitectureImage, ImageStudioResultImage } from '../../types';
import MultiImageUploader from '../MultiImageUploader';
import {
    PrepareMagicIcon, VideoIcon, TrashIcon, DownloadIcon,
    HairStudioIcon, BabyIcon, ArchitectureStudioIcon, UploadIcon, TranslateIcon,
    CheckCircleIcon,
    ImageStudioIcon,
    AdClonerIcon,
    BananaIcon,
    AlertCircleIcon
} from '../Icons';
import { useVideoStudio } from '../../hooks/useVideoStudio';

interface VideoStudioProps {
  logic: ReturnType<typeof useVideoStudio>;
  hairImages: GeneratedImage[];
  babyImages: GeneratedBabyImage[];
  architectureImages: GeneratedArchitectureImage[];
  imageStudioImages: ImageStudioResultImage[];
  nanoBananaProStudioImages: ImageStudioResultImage[];
  adClonerImageCount: number;
  showBetaFeatures: boolean;
  onImport: (source: 'hair' | 'baby' | 'architecture' | 'imageStudio' | 'nanoBananaProStudio' | 'adCloner') => void;
  onImageClick: (id: string) => void;
}

const VideoCard: React.FC<{
    image: StudioImage;
    logic: ReturnType<typeof useVideoStudio>;
    onImageClick: (id: string) => void;
}> = ({ image, logic, onImageClick }) => {
    const { id, src, videoPrompt, videoSrc, isPreparing, isGeneratingVideo, videoGenerationFailed } = image;
    const isBusy = isPreparing || isGeneratingVideo;

    const [isHovering, setIsHovering] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    React.useEffect(() => {
        if (videoSrc) setIsVideoReady(false);
    }, [videoSrc]);
    
    const handleActionClick = (e: React.MouseEvent) => e.stopPropagation();

    const videoButtonTitle = !videoPrompt ? "Write or generate a prompt first" : videoSrc ? "Regenerate video" : "Generate video";
    const downloadButtonTitle = videoSrc ? "Download image, video, and info" : "Download image and info";

    return (
        <div className="flex flex-col gap-3">
            <div
                className="group relative bg-[var(--color-bg-surface-light)] rounded-lg overflow-hidden shadow-lg shadow-[var(--color-shadow-primary)]/10 aspect-[4/5]"
                onMouseEnter={() => videoSrc && setIsHovering(true)}
                onMouseLeave={() => videoSrc && setIsHovering(false)}
            >
                <button onClick={() => onImageClick(id)} className="w-full h-full block" aria-label={`View larger image of ${image.filename}`} title="Click to view a larger version">
                    <img src={src} alt={`Studio image ${image.filename}`} className="w-full h-full object-cover block" />
                     {videoSrc && isHovering && (
                        <div className="absolute inset-0">
                            {!isVideoReady && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10"><div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-[var(--color-text-main)]"></div></div>}
                            <video key={videoSrc} src={videoSrc} onCanPlay={() => setIsVideoReady(true)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-5" style={{ opacity: isVideoReady ? 1 : 0 }} />
                        </div>
                    )}
                     {videoGenerationFailed && !isBusy && (
                        <div className="absolute inset-0 bg-red-500/30 pointer-events-none flex items-center justify-center" title="Video generation failed. Please try again.">
                            <AlertCircleIcon className="w-8 h-8 text-white/80" />
                        </div>
                    )}
                </button>

                {videoSrc && !isBusy && <div className="absolute top-2 left-2 p-1 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-primary-accent)] pointer-events-none" title="Video is ready"><VideoIcon className="w-5 h-5" /></div>}
                {!videoSrc && videoPrompt && !isBusy && <div className="absolute top-2 left-2 p-1 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-success-accent)] pointer-events-none" title="Video prompt is ready"><CheckCircleIcon className="w-5 h-5" /></div>}

                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-20">
                    <button onClick={(e) => { handleActionClick(e); logic.handleDownloadSingle(id); }} className="p-2 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" title={downloadButtonTitle}><DownloadIcon className="w-5 h-5" /></button>
                    <button onClick={(e) => { handleActionClick(e); logic.handlePrepareSingleImage(id); }} className="p-2 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" title="Prepare: Generate a new prompt from the image" disabled={isBusy}><PrepareMagicIcon className={`w-5 h-5 ${isPreparing ? 'animate-spin' : ''}`} /></button>
                    <button onClick={(e) => { handleActionClick(e); logic.handleGenerateSingleVideo(id); }} className="p-2 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed" title={videoButtonTitle} disabled={!videoPrompt || isBusy}><VideoIcon className={`w-5 h-5 ${isGeneratingVideo ? 'animate-spin' : ''}`} /></button>
                    <button onClick={(e) => { handleActionClick(e); logic.handleRemoveImage(id); }} className="p-2 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" title="Remove this image" disabled={isBusy}><TrashIcon className="w-5 h-5" /></button>
                </div>
                 {isBusy && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-[var(--color-text-main)] text-xs font-semibold z-30">
                        <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                        <span className="mt-2">{isPreparing ? 'Working...' : 'Making Video...'}</span>
                    </div>
                 )}
            </div>
            <div className="relative">
                <textarea
                    value={videoPrompt || ''}
                    onChange={(e) => logic.handleUpdatePrompt(id, e.target.value)}
                    placeholder="Describe your video..."
                    className="prompt-textarea w-full h-28 bg-[var(--color-bg-surface-light)] border-2 border-[var(--color-border-default)] rounded-lg p-2 pr-10 text-sm text-[var(--color-text-light)] focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-colors resize-none disabled:opacity-50"
                    disabled={isBusy}
                />
                <div className="absolute top-2.5 right-2.5 flex flex-col gap-2">
                    <button onClick={() => logic.handleEnhancePrompt(id, videoPrompt || '')} disabled={isBusy || !videoPrompt} className="text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:opacity-50" title="Enhance: Refine this prompt using AI">
                        <PrepareMagicIcon className={`w-5 h-5 ${isPreparing && !isGeneratingVideo ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => logic.handleTranslatePrompt(id, videoPrompt || '')} disabled={isBusy || !videoPrompt} className="text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:opacity-50" title="Translate to English & Refine">
                        <TranslateIcon className={`w-5 h-5 ${isPreparing && !isGeneratingVideo ? 'animate-spin' : ''}`} />
                    </button>
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

const VideoStudio: React.FC<VideoStudioProps> = (props) => {
    const {
        logic, hairImages, babyImages, architectureImages, imageStudioImages, nanoBananaProStudioImages, adClonerImageCount, showBetaFeatures, onImport,
        onImageClick
    } = props;
    
    const { 
        studioImages, isBusy, isGeneratingVideos, isPreparing,
        handleImagesUpload, handleClearAll, handleGenerateAllVideos, handlePrepareAll, sessionId,
        handleDownloadAll, handleDownloadSingle, generalPrompt, setGeneralPrompt,
        handleEnhanceGeneralPrompt, handleTranslateGeneralPrompt, handleRewriteAllPrompts,
    } = logic;
    
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const handleUploadClick = () => inputRef.current?.click();

    const onDragEnter = useCallback((e: React.DragEvent<HTMLElement>) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    }, []);

    const onDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
        e.preventDefault(); e.stopPropagation();
    }, []);

    const onDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);
        if (e.dataTransfer.files?.length > 0) {
            const imageFiles = Array.from(e.dataTransfer.files as FileList).filter((file: File) => file.type.startsWith('image/'));
            if (imageFiles.length > 0) handleImagesUpload(imageFiles);
            e.dataTransfer.clearData();
        }
    }, [handleImagesUpload]);

    if (studioImages.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <h2 className="text-3xl font-bold text-[var(--color-text-light)] mb-4">Welcome to the Video Studio</h2>
                <p className="text-[var(--color-text-dim)] mb-8 text-lg">Start by adding images from one of the sources below.</p>
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
                            icon={<ArchitectureStudioIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                            title="Import from Architecture Studio"
                            description="Use your generated architectural designs."
                            count={architectureImages.length}
                            onClick={() => onImport('architecture')}
                            disabled={architectureImages.length === 0 || isBusy}
                        />
                        <SourceButton
                            icon={<ImageStudioIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                            title="Import from Image Studio"
                            description="Use your batch generated images."
                            count={imageStudioImages.length}
                            onClick={() => onImport('imageStudio')}
                            disabled={imageStudioImages.length === 0 || isBusy}
                        />
                        <SourceButton
                            icon={<BananaIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                            title="Import from Pro Studio"
                            description="Use your pro quality images."
                            count={nanoBananaProStudioImages.length}
                            onClick={() => onImport('nanoBananaProStudio')}
                            disabled={nanoBananaProStudioImages.length === 0 || isBusy}
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
                        className={`relative w-full border-4 border-dashed rounded-xl p-12 sm:p-20 transition-colors ${isDragging ? 'border-[var(--color-primary-accent)] bg-[var(--color-bg-surface-light)]' : 'border-[var(--color-border-default)] hover:border-[var(--color-primary)]'}`}
                        onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDrop} onDrop={onDrop}
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

  return (
    <div className="relative w-full" onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}>
        {isDragging && (
             <div className="pointer-events-none absolute inset-0 bg-[var(--color-bg-flash)] border-4 border-dashed border-[var(--color-primary-accent)] rounded-2xl z-50 flex items-center justify-center">
                <div className="text-center bg-[var(--color-bg-surface)]/80 p-6 rounded-lg">
                    <UploadIcon className="w-16 h-16 text-[var(--color-primary-accent)] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-[var(--color-text-main)]">Drop to Upload Images</h2>
                </div>
            </div>
        )}
        <div className={`w-full max-w-screen-2xl mx-auto flex flex-col ${isDragging ? 'opacity-50' : ''}`}>
            <header className="flex justify-between items-center mb-6 gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <MultiImageUploader onImagesUpload={handleImagesUpload} isButton />
                    <button onClick={() => onImport('hair')} disabled={isBusy || hairImages.length === 0} className="flex items-center gap-2 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface-light)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Import images from Hair Studio">
                        <HairStudioIcon className="w-4 h-4" /> Import from Hair
                    </button>
                     <button onClick={() => onImport('baby')} disabled={isBusy || babyImages.length === 0} className="flex items-center gap-2 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface-light)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Import images from Baby Studio">
                        <BabyIcon className="w-4 h-4" /> Import from Baby
                    </button>
                     <button onClick={() => onImport('architecture')} disabled={isBusy || architectureImages.length === 0} className="flex items-center gap-2 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface-light)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Import images from Architecture Studio">
                        <ArchitectureStudioIcon className="w-4 h-4" /> Import from Architecture
                    </button>
                     <button onClick={() => onImport('imageStudio')} disabled={isBusy || imageStudioImages.length === 0} className="flex items-center gap-2 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface-light)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Import images from Image Studio">
                        <ImageStudioIcon className="w-4 h-4" /> Import from Image
                    </button>
                     <button onClick={() => onImport('nanoBananaProStudio')} disabled={isBusy || nanoBananaProStudioImages.length === 0} className="flex items-center gap-2 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface-light)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Import images from Pro Studio">
                        <BananaIcon className="w-4 h-4" /> Import from Pro
                    </button>
                </div>

                 <div className="flex items-center gap-2 flex-shrink-0">
                    {sessionId && <div className="hidden lg:inline-block bg-[var(--color-bg-muted-hover)] text-[var(--color-text-dim)] text-sm font-mono py-1.5 px-3 rounded-lg animate-fade-in truncate">Set ID: {sessionId}</div>}
                    <button onClick={handleClearAll} disabled={isBusy} className="flex items-center gap-2 bg-[var(--color-destructive)] hover:bg-[var(--color-destructive-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] disabled:cursor-not-allowed text-sm" title="Remove all images from this session">
                        <TrashIcon className="w-4 h-4" /> Remove All
                    </button>
                     <button onClick={handlePrepareAll} disabled={isBusy || studioImages.length === 0} className="flex items-center gap-2 bg-[var(--color-action-prepare)] hover:bg-[var(--color-action-prepare-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm"><PrepareMagicIcon className={`w-4 h-4 ${isPreparing ? 'animate-spin' : ''}`} />{isPreparing ? 'Preparing...' : 'Prepare All'}</button>
                    <button onClick={handleGenerateAllVideos} disabled={isBusy || studioImages.length === 0} className="flex items-center gap-2 bg-[var(--color-action-generate)] hover:bg-[var(--color-action-generate-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Generate videos for all prepared images">
                        <VideoIcon className={`w-4 h-4 ${isGeneratingVideos ? 'animate-spin' : ''}`} />
                        {isGeneratingVideos ? 'Generating...' : 'Generate All'}
                    </button>
                    <button onClick={handleDownloadAll} disabled={isBusy || studioImages.length === 0} className="flex items-center gap-2 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm" title="Download all images, videos, and info files as a .zip">
                        <DownloadIcon className="w-4 h-4" />
                        Download All
                    </button>
                </div>
            </header>
            
            <div className="flex items-start gap-4 mb-6">
                <div className="relative flex-grow">
                    <textarea
                        value={generalPrompt}
                        onChange={(e) => setGeneralPrompt(e.target.value)}
                        placeholder='Provide a high-level instruction for all video prompts (e.g., "a slow, happy expression," "look surprised"). This will be used by "Prepare All" and "Rewrite Prompts".'
                        className="prompt-textarea w-full h-24 bg-[var(--color-bg-surface-light)] border-2 border-[var(--color-border-default)] rounded-lg p-3 pr-12 text-base text-[var(--color-text-light)] focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-colors resize-none disabled:opacity-50"
                        disabled={isBusy}
                    />
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                         <button onClick={handleEnhanceGeneralPrompt} disabled={isBusy || !generalPrompt} className="text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:opacity-50 disabled:cursor-not-allowed" title="Enhance: Refine this prompt using AI">
                            <PrepareMagicIcon className="w-5 h-5" />
                        </button>
                        <button onClick={handleTranslateGeneralPrompt} disabled={isBusy || !generalPrompt} className="text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:opacity-50 disabled:cursor-not-allowed" title="Translate to English & Refine">
                            <TranslateIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <button onClick={handleRewriteAllPrompts} disabled={isBusy || studioImages.length === 0} className="flex items-center justify-center gap-2 h-24 bg-[var(--color-bg-muted-hover)] hover:bg-[var(--color-border-default)] text-[var(--color-text-main)] font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface-light)] disabled:text-[var(--color-text-dimmer)] text-base">
                    <PrepareMagicIcon className={`w-5 h-5 ${isPreparing ? 'animate-spin' : ''}`} />{isPreparing ? 'Rewriting...' : 'Rewrite Prompts'}
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {studioImages.map(image => (
                    <VideoCard
                        key={image.id}
                        image={image}
                        logic={logic}
                        onImageClick={onImageClick}
                    />
                ))}
            </div>
        </div>
    </div>
  );
};

export default React.memo(VideoStudio);