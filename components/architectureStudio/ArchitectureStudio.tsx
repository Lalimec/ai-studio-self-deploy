/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { ArchitectureGenerationOptions, OriginalImageState } from '../../types';
import ImageUploader from '../ImageUploader';
import ArchitectureOptionsPanel from './ArchitectureOptionsPanel';
import ImageGrid from '../ImageGrid';
import GenerationToolbar from '../GenerationToolbar';
import { TrashIcon, HelpIcon, DownloadIcon, PrepareMagicIcon, VideoIcon, DepthMapIcon, AlertCircleIcon, CheckCircleIcon } from '../Icons';
import { useArchitectureStudio } from '../../hooks/useArchitectureStudio';

type ArchitectureStudioProps = {
    logic: ReturnType<typeof useArchitectureStudio>;
    onUpload: (file: File) => void;
    onRecrop: () => void;
    onShowHelp: () => void;
    onImageClick: (id: string) => void;
};

const OriginalImageCard: React.FC<{
    originalImage: OriginalImageState;
    transformedVersions: any; // TransformedVersionsState
    selectedVersion: any; // ActiveVersionType
    onSelectVersion: (version: any) => void;
    onRecrop: () => void;
    onClear: () => void;
    isDataLocked: boolean;
    onPrepare: (version: any) => void;
    onGenerateVideo: (version: any) => void;
    onGenerateDepthMap: (version: any) => void;
    onDownload: (version: any) => void;
    onGenerateTransformation: (type: any) => void;
    onRemoveTransformation: (type: any) => void;
    aspectRatio: number;
}> = ({
    originalImage,
    transformedVersions,
    selectedVersion,
    onSelectVersion,
    onRecrop,
    onClear,
    isDataLocked,
    onPrepare,
    onGenerateVideo,
    onGenerateDepthMap,
    onDownload,
    onGenerateTransformation,
    onRemoveTransformation,
    aspectRatio
}) => {
    // IMPORTANT: All hooks must be called before any conditional returns
    const [isHovering, setIsHovering] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    // Get the currently displayed image based on selected version
    // If viewing a transformation that's generating or doesn't exist, fall back to original
    const activeImage = selectedVersion === 'real'
        ? originalImage
        : (transformedVersions[selectedVersion]?.croppedSrc ? transformedVersions[selectedVersion] : originalImage);

    const { croppedSrc, isPreparing, isGeneratingVideo, isGeneratingDepthMap, videoSrc, videoPrompt, videoGenerationFailed, depthMapSrc, depthMapGenerationFailed } = activeImage || {};
    const isGeneratingTransformation = selectedVersion !== 'real' && transformedVersions[selectedVersion]?.isGenerating;
    const isBusy = isPreparing || isGeneratingVideo || isGeneratingDepthMap || isGeneratingTransformation;

    useEffect(() => {
        if (videoSrc) setIsVideoReady(false);
    }, [videoSrc]);

    const transformationTypes = [
        { id: 'tidy', label: 'Tidy', icon: '✨', tooltip: 'Clean and organized' },
        { id: 'unfurnished', label: 'Unfurnished', icon: '🏗️', tooltip: 'Under construction' },
        { id: 'livedIn', label: 'Lived-in', icon: '🛋️', tooltip: 'Daily life clutter' }
    ];

    // Early return AFTER all hooks have been called
    if (!originalImage?.croppedSrc) return null;

    // Find the current transformation type info if we're viewing a transformation
    const currentTransformationType = transformationTypes.find(t => t.id === selectedVersion);
    const isViewingTransformation = selectedVersion !== 'real';
    const transformationExists = isViewingTransformation && transformedVersions[selectedVersion];

    return (
        <div className="w-full flex flex-col items-center">
            {/* Custom tooltip styles */}
            <style>{`
                .arch-tooltip {
                    position: relative;
                }
                .arch-tooltip::after {
                    content: attr(data-tooltip);
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%) translateY(-4px);
                    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
                    color: var(--color-text-on-primary);
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 600;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.15s ease;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    z-index: 50;
                }
                .arch-tooltip:hover::after {
                    opacity: 1;
                    transition-delay: 0s;
                }
            `}</style>

            {/* Tabs for version selection */}
            <div className="w-full flex gap-1 mb-3">
                <button
                    onClick={() => onSelectVersion('real')}
                    data-tooltip="Original image"
                    className={`arch-tooltip flex-1 py-2 px-2 text-xs font-semibold rounded-md transition-colors ${
                        selectedVersion === 'real'
                            ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                            : 'bg-[var(--color-bg-muted)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted-hover)]'
                    }`}
                >
                    🏠
                </button>
                {transformationTypes.map(({ id, label, icon, tooltip }) => {
                    const version = transformedVersions[id];
                    const isVersionGenerating = version?.isGenerating;
                    return (
                        <button
                            key={id}
                            onClick={() => onSelectVersion(id)}
                            data-tooltip={isVersionGenerating ? `Generating ${label}...` : tooltip}
                            className={`arch-tooltip flex-1 py-2 px-2 text-xs font-semibold rounded-md transition-colors relative ${
                                selectedVersion === id
                                    ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                                    : 'bg-[var(--color-bg-muted)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted-hover)]'
                            }`}
                        >
                            {isVersionGenerating ? (
                                <span className="inline-block w-3 h-3 border-2 border-dashed rounded-full animate-spin border-current"></span>
                            ) : (
                                icon
                            )}
                        </button>
                    );
                })}
            </div>

            <div
                className="relative group w-full"
                onMouseEnter={() => videoSrc && setIsHovering(true)}
                onMouseLeave={() => videoSrc && setIsHovering(false)}
                style={{ aspectRatio }}
            >
                <img src={croppedSrc} alt="Architectural photo" className="rounded-xl shadow-lg shadow-[var(--color-shadow-primary)]/20 object-cover w-full h-full" />

                {videoSrc && isHovering && (
                    <div className="absolute inset-0">
                        {!isVideoReady && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-xl"><div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-[var(--color-text-main)]"></div></div>}
                        <video key={videoSrc} src={videoSrc} onCanPlay={() => setIsVideoReady(true)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-5 rounded-xl" style={{ opacity: isVideoReady ? 1 : 0 }} />
                    </div>
                )}

                {(videoGenerationFailed || depthMapGenerationFailed) && !isBusy && (
                    <div className="absolute inset-0 bg-red-500/30 pointer-events-none flex items-center justify-center rounded-xl" title={videoGenerationFailed ? "Video generation failed" : "Depth map generation failed"}>
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
                {depthMapSrc && !isBusy && (
                    <div className="absolute top-14 left-2 p-1 bg-black bg-opacity-60 rounded-full text-[var(--color-info-accent)] pointer-events-none" title="Depth map is ready">
                        <DepthMapIcon className="w-5 h-5" />
                    </div>
                )}

                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                    <button onClick={onRecrop} className="bg-[var(--color-bg-surface)]/80 text-[var(--color-text-main)] py-2 px-4 rounded-md text-sm font-semibold hover:bg-black/80" disabled={isDataLocked || isBusy}>Recrop</button>
                </div>

                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onClick={onClear} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" aria-label="Remove photo" disabled={isDataLocked || isBusy}><TrashIcon className="w-5 h-5" /></button>
                    <button onClick={() => onDownload(selectedVersion)} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" title="Download image, video, depth map, and info" disabled={isBusy}><DownloadIcon className="w-5 h-5" /></button>
                    <button onClick={() => onPrepare(selectedVersion)} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" title="Prepare for video" disabled={isBusy}><PrepareMagicIcon className={`w-5 h-5 ${isPreparing ? 'animate-spin' : ''}`} /></button>
                    <button onClick={() => onGenerateVideo(selectedVersion)} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50" title="Generate video" disabled={isBusy || !videoPrompt}><VideoIcon className={`w-5 h-5 ${isGeneratingVideo ? 'animate-spin' : ''}`} /></button>
                    <button onClick={() => onGenerateDepthMap(selectedVersion)} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" title="Generate depth map" disabled={isBusy}><DepthMapIcon className={`w-5 h-5 ${isGeneratingDepthMap ? 'animate-spin' : ''}`} /></button>
                </div>

                {/* Delete button on bottom-left when viewing an existing transformation */}
                {isViewingTransformation && transformationExists && !isBusy && (
                    <button
                        onClick={() => onRemoveTransformation(selectedVersion)}
                        className="absolute bottom-2 left-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-all z-20 opacity-0 group-hover:opacity-100"
                        title={`Delete ${currentTransformationType?.label} version`}
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )}

                {/* Generate button overlay when viewing an empty transformation tab */}
                {isViewingTransformation && !transformationExists && !isGeneratingTransformation && !isBusy && (
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60 flex flex-col items-center justify-center rounded-xl z-25">
                        <div className="text-center">
                            <div className="text-4xl mb-3">{currentTransformationType?.icon}</div>
                            <button
                                onClick={() => onGenerateTransformation(selectedVersion)}
                                disabled={isDataLocked}
                                className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] hover:from-[var(--color-primary-hover)] hover:to-[var(--color-secondary)] text-[var(--color-text-on-primary)] py-3 px-6 rounded-lg text-sm font-bold shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                Generate {currentTransformationType?.label} Version
                            </button>
                            <p className="text-white/80 text-xs mt-2 max-w-xs">{currentTransformationType?.tooltip}</p>
                        </div>
                    </div>
                )}

                {isBusy && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-[var(--color-text-main)] text-xs font-semibold z-30 rounded-xl">
                        <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                        <span className="mt-2">
                            {isPreparing ? 'Preparing...' : isGeneratingVideo ? 'Making Video...' : isGeneratingDepthMap ? 'Generating Depth Map...' : isGeneratingTransformation ? `Generating ${currentTransformationType?.label}...` : 'Processing...'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

const ArchitectureStudio: React.FC<ArchitectureStudioProps> = ({
    logic, onUpload, onRecrop, onShowHelp, onImageClick
}) => {
    const {
        croppedImage,
        croppedImageAspectRatio,
        originalImage,
        transformedVersions,
        selectedVersion,
        setSelectedVersion,
        options, setOptions,
        isGenerateDisabled,
        pendingImageCount,
        isBusy,
        handleGenerate,
        handleGenerateUnstyled,
        handleStartOver,
        handleClearImageAndResults,
        sessionId,
        handlePrepareAll,
        isPreparing,
        handleGenerateAllVideos,
        isGeneratingVideos,
        handleGenerateAllDepthMaps,
        isGeneratingDepthMaps,
        generatedImages,
        handleRegenerateSingle,
        handleRemoveGeneratedImage,
        handlePrepareSingleImage,
        handleGenerateSingleVideo,
        handleGenerateSingleDepthMap,
        handlePrepareOriginal,
        handleGenerateOriginalVideo,
        handleGenerateOriginalDepthMap,
        handleDownloadOriginal,
        handleDownloadAll,
        handleDownloadSingle,
        handleGenerateTransformation,
        handleRemoveTransformation,
        handlePrepareVersion,
        handleGenerateVersionVideo,
        handleGenerateVersionDepthMap,
        handleDownloadVersion,
    } = logic;

    const areGlobalActionsDisabled = isPreparing || isGeneratingVideos || pendingImageCount > 0 || generatedImages.length === 0;
    const areDepthMapActionsDisabled = isGeneratingDepthMaps || pendingImageCount > 0 || generatedImages.length === 0;

    return (
        <>
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 pb-28">
            <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)] flex flex-col gap-6">
                <div className="w-full">
                    {!croppedImage ? (
                        <ImageUploader onImageUpload={onUpload} />
                    ) : (
                        <OriginalImageCard
                            originalImage={originalImage}
                            transformedVersions={transformedVersions}
                            selectedVersion={selectedVersion}
                            onSelectVersion={setSelectedVersion}
                            onRecrop={onRecrop}
                            onClear={handleClearImageAndResults}
                            isDataLocked={pendingImageCount > 0}
                            onPrepare={handlePrepareVersion}
                            onGenerateVideo={handleGenerateVersionVideo}
                            onGenerateDepthMap={handleGenerateVersionDepthMap}
                            onDownload={handleDownloadVersion}
                            onGenerateTransformation={handleGenerateTransformation}
                            onRemoveTransformation={handleRemoveTransformation}
                            aspectRatio={croppedImageAspectRatio}
                        />
                    )}
                </div>
                <div className="w-full">
                    <ArchitectureOptionsPanel options={options} setOptions={setOptions} disabled={false} />
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
                        <button onClick={handleGenerateAllDepthMaps} disabled={areDepthMapActionsDisabled || isGeneratingDepthMaps} className="flex items-center gap-2 bg-[var(--color-action-generate)] hover:bg-[var(--color-action-generate-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm"><DepthMapIcon className={`w-4 h-4 ${isGeneratingDepthMaps ? 'animate-spin' : ''}`} />{isGeneratingDepthMaps ? 'Generating...' : 'Generate Depth Maps'}</button>
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
                    onGenerateDepthMap={handleGenerateSingleDepthMap}
                    mode="architectureStudio"
                />
            </div>
        </div>

        <GenerationToolbar
            aspectRatio={options.aspectRatio}
            onAspectRatioChange={(ratio) => setOptions(prev => ({ ...prev, aspectRatio: ratio }))}
            aspectRatioDisabled={false}
            showImageCount={options.styleSelectionMode === 'random'}
            imageCount={options.imageCount}
            onImageCountChange={(count) => setOptions(prev => ({ ...prev, imageCount: count }))}
            imageCountMin={1}
            imageCountMax={12}
            imageCountDisabled={false}
            generateButtonText="Generate"
            onGenerate={handleGenerate}
            generateDisabled={isGenerateDisabled}
            pendingCount={pendingImageCount}
            modeButtons={[
                {
                    key: 'selected',
                    text: 'Selected',
                    onClick: () => setOptions(prev => ({ ...prev, styleSelectionMode: 'selected', imageCount: 1 })),
                    disabled: false,
                    isActive: options.styleSelectionMode === 'selected',
                    tooltip: 'Generate one image for each selected style',
                },
                {
                    key: 'random',
                    text: 'Random',
                    onClick: () => setOptions(prev => ({ ...prev, styleSelectionMode: 'random' })),
                    disabled: false,
                    isActive: options.styleSelectionMode === 'random',
                    tooltip: 'Randomly pick styles from selected or all styles',
                },
            ]}
            startOverButtonText="Clear"
            onStartOver={handleStartOver}
            startOverDisabled={isBusy}
            studioMode="architecture"
        />
        </>
    );
};

export default React.memo(ArchitectureStudio);
