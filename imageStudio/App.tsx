import React from 'react';

// Import hooks
import { useAppLogic } from './hooks/useAppLogic';

// Import components
import { ImageUploader } from './components/ImageUploader';
import { PromptEditor } from './components/PromptEditor';
import { GenerateButton } from './components/GenerateButton';
import { GeneratedImageDisplay } from './components/GeneratedImageDisplay';
import { Lightbox } from './components/Lightbox';
// FIX: Changed to a default import as `ConfirmationDialog` is exported as default.
import ConfirmationDialog from './components/ConfirmationDialog';
import { CropChoiceModal } from './components/CropChoiceModal';
import { MultiCropView } from './components/MultiCropView';
import { AdvancedOptions } from './components/AdvancedOptions';
import { NANO_BANANA_RATIOS, ASPECT_RATIO_PRESETS, FLUX_KONTEXT_PRO_RATIOS } from './constants';


const App: React.FC = () => {
    const logic = useAppLogic();

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
            <div className="min-h-screen flex flex-col items-center p-4 sm:p-6">
                <main className="w-full max-w-7xl mx-auto flex flex-col gap-6">
                     <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center gap-6">
                            <ImageUploader 
                                onImageSelect={logic.handleNewImageUpload} 
                                imagePreviewUrls={logic.imagePreviewUrls} 
                                onRemoveImage={logic.handleRemoveUploadedImage}
                                setId={logic.setId}
                            />

                            <div className="w-full flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">2. Configure Model & Size</label>
                                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-200 p-1">
                                        <button
                                            onClick={() => logic.setModel('nano-banana')}
                                            className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${logic.model === 'nano-banana' ? 'bg-white text-violet-700 shadow' : 'bg-transparent text-slate-600 hover:bg-white/50'}`}
                                        >
                                            Nano Banana
                                        </button>
                                        <button
                                            onClick={() => logic.setModel('seedream')}
                                            className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${logic.model === 'seedream' ? 'bg-white text-violet-700 shadow' : 'bg-transparent text-slate-600 hover:bg-white/50'}`}
                                        >
                                            Seedream Edit
                                        </button>
                                        <button
                                            onClick={() => logic.setModel('flux-kontext-pro')}
                                            className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${logic.model === 'flux-kontext-pro' ? 'bg-white text-violet-700 shadow' : 'bg-transparent text-slate-600 hover:bg-white/50'}`}
                                        >
                                            Flux Kontext
                                        </button>
                                    </div>
                                </div>
                                
                                {logic.model === 'nano-banana' && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-2">Aspect Ratio (Optional)</label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {NANO_BANANA_RATIOS.map(ratio => (
                                                <button
                                                    key={ratio}
                                                    onClick={() => logic.setAspectRatio(logic.aspectRatio === ratio ? null : ratio)}
                                                    className={`py-2 text-xs font-semibold rounded-md transition-colors ${logic.aspectRatio === ratio ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-violet-200'}`}
                                                >
                                                    {ratio}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {logic.model === 'flux-kontext-pro' && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-2">Aspect Ratio (Optional)</label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {FLUX_KONTEXT_PRO_RATIOS.map(ratio => (
                                                <button
                                                    key={ratio}
                                                    onClick={() => logic.setAspectRatio(logic.aspectRatio === ratio ? null : ratio)}
                                                    className={`py-2 text-xs font-semibold rounded-md transition-colors ${logic.aspectRatio === ratio ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-violet-200'}`}
                                                >
                                                    {ratio}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {logic.model === 'seedream' && (
                                    <div>
                                        <label htmlFor="image-size-preset" className="block text-sm font-medium text-slate-700 mb-1">
                                            Image Size
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <select
                                                id="image-size-preset"
                                                value={logic.imageSizePreset}
                                                onChange={(e) => logic.setImageSizePreset(e.target.value)}
                                                className="block w-full rounded-md border-0 bg-white py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-violet-600 sm:text-sm"
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
                                                className="block w-24 rounded-md border-0 bg-white py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-violet-600 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                aria-label="Width"
                                                min="1024"
                                                max="4096"
                                            />
                                            <span className="text-slate-500">×</span>
                                            <input
                                                type="number"
                                                value={logic.imageSizePreset.startsWith('auto') ? '' : logic.customHeight}
                                                placeholder={logic.imageSizePreset.startsWith('auto') ? '?' : undefined}
                                                onChange={(e) => logic.setCustomHeight(Math.max(1024, Math.min(4096, parseInt(e.target.value, 10) || 1024)))}
                                                disabled={logic.imageSizePreset !== 'custom'}
                                                className="block w-24 rounded-md border-0 bg-white py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-violet-600 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                aria-label="Height"
                                                min="1024"
                                                max="4096"
                                            />
                                        </div>
                                        {logic.imageSizePreset === 'custom' && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {ASPECT_RATIO_PRESETS.map(preset => {
                                                    const isActive = preset.width === logic.customWidth && preset.height === logic.customHeight;
                                                    return (
                                                        <button
                                                            key={preset.label}
                                                            type="button"
                                                            onClick={() => {
                                                                logic.setCustomWidth(preset.width);
                                                                logic.setCustomHeight(preset.height);
                                                            }}
                                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                                                isActive
                                                                    ? 'bg-violet-600 text-white ring-2 ring-offset-1 ring-violet-500'
                                                                    : 'bg-slate-200 text-slate-700 hover:bg-violet-200 hover:text-violet-800'
                                                            }`}
                                                        >
                                                            {preset.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
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
                                    onEnhanceAndTranslate={logic.handleEnhanceAndTranslatePrompt}
                                    translatingIndices={logic.translatingIndices}
                                    onGenerateVariation={logic.handleGenerateVariation}
                                    generatingVariationIndices={logic.generatingVariationIndices}
                                    onEnhance={logic.handleEnhancePrompt}
                                    enhancingIndices={logic.enhancingIndices}
                                />
                                {logic.jsonPrompts.trim() !== '' && !logic.jsonError && (
                                    <div className="absolute inset-0 bg-slate-200/50 backdrop-blur-[2px] rounded-lg flex items-center justify-center text-center p-4">
                                        <p className="text-slate-600 font-semibold bg-white/70 px-4 py-2 rounded-md shadow">
                                            Using Bulk Prompts from Advanced Options
                                        </p>
                                    </div>
                                )}
                            </div>
                            <GenerateButton onClick={logic.handleGenerate} disabled={logic.isGenerateDisabled} />
                        </div>
                        
                        <div className="lg:col-span-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 flex p-6">
                            <GeneratedImageDisplay 
                                generationResults={logic.generationResults} 
                                isLoading={logic.isLoading} 
                                error={logic.error} 
                                onImageClick={logic.handleImageClick}
                                onDownloadAll={logic.handleDownloadAll}
                                onRetryAll={logic.handleRetryAll}
                                onRetryOne={logic.handleRetryOne}
                                onClearGallery={logic.handleClearGallery}
                                onRemoveImage={logic.handleRemoveGeneratedImage}
                                includeOriginals={logic.includeOriginals}
                                onIncludeOriginalsChange={logic.setIncludeOriginals}
                                imageFiles={logic.imageFiles}
                                filenameTemplate={logic.filenameTemplate}
                                progress={logic.progress}
                                setId={logic.setId}
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
                </main>
            </div>
            <Lightbox 
                images={logic.successfulImageUrls}
                currentIndex={logic.selectedImageIndex}
                onClose={() => logic.setSelectedImageIndex(null)}
                onNext={logic.handleNextImage}
                onPrev={logic.handlePrevImage}
            />
            <ConfirmationDialog 
                isOpen={logic.showUploadConfirm}
                onCancel={logic.handleCancelUpload}
                onConfirm={logic.handleConfirmClearAndUpload}
                onDownloadAndConfirm={logic.handleDownloadAndConfirm}
            />
            <CropChoiceModal 
                isOpen={logic.showCropChoiceModal}
                onCrop={logic.handleStartCropping}
                onUseOriginals={logic.handleUseOriginals}
                onCancel={logic.handleCancelCropChoice}
            />
        </>
    );
};

export default App;