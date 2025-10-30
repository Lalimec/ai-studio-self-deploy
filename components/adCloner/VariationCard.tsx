import React from 'react';
import { AdClonerVariation } from '../../types';
import { useAdCloner } from '../../hooks/useAdCloner';
import { PrepareMagicIcon, UploadIcon, TrashIcon, DownloadIcon, RegenerateIcon } from '../Icons';
import CollapsibleSection from '../help/CollapsibleSection';
import UploaderZone from '../UploaderZone';
import { ActiveCropper } from '../../App';
import SinglePromptEditor from '../SinglePromptEditor';

type VariationCardProps = {
    variation: AdClonerVariation;
    index: number;
    logic: ReturnType<typeof useAdCloner>;
    onUpload: (file: File, cropper: NonNullable<ActiveCropper>) => void;
};

const VariationCard: React.FC<VariationCardProps> = ({ variation, index, logic, onUpload }) => {
    const { 
        variationStates, handleGenerateAdImage, handleRefineImage, 
        setActiveImage, handleDownloadSingleVariation, handleRemoveVariation,
        setVariationState, handleRemoveImageFromHistory,
        handleEnhanceRefinePrompt, handleGenerateRefineVariation, handleTranslateRefinePrompt,
    } = logic;
    
    const state = variationStates[index] || {
        isLoading: false,
        imageHistory: [],
        activeImageIndex: -1,
        refineText: '',
        refineImage: { file: null, src: null },
        isEnhancingRefine: false,
        isGeneratingRefineVariation: false,
        isTranslatingRefine: false,
    };

    const activeImageSrc = state.activeImageIndex > -1 ? state.imageHistory[state.activeImageIndex] : null;
    const isBusy = state.isLoading || state.isEnhancingRefine || state.isGeneratingRefineVariation || state.isTranslatingRefine;

    const handleActionClick = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div className="p-4 rounded-xl flex flex-col gap-4 relative">
            
            <div className="border-b border-[var(--color-border-muted)] pb-3">
                 <CollapsibleSection title={`Variation ${index + 1}: ${variation.title.split('||')[0].trim()}`} defaultOpen={false}>
                    <div className="flex justify-end gap-2 mb-4">
                        <button onClick={(e) => { handleActionClick(e); handleDownloadSingleVariation(index); }} disabled={isBusy || state.imageHistory.length === 0} className="flex items-center gap-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 disabled:opacity-50 text-xs" title="Download this variation's image history (ZIP)"><DownloadIcon className="w-4 h-4" /><span>Download ZIP</span></button>
                        <button onClick={(e) => { handleActionClick(e); handleGenerateAdImage(index); }} disabled={isBusy} className="flex items-center gap-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 disabled:opacity-50 text-xs" title="Regenerate this image"><RegenerateIcon className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} /><span>Regenerate</span></button>
                        <button onClick={(e) => { handleActionClick(e); handleRemoveVariation(index); }} disabled={isBusy} className="flex items-center gap-2 p-2 bg-black/60 text-white rounded-full hover:bg-red-600 disabled:opacity-50 text-xs" title="Remove this variation"><TrashIcon className="w-4 h-4" /><span>Delete Variation</span></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-[var(--color-text-dimmer)] uppercase tracking-wider mb-1">
                                Instructional Prompt for Image Editing
                            </p>
                            <p className="text-sm text-[var(--color-text-light)] bg-[var(--color-bg-base)] p-3 rounded-md mt-1 whitespace-pre-wrap font-mono">
                                {variation.prompt}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-[var(--color-text-dimmer)] uppercase tracking-wider mb-2">
                                Deconstructed Ad Details
                            </p>
                            <div className="space-y-3 bg-[var(--color-bg-base)] p-3 rounded-md">
                                {Object.entries(variation.details[0]).map(([key, value]) => (
                                    <div key={key}>
                                        <p className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">
                                            {key.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-sm text-[var(--color-text-light)] whitespace-pre-wrap font-mono">
                                            {String(value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>
            </div>
            

            {activeImageSrc ? (
                <div className="space-y-4">
                    <div className="relative group">
                        <img src={activeImageSrc} alt={`Generated Ad Variation ${index + 1}`} className="w-full rounded-lg" />
                    </div>
                    
                    {state.imageHistory.length > 1 && (
                        <div>
                            <p className="text-xs font-semibold text-[var(--color-text-dim)] mb-2">History:</p>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {state.imageHistory.map((imgSrc, i) => (
                                    <div key={i} className="relative group/history-item">
                                        <button onClick={() => setActiveImage(index, i)} className={`w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border-2 transition-colors ${i === state.activeImageIndex ? 'border-[var(--color-primary-accent)]' : 'border-transparent hover:border-[var(--color-border-default)]'}`}>
                                            <img src={imgSrc} alt={`History ${i + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                        <button onClick={() => handleRemoveImageFromHistory(index, i)} className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 text-white rounded-full opacity-0 group-hover/history-item:opacity-100 hover:bg-red-600 transition-all">
                                            <TrashIcon className="w-3 h-3"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-[var(--color-bg-base)] p-3 rounded-lg border border-[var(--color-border-muted)] space-y-3">
                         <p className="text-sm font-semibold text-[var(--color-text-light)]">Refine Active Image</p>
                        <SinglePromptEditor
                            content={state.refineText}
                            onContentChange={(value) => logic.setVariationState(index, { refineText: value })}
                            placeholder="e.g., Change the background to red"
                            rows={3}
                            onEnhance={() => handleEnhanceRefinePrompt(index)}
                            isEnhancing={state.isEnhancingRefine}
                            onGenerateVariation={() => handleGenerateRefineVariation(index)}
                            isGeneratingVariation={state.isGeneratingRefineVariation}
                            onTranslate={() => handleTranslateRefinePrompt(index)}
                            isTranslating={state.isTranslatingRefine}
                        />
                        <div className="flex items-center gap-4">
                            <div className="flex-grow flex items-center gap-2">
                                <UploaderZone onFileUpload={(file) => onUpload(file, { type: 'adCloner-refine', id: String(index) })} className="w-12 h-12 flex-shrink-0 p-1" disabled={isBusy}>
                                    {state.refineImage.src ? (
                                        <img src={state.refineImage.src} alt="Refine" className="w-full h-full object-cover rounded" />
                                    ) : (
                                        <UploadIcon className="w-5 h-5 text-[var(--color-text-dim)]" />
                                    )}
                                </UploaderZone>
                                <p className="text-xs text-[var(--color-text-dimmer)]">Add an image to incorporate (e.g. a logo).</p>
                                {state.refineImage.src && (
                                    <button onClick={() => logic.setVariationState(index, { refineImage: { file: null, src: null }})} className="p-1 text-[var(--color-text-dim)] hover:text-[var(--color-destructive)]"><TrashIcon className="w-4 h-4" /></button>
                                )}
                            </div>
                            <button onClick={() => handleRefineImage(index)} disabled={isBusy || !state.refineText.trim()} className="flex items-center gap-2 bg-[var(--color-action-prepare)] hover:bg-[var(--color-action-prepare-hover)] text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-50">
                                <PrepareMagicIcon className={`w-4 h-4 ${state.isLoading ? 'animate-spin' : ''}`} />
                                Apply Edit
                            </button>
                        </div>
                    </div>

                </div>
            ) : (
                 <button onClick={() => handleGenerateAdImage(index)} disabled={isBusy} className="w-full flex items-center justify-center gap-2 bg-[var(--color-action-generate)] hover:bg-[var(--color-action-generate-hover)] text-white font-bold py-3 px-4 rounded-lg transition-colors text-base disabled:opacity-50">
                    <PrepareMagicIcon className="w-5 h-5" />
                    Generate Ad Image
                </button>
            )}

             {isBusy && (
                <div className="absolute inset-0 bg-black/70 rounded-xl flex flex-col items-center justify-center z-20">
                    <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                    <span className="mt-2 text-xs font-semibold">Processing...</span>
                </div>
            )}
        </div>
    );
};

export default VariationCard;