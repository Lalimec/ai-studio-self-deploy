

import React from 'react';
import { useAdCloner } from '../../hooks/useAdCloner';
import { PrepareMagicIcon, SearchIcon, TrashIcon, UploadIcon, SettingsIcon } from '../Icons';
import { NANO_BANANA_RATIOS } from '../../constants';
import UploaderZone from '../UploaderZone';
import { ActiveCropper } from '../../App';
import SinglePromptEditor from '../SinglePromptEditor';

type AdClonerUploaderProps = {
    logic: ReturnType<typeof useAdCloner>;
    onUpload: (file: File, cropper: NonNullable<ActiveCropper>) => void;
};

const AspectRatioButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; title?: string; disabled: boolean; }> = 
({ label, isActive, onClick, title, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`py-1 px-2 rounded-md font-semibold transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive ? 'bg-[var(--color-secondary)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)]'
      }`}
    >
      {label}
    </button>
);


const AdClonerUploader: React.FC<AdClonerUploaderProps> = ({ logic, onUpload }) => {
    const {
        adImage,
        subjectImages,
        handleRemoveSubjectImage,
        researchContext,
        setResearchContext,
        includeResearch,
        setIncludeResearch,
        isResearching,
        handleResearchAd,
        userInstructions,
        setUserInstructions,
        isEnhancingInstructions,
        isTranslatingInstructions,
        handleEnhanceInstructions,
        handleTranslateInstructions,
        numVariations,
        setNumVariations,
        aspectRatio,
        setAspectRatio,
        isGeneratingPrompts,
        handleGeneratePrompts,
        handleGenerateMoreVariations,
        isBusy,
        generationResult,
        setSettingsModalOpen,
    } = logic;
    
    const isGenerateDisabled = !adImage.croppedSrc || isGeneratingPrompts || isResearching;

    const subjectSlots = Array.from({ length: 6 });

    return (
        <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)] flex flex-col gap-6">
            <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-[var(--color-text-main)]">Controls</h2>
                 <div className="flex items-center gap-2">
                     <button onClick={() => setSettingsModalOpen(true)} className="p-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] rounded-lg text-[var(--color-text-main)] transition-colors" title="Settings"><SettingsIcon className="w-5 h-5" /></button>
                 </div>
            </div>
            <div>
                <h3 className="text-md font-bold text-[var(--color-text-light)] mb-2">1. Ad Image</h3>
                {!adImage.croppedSrc ? (
                    <UploaderZone onFileUpload={(file) => onUpload(file, { type: 'adCloner-ad' })} className="aspect-video" disabled={isBusy}>
                        <div className="flex flex-col items-center text-[var(--color-text-dim)] pointer-events-none">
                            <UploadIcon className="h-8 w-8 mb-2" />
                            <p className="text-sm font-semibold text-center">Click or drag & drop ad</p>
                        </div>
                    </UploaderZone>
                ) : (
                    <div className="relative group w-full">
                        <img src={adImage.croppedSrc} alt="Cropped ad" className="rounded-xl shadow-lg w-full" />
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                            <button onClick={() => onUpload(adImage.file!, { type: 'adCloner-ad' })} disabled={isBusy} className="bg-[var(--color-bg-surface)]/80 text-[var(--color-text-main)] py-2 px-4 rounded-md text-sm font-semibold hover:bg-black/80 disabled:opacity-50">Recrop or Replace</button>
                        </div>
                    </div>
                )}
            </div>

            <div>
                 <h3 className="text-md font-bold text-[var(--color-text-light)] mb-2">2. Subject Images (Optional)</h3>
                 <div className="grid grid-cols-3 gap-2">
                    {subjectSlots.map((_, i) => {
                        const img = subjectImages[i];
                        if (img && img.croppedSrc) {
                            return (
                                <div key={img.id} className="relative group aspect-square">
                                    <img src={img.croppedSrc} alt="Subject" className="w-full h-full object-cover rounded-lg" />
                                    <button onClick={() => handleRemoveSubjectImage(img.id)} disabled={isBusy} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all disabled:opacity-50">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        }
                        return (
                            <UploaderZone key={i} onFileUpload={(file) => onUpload(file, { type: 'adCloner-subject', id: `new-${Date.now()}` })} className="aspect-square p-2" disabled={isBusy}>
                                <UploadIcon className="h-5 w-5 text-[var(--color-text-dim)]" />
                            </UploaderZone>
                        );
                    })}
                 </div>
            </div>

            <div className="flex flex-col gap-2">
                <button onClick={handleResearchAd} disabled={!adImage.croppedSrc || isResearching || isGeneratingPrompts} className="w-full flex items-center justify-center gap-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-light)] font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <SearchIcon className={`w-5 h-5 ${isResearching ? 'animate-pulse' : ''}`} />
                    {isResearching ? 'Researching...' : 'Research Ad'}
                </button>
                {researchContext && (
                    <div className="p-3 bg-[var(--color-bg-base)] rounded-lg border border-[var(--color-border-muted)] animate-fade-in space-y-2">
                        <div className="flex justify-between items-center">
                            <label htmlFor="include-research-toggle" className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-light)] cursor-pointer">
                                <input
                                id="include-research-toggle"
                                type="checkbox"
                                checked={includeResearch}
                                onChange={(e) => setIncludeResearch(e.target.checked)}
                                className="h-4 w-4 rounded border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-primary)] focus:ring-[var(--color-primary-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
                                />
                                <span>Include Research</span>
                            </label>
                            <button onClick={() => setResearchContext('')} className="p-1 text-[var(--color-text-dim)] hover:text-[var(--color-destructive)]" title="Clear research results"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xs text-[var(--color-text-dim)] max-h-24 overflow-y-auto custom-scrollbar">{researchContext}</p>
                    </div>
                )}
            </div>

            <SinglePromptEditor
                label="3. Instructions"
                content={userInstructions}
                onContentChange={setUserInstructions}
                placeholder='e.g., "Change the setting to a beach..."'
                rows={4}
                onEnhance={handleEnhanceInstructions}
                isEnhancing={isEnhancingInstructions}
                onTranslate={handleTranslateInstructions}
                isTranslating={isTranslatingInstructions}
            />

            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">4. Aspect Ratio</label>
                <div className="grid grid-cols-5 gap-2">
                    {NANO_BANANA_RATIOS.map(ratio => (<AspectRatioButton key={ratio} label={ratio} isActive={aspectRatio === ratio} onClick={() => setAspectRatio(ratio)} title={`Set aspect ratio to ${ratio}`} disabled={isBusy} /> ))}
                </div>
            </div>
            <div>
                <label htmlFor="num-variations" className="block text-sm font-medium text-[var(--color-text-light)] mb-2">5. Number of Variations</label>
                <div className="flex items-center gap-4">
                    <input id="num-variations" type="range" min="1" max="10" value={numVariations} onChange={e => setNumVariations(Number(e.target.value))} className="w-full h-2 bg-[var(--color-border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]" />
                    <span className="font-semibold text-[var(--color-primary-accent)] w-8 text-center">{numVariations}</span>
                </div>
            </div>

            <button onClick={handleGeneratePrompts} disabled={isGenerateDisabled} className="w-full flex items-center justify-center gap-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-muted)] disabled:cursor-not-allowed text-[var(--color-text-on-primary)] font-bold py-3 px-4 rounded-lg transition-colors text-lg shadow-md">
                <PrepareMagicIcon className={`w-6 h-6 ${isGeneratingPrompts ? 'animate-spin' : ''}`} />
                {generationResult ? (isGeneratingPrompts ? 'Generating...' : 'Generate New Set') : (isGeneratingPrompts ? 'Generating...' : 'Generate Prompts')}
            </button>

            {generationResult && (
                <div className="mt-2 border-t border-[var(--color-border-muted)] pt-4">
                    <button 
                        onClick={handleGenerateMoreVariations} 
                        disabled={isGeneratingPrompts} 
                        className="w-full flex items-center justify-center gap-3 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-light)] font-bold py-3 px-4 rounded-lg transition-colors text-base shadow-md disabled:opacity-50"
                    >
                        <PrepareMagicIcon className={`w-6 h-6 ${isGeneratingPrompts ? 'animate-spin' : ''}`} />
                        {isGeneratingPrompts ? `Generating...` : `Get ${numVariations} More Variations`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdClonerUploader;