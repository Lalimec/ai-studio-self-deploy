import React from 'react';
import { useNanoBananaProStudio } from '../../hooks/useNanoBananaProStudio';
import { ProStudioImageSlots } from './ProStudioImageSlots';
import { PromptEditor } from '../imageStudio/PromptEditor';
import { AdvancedOptions } from '../imageStudio/AdvancedOptions';
import { GeneratedImageDisplay } from '../imageStudio/GeneratedImageDisplay';
import GenerationToolbar from '../GenerationToolbar';
import { PiDownloadSimpleIcon, PiTrashIcon, HelpIcon, PiSpinnerIcon, BananaIcon } from '../Icons';
import { MultiCropView } from '../imageStudio/MultiCropView';
import { CropChoiceModal } from '../imageStudio/CropChoiceModal';
import { ImageStudioConfirmationDialog } from '../imageStudio/ImageStudioConfirmationDialog';

interface NanoBananaProStudioProps {
    logic: ReturnType<typeof useNanoBananaProStudio>;
    onShowHelp: () => void;
    onImageClick: (url: string) => void;
}

export const NanoBananaProStudio: React.FC<NanoBananaProStudioProps> = ({
    logic,
    onShowHelp,
    onImageClick
}) => {

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
                    {/* Left Column: Configuration */}
                    <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)] flex flex-col items-center gap-6">
                        {/* 1. Image Upload Slots */}
                        <ProStudioImageSlots
                            imageFiles={logic.imageFiles}
                            imagePreviewUrls={logic.imagePreviewUrls}
                            onFilesSelected={logic.handleFilesSelected}
                            onRemoveImage={logic.handleRemoveImage}
                            maxImages={6}
                        />

                        {/* Prompt Editor */}
                        <PromptEditor
                            numberOfVersions={logic.numberOfVersions}
                            onNumberOfVersionsChange={logic.handleNumberOfVersionsChange}
                            promptContents={logic.promptContents}
                            onPromptContentChange={logic.handlePromptContentChange}
                            onTranslate={logic.handleTranslatePrompt}
                            translatingIndices={logic.translatingIndices}
                            onGenerateVariation={logic.handleGenerateVariation}
                            generatingVariationIndices={logic.generatingVariationIndices}
                            onEnhance={logic.handleEnhancePrompt}
                            enhancingIndices={logic.enhancingIndices}
                        />
                    </div>

                    {/* Right Column: Results */}
                    <div>
                        {/* Header Toolbar */}
                        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={onShowHelp}
                                    className="p-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-main)] rounded-lg transition-colors"
                                    aria-label="Help"
                                >
                                    <HelpIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                {logic.generationResults.filter(r => r.status === 'error' || r.status === 'warning').length > 0 && (
                                    <button
                                        onClick={logic.handleRetryAll}
                                        disabled={logic.isLoading}
                                        className="flex items-center gap-2 bg-[var(--color-warning)] hover:bg-[var(--color-warning-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
                                    >
                                        <PiSpinnerIcon className="w-5 h-5" />
                                        Retry Failed ({logic.generationResults.filter(r => r.status === 'error' || r.status === 'warning').length})
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

                        {/* Results Gallery */}
                        <GeneratedImageDisplay
                            generationResults={logic.generationResults as any}
                            isLoading={logic.isLoading}
                            onImageClick={onImageClick}
                            onRetryOne={logic.handleRetryOne}
                            onRemoveImage={logic.handleRemoveResult}
                            onDownloadSingle={logic.handleDownloadResult}
                            progress={logic.progress}
                            emptyIcon={BananaIcon}
                        />
                    </div>
                </div>

                {/* Bottom: Advanced Options */}
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

                {/* Fixed Bottom Toolbar */}
                <GenerationToolbar
                    aspectRatio={logic.aspectRatio as any}
                    onAspectRatioChange={logic.setAspectRatio}
                    imageCount={1}
                    onImageCountChange={() => {}}
                    onGenerate={logic.handleGenerate}
                    generateButtonText="Generate"
                    generateDisabled={logic.isLoading}
                    pendingCount={logic.isLoading ? 1 : 0}
                    showAspectRatio={true}
                    showImageCount={false}
                    modeButtons={[
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
                    ]}
                    startOverButtonText="Clear"
                    onStartOver={logic.handleClearGallery}
                    startOverDisabled={logic.isLoading || logic.generationResults.length === 0}
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
        </>
    );
};

export default NanoBananaProStudio;
