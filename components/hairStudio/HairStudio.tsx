/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { OriginalImageState } from '../../types';
import ImageUploader from '../ImageUploader';
import HairOptionsPanel from './HairOptionsPanel';
import ImageGrid from '../ImageGrid';
import { TrashIcon, HelpIcon, DownloadIcon, PrepareMagicIcon, VideoIcon, AlertCircleIcon, CheckCircleIcon } from '../Icons';
import { useHairStudio } from '../../hooks/useHairStudio';

type HairStudioProps = {
    logic: ReturnType<typeof useHairStudio>;
    onUpload: (file: File) => void;
    onRecrop: () => void;
    onShowHelp: () => void;
    onImageClick: (id: string) => void;
};

const OriginalImageCard: React.FC<{
    originalImage: OriginalImageState;
    onRecrop: () => void;
    onClear: () => void;
    isDataLocked: boolean;
    onPrepare: () => void;
    onGenerateVideo: () => void;
    onDownload: () => void;
    aspectRatio: number;
}> = ({ originalImage, onRecrop, onClear, isDataLocked, onPrepare, onGenerateVideo, onDownload, aspectRatio }) => {
    const { croppedSrc, isPreparing, isGeneratingVideo, videoSrc, videoPrompt, videoGenerationFailed } = originalImage;
    const isBusy = isPreparing || isGeneratingVideo;
    const [isHovering, setIsHovering] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    useEffect(() => {
        if (videoSrc) setIsVideoReady(false);
    }, [videoSrc]);

    if (!croppedSrc) return null;

    return (
        <div className="w-full flex flex-col items-center">
            <div
                className="relative group w-full"
                onMouseEnter={() => videoSrc && setIsHovering(true)}
                onMouseLeave={() => videoSrc && setIsHovering(false)}
                style={{ aspectRatio }}
            >
                <img src={croppedSrc} alt="Original photo" className="rounded-xl shadow-lg shadow-[var(--color-shadow-primary)]/20 object-cover w-full h-full" />

                {videoSrc && isHovering && (
                    <div className="absolute inset-0">
                        {!isVideoReady && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-xl"><div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-[var(--color-text-main)]"></div></div>}
                        <video key={videoSrc} src={videoSrc} onCanPlay={() => setIsVideoReady(true)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-5 rounded-xl" style={{ opacity: isVideoReady ? 1 : 0 }} />
                    </div>
                )}

                {videoGenerationFailed && !isBusy && (
                    <div className="absolute inset-0 bg-red-500/30 pointer-events-none flex items-center justify-center rounded-xl" title="Video generation failed">
                        <AlertCircleIcon className="w-8 h-8 text-white/80" />
                    </div>
                )}

                {videoSrc && !isBusy && (
                    <div className="absolute top-2 left-2 p-1 bg-black bg-opacity-60 rounded-full text-[var(--color-primary-accent)] pointer-events-none" title="Video is ready">
                        <VideoIcon className="w-5 h-5" />
                    </div>
                )}
                {!videoSrc && videoPrompt && !isBusy && (
                    <div className="absolute top-2 left-2 p-1 bg-black bg-opacity-60 rounded-full text-[var(--color-success-accent)] pointer-events-none" title="Video prompt is ready">
                        <CheckCircleIcon className="w-5 h-5" />
                    </div>
                )}

                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                    <button onClick={onRecrop} className="bg-[var(--color-bg-surface)]/80 text-[var(--color-text-main)] py-2 px-4 rounded-md text-sm font-semibold hover:bg-black/80" disabled={isDataLocked || isBusy}>Recrop</button>
                </div>

                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onClick={onClear} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" aria-label="Remove photo" disabled={isDataLocked || isBusy}><TrashIcon className="w-5 h-5" /></button>
                    <button onClick={onDownload} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" title="Download image, video, and info" disabled={isBusy}><DownloadIcon className="w-5 h-5" /></button>
                    <button onClick={onPrepare} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" title="Prepare for video" disabled={isBusy}><PrepareMagicIcon className={`w-5 h-5 ${isPreparing ? 'animate-spin' : ''}`} /></button>
                    <button onClick={onGenerateVideo} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50" title="Generate video" disabled={isBusy || !videoPrompt}><VideoIcon className={`w-5 h-5 ${isGeneratingVideo ? 'animate-spin' : ''}`} /></button>
                </div>

                {isBusy && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-[var(--color-text-main)] text-xs font-semibold z-30 rounded-xl">
                        <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                        <span className="mt-2">{isPreparing ? 'Preparing...' : 'Making Video...'}</span>
                    </div>
                )}
            </div>
            <div className="mt-2 text-xs text-[var(--color-text-dim)] text-center">Original Image</div>
        </div>
    );
};

const HairStudio: React.FC<HairStudioProps> = ({
    logic, onUpload, onRecrop, onShowHelp, onImageClick
}) => {
    const {
        croppedImage,
        croppedImageAspectRatio,
        originalImage,
        options, setOptions,
        isGenerateDisabled,
        pendingImageCount,
        isBusy,
        handleGenerate,
        handleStartOver,
        handleClearImageAndResults,
        sessionId,
        handlePrepareAll,
        isPreparing,
        handleGenerateAllVideos,
        isGeneratingVideos,
        generatedImages,
        handleRegenerateSingle,
        handleRemoveGeneratedImage,
        handlePrepareSingleImage,
        handleGenerateSingleVideo,
        handlePrepareOriginal,
        handleGenerateOriginalVideo,
        handleDownloadOriginal,
        handleDownloadAll,
        handleDownloadSingle,
    } = logic;

    const areGlobalActionsDisabled = isPreparing || isGeneratingVideos || pendingImageCount > 0 || generatedImages.length === 0;

    return (
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12">
            <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)] flex flex-col gap-6">
                <div className="w-full">
                    {!croppedImage ? (
                        <ImageUploader onImageUpload={onUpload} />
                    ) : (
                        <OriginalImageCard
                            originalImage={originalImage}
                            onRecrop={onRecrop}
                            onClear={handleClearImageAndResults}
                            isDataLocked={pendingImageCount > 0}
                            onPrepare={handlePrepareOriginal}
                            onGenerateVideo={handleGenerateOriginalVideo}
                            onDownload={handleDownloadOriginal}
                            aspectRatio={croppedImageAspectRatio}
                        />
                    )}
                </div>
                <div className="w-full">
                    <HairOptionsPanel options={options} setOptions={setOptions} disabled={false} />
                    <button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full mt-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-muted)] disabled:cursor-not-allowed text-[var(--color-text-on-primary)] font-bold py-3 px-4 rounded-lg transition-colors text-lg shadow-md shadow-[var(--color-shadow-primary)]/30">
                        {pendingImageCount > 0 ? `Generating... (${pendingImageCount} left)` : 'Generate My Styles'}
                    </button>
                    <button onClick={handleStartOver} disabled={isBusy} className="w-full mt-3 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface)] disabled:text-[var(--color-text-dimmer)] disabled:cursor-not-allowed text-sm">Start Over</button>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={onShowHelp} className="p-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] rounded-lg text-[var(--color-text-main)] transition-colors" title="Help"><HelpIcon className="w-5 h-5" /></button>
                    </div>
                    {sessionId && <div className="inline-block bg-[var(--color-bg-muted)] text-[var(--color-text-light)] text-sm font-mono py-1.5 px-3 rounded-lg animate-fade-in truncate">Set ID: {sessionId}</div>}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={handlePrepareAll} disabled={areGlobalActionsDisabled || isPreparing} className="flex items-center gap-2 bg-[var(--color-action-prepare)] hover:bg-[var(--color-action-prepare-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm"><PrepareMagicIcon className={`w-4 h-4 ${isPreparing ? 'animate-spin' : ''}`} />{isPreparing ? 'Preparing...' : 'Prepare All'}</button>
                        <button onClick={handleGenerateAllVideos} disabled={areGlobalActionsDisabled || isGeneratingVideos} className="flex items-center gap-2 bg-[var(--color-action-generate)] hover:bg-[var(--color-action-generate-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm"><VideoIcon className={`w-4 h-4 ${isGeneratingVideos ? 'animate-spin' : ''}`} />{isGeneratingVideos ? 'Generating...' : 'Generate Videos'}</button>
                        <button onClick={handleDownloadAll} disabled={isBusy || generatedImages.length === 0} className="flex items-center gap-2 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm"><DownloadIcon className="w-4 h-4" />Download All</button>
                    </div>
                </div>
                {pendingImageCount > 0 && (
                    <div className="mb-4 flex items-center justify-center gap-3 p-3 bg-[var(--color-bg-surface-light)] rounded-lg text-sm text-[var(--color-text-light)]">
                        <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                        <span>Generating {pendingImageCount} new image(s)... Your other actions are unlocked.</span>
                    </div>
                )}
                <ImageGrid
                    images={generatedImages}
                    pendingCount={pendingImageCount}
                    placeholderAspectRatio={croppedImageAspectRatio}
                    onImageClick={onImageClick}
                    onRegenerate={handleRegenerateSingle}
                    onRemove={handleRemoveGeneratedImage}
                    onReprepare={handlePrepareSingleImage}
                    onDownloadSingle={handleDownloadSingle}
                    onGenerateSingleVideo={handleGenerateSingleVideo}
                    mode="hairStudio"
                />
            </div>
        </div>
    );
};

export default React.memo(HairStudio);
