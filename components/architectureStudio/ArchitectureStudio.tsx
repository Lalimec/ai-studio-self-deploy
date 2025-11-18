/// <reference lib="dom" />
import React from 'react';
import { ArchitectureGenerationOptions } from '../../types';
import ImageUploader from '../ImageUploader';
import ArchitectureOptionsPanel from './ArchitectureOptionsPanel';
import ImageGrid from '../ImageGrid';
import { VideoSettingsPanel } from '../VideoSettingsPanel';
import { TrashIcon, HelpIcon, DownloadIcon, PrepareMagicIcon, VideoIcon, DepthMapIcon } from '../Icons';
import { useArchitectureStudio } from '../../hooks/useArchitectureStudio';

type ArchitectureStudioProps = {
    logic: ReturnType<typeof useArchitectureStudio>;
    onUpload: (file: File) => void;
    onRecrop: () => void;
    onShowHelp: () => void;
    onImageClick: (id: string) => void;
};

const ArchitectureStudio: React.FC<ArchitectureStudioProps> = ({
    logic, onUpload, onRecrop, onShowHelp, onImageClick
}) => {
    const {
        croppedImage,
        croppedImageAspectRatio,
        options, setOptions,
        isGenerateDisabled,
        pendingImageCount,
        isBusy,
        handleGenerate,
        handleStartOver,
        handleClearImageAndResults,
        sessionId,
        videoSettings, setVideoSettings,
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
        handleDownloadAll,
        handleDownloadSingle,
    } = logic;

    const areGlobalActionsDisabled = isPreparing || isGeneratingVideos || isGeneratingDepthMaps || pendingImageCount > 0 || generatedImages.length === 0;

    return (
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12">
            <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)] flex flex-col gap-6">
                <div className="w-full">
                    {!croppedImage ? (
                        <ImageUploader onImageUpload={onUpload} />
                    ) : (
                        <div className="relative group w-full">
                            <img src={croppedImage} alt="Your cropped architectural photo" className="rounded-xl shadow-lg shadow-[var(--color-shadow-primary)]/20 object-cover w-full" style={{ aspectRatio: croppedImageAspectRatio }} />
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" >
                                <button onClick={onRecrop} className="bg-[var(--color-bg-surface)]/80 text-[var(--color-text-main)] py-2 px-4 rounded-md text-sm font-semibold hover:bg-black/80" disabled={isBusy}>Recrop</button>
                            </div>
                            <button onClick={handleClearImageAndResults} className="absolute top-2 right-2 p-2 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all opacity-0 group-hover:opacity-100" disabled={isBusy}><TrashIcon className="w-5 h-5" /></button>
                        </div>
                    )}
                </div>
                <div className="w-full">
                    <ArchitectureOptionsPanel options={options} setOptions={setOptions} disabled={false} />
                    <button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full mt-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-muted)] disabled:cursor-not-allowed text-[var(--color-text-on-primary)] font-bold py-3 px-4 rounded-lg transition-colors text-lg shadow-md shadow-[var(--color-shadow-primary)]/30">
                        {pendingImageCount > 0 ? `Generating... (${pendingImageCount} left)` : 'Generate Architectural Styles'}
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
                        <button onClick={handleGenerateAllDepthMaps} disabled={areGlobalActionsDisabled || isGeneratingDepthMaps} className="flex items-center gap-2 bg-[var(--color-action-generate)] hover:bg-[var(--color-action-generate-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm"><DepthMapIcon className={`w-4 h-4 ${isGeneratingDepthMaps ? 'animate-spin' : ''}`} />{isGeneratingDepthMaps ? 'Generating...' : 'Generate Depth Maps'}</button>
                        <button onClick={handleDownloadAll} disabled={isBusy || generatedImages.length === 0} className="flex items-center gap-2 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm"><DownloadIcon className="w-4 h-4" />Download All</button>
                    </div>
                </div>

                <VideoSettingsPanel
                    settings={videoSettings}
                    onSettingsChange={setVideoSettings}
                    disabled={isBusy}
                />

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
    );
};

export default React.memo(ArchitectureStudio);
