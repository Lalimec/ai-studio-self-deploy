/// <reference lib="dom" />
import React from 'react';
import { useImageStudioLogic } from '../hooks/useImageStudioLogic';
import { ImageUploader } from './imageStudio/ImageUploader';
import { PromptEditor } from './imageStudio/PromptEditor';
import JustifiedGalleryGrid from './JustifiedGalleryGrid';
import { CropChoiceModal } from './imageStudio/CropChoiceModal';
import { MultiCropView } from './imageStudio/MultiCropView';
import { AdvancedOptions } from './imageStudio/AdvancedOptions';
import GenerationToolbar from './GenerationToolbar';
import { NANO_BANANA_RATIOS, FLUX_KONTEXT_PRO_RATIOS, SEEDREAM_HIGGSFIELD_RATIOS, ASPECT_RATIO_PRESETS } from '../constants';
import { HelpIcon, PiSpinnerIcon, PiDownloadSimpleIcon, PiCubeIcon, BananaIcon, WavesIcon, ZapIcon, FlowerIcon } from './Icons';
import { ImageStudioConfirmationDialog } from './imageStudio/ImageStudioConfirmationDialog';
import { AspectRatio, ImageStudioResultImage } from '../types';
import StudioLayout from './StudioLayout';


interface ImageStudioProps {
    logic: ReturnType<typeof useImageStudioLogic>;
    onImageClick: (url: string) => void;
    onShowHelp: () => void;
}


const ImageStudio: React.FC<ImageStudioProps> = ({ logic, onImageClick, onShowHelp }) => {
    const failedCount = logic.generationResults.filter(r => r.status === 'error' || r.status === 'warning').length;
    const pendingCount = logic.generationResults.filter(r => r.status === 'pending').length;

    // Convert successful generation results to DisplayImage format for JustifiedGalleryGrid
    const successfulImages: ImageStudioResultImage[] = logic.generationResults
        .filter(r => r.status === 'success' && r.url)
        .map(r => ({
            src: r.url!,
            filename: r.key,
            imageGenerationPrompt: r.prompt || '',
            isPreparing: false,
            videoPrompt: undefined,
            videoSrc: undefined,
            isGeneratingVideo: false,
        }));

    // Get aspect ratio options based on model
    const getAspectRatioOptions = () => {
        if (logic.model === 'flux') {
            return FLUX_KONTEXT_PRO_RATIOS.map(r => ({ value: r, label: r }));
        }
        if (logic.model === 'seedream' && logic.seedreamProvider === 'higgsfield') {
            return SEEDREAM_HIGGSFIELD_RATIOS.map(r => ({ value: r, label: r }));
        }
        // For all other models (nano-banana, nano-banana-pro, gemini, qwen, seedream FAL)
        // NANO_BANANA_RATIOS already includes 'auto' as first element
        return NANO_BANANA_RATIOS.map(r => ({ value: r, label: r === 'auto' ? 'Auto' : r }));
    };

    const modelButtons = [
        {
            key: 'nano-banana',
            icon: <BananaIcon className="w-5 h-5" />,
            label: 'Nano Banana',
            onClick: () => logic.setModel('nano-banana'),
            isActive: logic.model === 'nano-banana'
        },
        {
            key: 'nano-banana-pro',
            icon: (
                <div className="relative">
                    <BananaIcon className="w-5 h-5" />
                    <span className="absolute -bottom-2 -right-2 text-[8px] font-bold leading-none">PRO</span>
                </div>
            ),
            label: 'Nano Banana Pro',
            onClick: () => logic.setModel('nano-banana-pro'),
            isActive: logic.model === 'nano-banana-pro'
        },
        {
            key: 'seedream',
            icon: <WavesIcon className="w-5 h-5" />,
            label: 'Seedream Edit',
            onClick: () => logic.setModel('seedream'),
            isActive: logic.model === 'seedream'
        },
        {
            key: 'flux-kontext-pro',
            icon: <ZapIcon className="w-5 h-5" />,
            label: 'Flux Kontext Pro',
            onClick: () => logic.setModel('flux-kontext-pro'),
            isActive: logic.model === 'flux-kontext-pro'
        },
        {
            key: 'qwen',
            icon: <FlowerIcon className="w-5 h-5" />,
            label: 'Qwen Image Edit',
            onClick: () => logic.setModel('qwen'),
            isActive: logic.model === 'qwen'
        }
    ];

    if (logic.croppingFiles) {
        return (
            <MultiCropView
                files={logic.croppingFiles}
                onConfirm={logic.handleCropConfirm}
                onCancel={logic.handleCropCancel}
            />
        );
    }

    return (
        <>
            <div className="w-full max-w-screen-2xl mx-auto flex flex-col gap-6 pb-28">
                <StudioLayout
                    sidebar={
                        <>
                            <ImageUploader
                                onImageSelect={logic.handleNewImageUpload}
                                imagePreviewUrls={logic.imagePreviewUrls}
                                onRemoveImage={logic.handleRemoveUploadedImage}
                                onRemoveAll={logic.handleRemoveAllUploadedImages}
                                imageFiles={logic.imageFiles}
                                inputImageWarnings={logic.inputImageWarnings}
                            />

                            <div className="w-full relative">
                                <PromptEditor
                                    numberOfVersions={logic.numberOfVersions}
                                    onNumberOfVersionsChange={logic.handleNumberOfVersionsChange}
                                    promptContents={logic.promptContents}
                                    onPromptContentChange={logic.handlePromptContentChange}
                                    // FIX: Correct prop name from onEnhanceAndTranslate to onTranslate and handler
                                    onTranslate={logic.handleTranslatePrompt}
                                    translatingIndices={logic.translatingIndices}
                                    onGenerateVariation={logic.handleGenerateVariation}
                                    generatingVariationIndices={logic.generatingVariationIndices}
                                    onEnhance={logic.handleEnhancePrompt}
                                    enhancingIndices={logic.enhancingIndices}
                                />
                                {logic.jsonPrompts.trim() !== '' && !logic.jsonError && (
                                    <div className="absolute inset-0 bg-[var(--color-bg-muted)]/50 backdrop-blur-[2px] rounded-lg flex items-center justify-center text-center p-4">
                                        <p className="text-[var(--color-text-light)] font-semibold bg-[var(--color-bg-base)]/70 px-4 py-2 rounded-md shadow">
                                            Using Bulk Prompts from Advanced Options
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    }
                >
                    <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={onShowHelp} className="p-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] rounded-lg text-[var(--color-text-main)] transition-colors" title="Help">
                                <HelpIcon className="w-5 h-5" />
                            </button>
                        </div>
                        {logic.setId && <div className="inline-block bg-[var(--color-bg-muted)] text-[var(--color-text-light)] text-sm font-mono py-1.5 px-3 rounded-lg animate-fade-in truncate">Set ID: {logic.setId}</div>}

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            {failedCount > 0 && (
                                <button
                                    onClick={logic.handleRetryAll}
                                    disabled={logic.isLoading}
                                    className="flex items-center gap-2 bg-[var(--color-warning)] hover:bg-[var(--color-warning-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
                                    aria-label={`Retry ${failedCount} failed images`}
                                >
                                    <PiSpinnerIcon className="w-5 h-5" />
                                    Retry Failed ({failedCount})
                                </button>
                            )}
                            <label className="flex items-center gap-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={logic.includeOriginals}
                                    onChange={(e) => logic.setIncludeOriginals(e.target.checked)}
                                    className="h-4 w-4 rounded border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-primary)] focus:ring-[var(--color-primary-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-muted)]"
                                />
                                <span>Include originals</span>
                            </label>
                            <button
                                onClick={logic.handleDownloadAll}
                                disabled={logic.isLoading || logic.generationResults.length === 0}
                                className="flex items-center gap-2 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm"
                            >
                                <PiDownloadSimpleIcon className="w-4 h-4" />
                                Download All
                            </button>
                        </div>
                    </div>

                    <JustifiedGalleryGrid
                        images={successfulImages}
                        pendingCount={pendingCount}
                        errors={logic.generationResults
                            .filter(r => r.status === 'error' || r.status === 'warning')
                            .map(r => ({
                                id: r.key,
                                error: r.error || 'Unknown error',
                                prompt: r.prompt,
                                modelResponse: r.modelResponse
                            }))}
                        pendingAspectRatio={logic.aspectRatio || '1:1'}
                        progressCompleted={logic.progress.completed}
                        progressTotal={logic.progress.total}
                        onImageClick={(filename) => {
                            const result = logic.generationResults.find(r => r.key === filename);
                            if (result?.url) onImageClick(result.url);
                        }}
                        onRegenerate={logic.handleRetryOne}
                        onRemove={logic.handleRemoveGeneratedImage}
                        onRemoveError={logic.handleRemoveGeneratedImage}
                        onDownloadSingle={logic.handleDownloadSingle}
                        emptyStateIcon={PiCubeIcon}
                        emptyStateTitle="Your Images Await"
                        emptyStateDescription="Upload images, choose a prompt, and click generate."
                        showVideoActions={false}
                    />
                </StudioLayout>

                <AdvancedOptions
                    isAdvancedOpen={logic.isAdvancedOpen}
                    setIsAdvancedOpen={logic.setIsAdvancedOpen}
                    prependPrompt={logic.prependPrompt}
                    setPrependPrompt={logic.setPrependPrompt}
                    appendPrompt={logic.appendPrompt}
                    setAppendPrompt={logic.setAppendPrompt}
                    promptGenerationInstructions={logic.promptGenerationInstructions}
                    setPromptGenerationInstructions={logic.setPromptGenerationInstructions}
                    isTranslatingInstructions={logic.isTranslatingInstructions}
                    handleTranslateInstructions={logic.handleTranslateInstructions}
                    isGeneratingPrompts={logic.isGeneratingPrompts}
                    handleGeneratePromptList={logic.handleGeneratePromptList}
                    jsonPrompts={logic.jsonPrompts}
                    handleJsonPromptChange={logic.handleJsonPromptChange}
                    jsonError={logic.jsonError}
                    filenameTemplate={logic.filenameTemplate}
                    setFilenameTemplate={logic.setFilenameTemplate}
                />

                <ImageStudioConfirmationDialog
                    isOpen={!!logic.pendingFiles}
                    onCancel={logic.handleCancelUpload}
                    onConfirm={logic.handleConfirmClearAndUpload}
                />

                <CropChoiceModal
                    isOpen={logic.showCropChoiceModal}
                    onCrop={logic.handleStartCropping}
                    onUseOriginals={logic.handleUseOriginals}
                    onCancel={logic.handleCancelCropChoice}
                />
            </div>

            <GenerationToolbar
                aspectRatio={(logic.aspectRatio || '1:1') as AspectRatio}
                onAspectRatioChange={(ratio) => logic.setAspectRatio(ratio)}
                aspectRatioOptions={getAspectRatioOptions()}
                showAspectRatio={logic.model !== 'seedream' || logic.seedreamProvider === 'higgsfield'}
                showImageCount={false}
                imageCount={1}
                onImageCountChange={() => { }}
                modelButtons={modelButtons}
                modeButtons={logic.model === 'nano-banana-pro' ? [
                    {
                        key: '1K',
                        text: '1K',
                        onClick: () => logic.setResolution('1K'),
                        isActive: logic.resolution === '1K',
                        tooltip: '1024x1024 resolution'
                    },
                    {
                        key: '2K',
                        text: '2K',
                        onClick: () => logic.setResolution('2K'),
                        isActive: logic.resolution === '2K',
                        tooltip: '2048x2048 resolution'
                    },
                    {
                        key: '4K',
                        text: '4K',
                        onClick: () => logic.setResolution('4K'),
                        isActive: logic.resolution === '4K',
                        tooltip: '4096x4096 resolution'
                    }
                ] : (logic.model === 'seedream' && logic.seedreamProvider === 'higgsfield') ? [
                    {
                        key: '2k',
                        text: '2K',
                        onClick: () => logic.setSeedreamResolution('2k'),
                        isActive: logic.seedreamResolution === '2k',
                        tooltip: '2K resolution'
                    },
                    {
                        key: '4k',
                        text: '4K',
                        onClick: () => logic.setSeedreamResolution('4k'),
                        isActive: logic.seedreamResolution === '4k',
                        tooltip: '4K resolution'
                    }
                ] : undefined}
                generateButtonText="Generate"
                onGenerate={logic.handleGenerate}
                generateDisabled={logic.isGenerateDisabled}
                pendingCount={logic.isLoading ? logic.progress.total - logic.progress.completed : 0}
                startOverButtonText="Clear"
                onStartOver={logic.handleStartOver}
                startOverDisabled={logic.isLoading || logic.generationResults.length === 0}
                studioMode="image"
                seedreamSettings={(logic.model === 'seedream' && logic.seedreamProvider === 'fal') ? {
                    imageSizePreset: logic.imageSizePreset,
                    onImageSizePresetChange: logic.setImageSizePreset,
                    imageSizePresets: logic.imageSizePresets,
                    customWidth: logic.customWidth,
                    customHeight: logic.customHeight,
                    onCustomWidthChange: logic.setCustomWidth,
                    onCustomHeightChange: logic.setCustomHeight,
                    aspectRatioPresets: ASPECT_RATIO_PRESETS,
                    currentAspectRatio: logic.aspectRatio,
                    onAspectRatioPresetClick: (preset) => {
                        if (logic.imageSizePreset === 'custom') {
                            logic.setCustomWidth(preset.width);
                            logic.setCustomHeight(preset.height);
                        } else if (logic.imageSizePreset === 'custom_4K' || logic.imageSizePreset === 'custom_2K') {
                            logic.setAspectRatio(preset.label);
                        }
                    },
                    isSeedreamAspectRatioInvalid: logic.isSeedreamAspectRatioInvalid
                } : undefined}
            />
        </>
    );
};

export default React.memo(ImageStudio);
