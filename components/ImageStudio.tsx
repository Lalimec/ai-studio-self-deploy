/// <reference lib="dom" />
import React from 'react';
import { useImageStudioLogic } from '../hooks/useImageStudioLogic';
import { ImageUploader } from './imageStudio/ImageUploader';
import { PromptEditor } from './imageStudio/PromptEditor';
import { GeneratedImageDisplay } from './imageStudio/GeneratedImageDisplay';
import { CropChoiceModal } from './imageStudio/CropChoiceModal';
import { MultiCropView } from './imageStudio/MultiCropView';
import { AdvancedOptions } from './imageStudio/AdvancedOptions';
import GenerationToolbar from './GenerationToolbar';
import { NANO_BANANA_RATIOS, FLUX_KONTEXT_PRO_RATIOS, ASPECT_RATIO_PRESETS } from '../constants';
import { HelpIcon, PiSpinnerIcon, PiDownloadSimpleIcon, PiCloseIcon, BananaIcon, WavesIcon, ZapIcon, FlowerIcon } from './Icons';
import { ImageStudioConfirmationDialog } from './imageStudio/ImageStudioConfirmationDialog';
import { AspectRatio } from '../types';


interface ImageStudioProps {
    logic: ReturnType<typeof useImageStudioLogic>;
    onImageClick: (url: string) => void;
    onShowHelp: () => void;
}


const ImageStudio: React.FC<ImageStudioProps> = ({ logic, onImageClick, onShowHelp }) => {
    const failedCount = logic.generationResults.filter(r => r.status === 'error' || r.status === 'warning').length;

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
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 pb-28">
             <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12">
                <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)] flex flex-col items-center gap-6">
                    <ImageUploader 
                        onImageSelect={logic.handleNewImageUpload} 
                        imagePreviewUrls={logic.imagePreviewUrls} 
                        onRemoveImage={logic.handleRemoveUploadedImage}
                        onRemoveAll={logic.handleRemoveAllUploadedImages}
                        imageFiles={logic.imageFiles}
                        inputImageWarnings={logic.inputImageWarnings}
                    />

                    <div className="w-full flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">2. Configure Model & Size</label>
                            <div className="flex justify-center gap-3 p-1">
                                <button
                                    onClick={() => logic.setModel('nano-banana')}
                                    className={`group relative p-3 rounded-lg transition-all ${logic.model === 'nano-banana' ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-lg scale-110' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-muted-hover)] hover:scale-105'}`}
                                    aria-label="Select Nano Banana model"
                                >
                                    <BananaIcon className="w-6 h-6" />
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--color-primary-accent)] text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none shadow-lg z-50">
                                        Nano Banana
                                    </span>
                                </button>
                                <button
                                    onClick={() => logic.setModel('seedream')}
                                    className={`group relative p-3 rounded-lg transition-all ${logic.model === 'seedream' ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-lg scale-110' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-muted-hover)] hover:scale-105'}`}
                                    aria-label="Select Seedream Edit model"
                                >
                                    <WavesIcon className="w-6 h-6" />
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--color-primary-accent)] text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none shadow-lg z-50">
                                        Seedream Edit
                                    </span>
                                </button>
                                <button
                                    onClick={() => logic.setModel('flux-kontext-pro')}
                                    className={`group relative p-3 rounded-lg transition-all ${logic.model === 'flux-kontext-pro' ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-lg scale-110' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-muted-hover)] hover:scale-105'}`}
                                    aria-label="Select Flux Kontext Pro model"
                                >
                                    <ZapIcon className="w-6 h-6" />
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--color-primary-accent)] text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none shadow-lg z-50">
                                        Flux Kontext Pro
                                    </span>
                                </button>
                                <button
                                    onClick={() => logic.setModel('qwen')}
                                    className={`group relative p-3 rounded-lg transition-all ${logic.model === 'qwen' ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-lg scale-110' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-muted-hover)] hover:scale-105'}`}
                                    aria-label="Select Qwen Image Edit model"
                                >
                                    <FlowerIcon className="w-6 h-6" />
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--color-primary-accent)] text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none shadow-lg z-50">
                                        Qwen Image Edit
                                    </span>
                                </button>
                            </div>
                        </div>
                        
                        {logic.model === 'nano-banana' && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-2">Aspect Ratio (Optional)</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {NANO_BANANA_RATIOS.map(ratio => (
                                        <button
                                            key={ratio}
                                            onClick={() => logic.setAspectRatio(logic.aspectRatio === ratio ? null : ratio)}
                                            className={`py-2 text-xs font-semibold rounded-md transition-colors ${logic.aspectRatio === ratio ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'}`}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {logic.model === 'flux-kontext-pro' && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-2">Aspect Ratio (Optional)</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {FLUX_KONTEXT_PRO_RATIOS.map(ratio => (
                                        <button
                                            key={ratio}
                                            onClick={() => logic.setAspectRatio(logic.aspectRatio === ratio ? null : ratio)}
                                            className={`py-2 text-xs font-semibold rounded-md transition-colors ${logic.aspectRatio === ratio ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'}`}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {logic.model === 'seedream' && (
                            <div>
                                <label htmlFor="image-size-preset" className="block text-sm font-medium text-[var(--color-text-light)] mb-1">
                                    Image Size
                                </label>
                                <div className="flex items-center gap-2">
                                    <select
                                        id="image-size-preset"
                                        value={logic.imageSizePreset}
                                        onChange={(e) => logic.setImageSizePreset(e.target.value)}
                                        className="block flex-1 min-w-0 rounded-md border-0 bg-[var(--color-bg-base)] py-2 px-3 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-default)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] sm:text-sm"
                                    >
                                        {Object.keys(logic.imageSizePresets).map((key) => (
                                            <option key={key} value={key}>{logic.imageSizePresets[key].name}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        value={logic.imageSizePreset.startsWith('auto') ? '' : logic.customWidth}
                                        placeholder={logic.imageSizePreset.startsWith('auto') ? '?' : undefined}
                                        onChange={(e) => logic.setCustomWidth(Math.max(1024, Math.min(4096, parseInt(e.target.value, 10) || 1024)))}
                                        disabled={logic.imageSizePreset !== 'custom'}
                                        readOnly={logic.imageSizePreset === 'custom_4K' || logic.imageSizePreset === 'custom_2K'}
                                        className="block w-12 rounded-md border-0 bg-[var(--color-bg-base)] py-2 px-2 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-default)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        aria-label="Width"
                                        min="1024"
                                        max="4096"
                                    />
                                    <span className="text-[var(--color-text-dimmer)]">×</span>
                                    <input
                                        type="number"
                                        value={logic.imageSizePreset.startsWith('auto') ? '' : logic.customHeight}
                                        placeholder={logic.imageSizePreset.startsWith('auto') ? '?' : undefined}
                                        onChange={(e) => logic.setCustomHeight(Math.max(1024, Math.min(4096, parseInt(e.target.value, 10) || 1024)))}
                                        disabled={logic.imageSizePreset !== 'custom'}
                                        readOnly={logic.imageSizePreset === 'custom_4K' || logic.imageSizePreset === 'custom_2K'}
                                        className="block w-12 rounded-md border-0 bg-[var(--color-bg-base)] py-2 px-2 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-default)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        aria-label="Height"
                                        min="1024"
                                        max="4096"
                                    />
                                </div>
                                {(logic.imageSizePreset === 'custom' || logic.imageSizePreset === 'custom_4K' || logic.imageSizePreset === 'custom_2K') && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {ASPECT_RATIO_PRESETS.map(preset => {
                                            // For custom mode, check width/height match
                                            // For custom_4K/custom_2K, check aspectRatio label match
                                            const isActive = logic.imageSizePreset === 'custom'
                                                ? preset.width === logic.customWidth && preset.height === logic.customHeight
                                                : logic.aspectRatio === preset.label;
                                            return (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => {
                                                        if (logic.imageSizePreset === 'custom') {
                                                            // For custom mode, directly set width/height
                                                            logic.setCustomWidth(preset.width);
                                                            logic.setCustomHeight(preset.height);
                                                        } else if (logic.imageSizePreset === 'custom_4K' || logic.imageSizePreset === 'custom_2K') {
                                                            // For custom_4K/custom_2K, set aspect ratio which triggers recalculation
                                                            logic.setAspectRatio(preset.label);
                                                        }
                                                    }}
                                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                                        isActive
                                                            ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] ring-2 ring-offset-1 ring-offset-[var(--color-bg-surface)] ring-[var(--color-primary-ring)]'
                                                            : 'bg-[var(--color-bg-muted)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                                                    }`}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {logic.isSeedreamAspectRatioInvalid && (
                                    <p className="mt-2 text-xs text-[var(--color-warning-accent)]">
                                        Warning: Seedream aspect ratio (width/height) should be between 0.333 and 3.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

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
                </div>
                
                <div>
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

                    <GeneratedImageDisplay 
                        generationResults={logic.generationResults} 
                        isLoading={logic.isLoading} 
                        onImageClick={onImageClick}
                        onRetryOne={logic.handleRetryOne}
                        onRemoveImage={logic.handleRemoveGeneratedImage}
                        onDownloadSingle={logic.handleDownloadSingle}
                        progress={logic.progress}
                    />
                </div>
            </div>

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
            aspectRatio={'1:1' as AspectRatio}
            onAspectRatioChange={() => {}}
            showAspectRatio={false}
            showImageCount={false}
            imageCount={1}
            onImageCountChange={() => {}}
            generateButtonText="Generate"
            onGenerate={logic.handleGenerate}
            generateDisabled={logic.isGenerateDisabled}
            pendingCount={logic.isLoading ? logic.progress.total - logic.progress.completed : 0}
            startOverButtonText="Clear"
            onStartOver={logic.handleClearGallery}
            startOverDisabled={logic.isLoading || logic.generationResults.length === 0}
            studioMode="image"
        />
        </>
    );
};

export default React.memo(ImageStudio);
