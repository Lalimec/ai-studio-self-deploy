import React from 'react';
import { useAdCloner } from '../../hooks/useAdCloner';
import VariationCard from './VariationCard';
import { AdClonerIcon, DownloadIcon, HelpIcon, PrepareMagicIcon, TrashIcon } from '../Icons';
import CollapsibleSection from '../help/CollapsibleSection';
import { ActiveCropper } from '../../App';

type AdClonerResultsProps = {
    logic: ReturnType<typeof useAdCloner>;
    onUpload: (file: File, cropper: NonNullable<ActiveCropper>) => void;
    onShowHelp: () => void;
};

const SkeletonCard: React.FC<{ index: number }> = ({ index }) => (
    <div
        key={`skeleton-${index}`}
        className="p-4 rounded-xl flex flex-col gap-4 animate-pulse"
        style={{ animationDelay: `${index * 100}ms` }}
    >
        <div className="h-10 bg-[var(--color-bg-muted)] rounded-md"></div>
        <div className="w-full flex items-center justify-center gap-2 bg-[var(--color-bg-muted)] h-12 rounded-lg"></div>
    </div>
);

const AdClonerResults: React.FC<AdClonerResultsProps> = ({ logic, onUpload, onShowHelp }) => {
    const { 
        generationResult,
        isGeneratingPrompts,
        numVariations,
        sessionId,
        isBusy,
        isGeneratingAllImages,
        handleGenerateAllImages,
        handleDownloadAll,
        handleStartOver,
    } = logic;
    
    return (
        <div className="w-full flex flex-col gap-6">
             <header className="flex justify-between items-center mb-6 gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={onShowHelp} className="p-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] rounded-lg text-[var(--color-text-main)] transition-colors" title="Help">
                        <HelpIcon className="w-5 h-5" />
                    </button>
                </div>

                {sessionId && <div className="hidden lg:inline-block bg-[var(--color-bg-muted)] text-[var(--color-text-light)] text-sm font-mono py-1.5 px-3 rounded-lg animate-fade-in truncate">Set ID: {sessionId}</div>}
                
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button onClick={handleGenerateAllImages} disabled={isBusy || !generationResult} className="flex items-center gap-2 bg-[var(--color-action-generate)] hover:bg-[var(--color-action-generate-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm">
                        <PrepareMagicIcon className={`w-4 h-4 ${isGeneratingAllImages ? 'animate-spin' : ''}`} />
                        {isGeneratingAllImages ? 'Generating All...' : 'Generate All Images'}
                    </button>
                    <button onClick={handleDownloadAll} disabled={isBusy || !generationResult} className="flex items-center gap-2 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm">
                        <DownloadIcon className="w-4 h-4" />
                        Download All
                    </button>
                    <button onClick={handleStartOver} disabled={isBusy || !generationResult} className="flex items-center gap-2 bg-[var(--color-destructive)] hover:bg-[var(--color-destructive-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm">
                        <TrashIcon className="w-4 h-4" />
                        Clear Session
                    </button>
                </div>
            </header>
            
            {(!generationResult && !isGeneratingPrompts) ? (
                <div className="col-span-full flex flex-col items-center justify-center text-center p-10 rounded-lg min-h-[500px]">
                    <div className="text-center">
                        <AdClonerIcon className="mx-auto h-24 w-24 text-[var(--color-border-default)] opacity-75"/>
                        <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-light)]">Ad Variation Gallery</h3>
                        <p className="mt-1 text-sm text-[var(--color-text-dimmer)]">Use the panel on the left to upload an ad and generate variations.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 w-full gap-6">
                    {isGeneratingPrompts && (
                        <>
                            {Array.from({ length: numVariations }, (_, i) => (
                                <SkeletonCard key={`skeleton-${i}`} index={i} />
                            ))}
                        </>
                    )}

                    {generationResult && (
                        <>
                            <div>
                                <CollapsibleSection title="Base Prompt (Deconstruction of Original Ad)" defaultOpen={false}>
                                    <pre className="text-xs text-left bg-[var(--color-bg-base)] p-4 rounded-lg overflow-x-auto custom-scrollbar">
                                        {JSON.stringify(generationResult.base_prompt.details[0], null, 2)}
                                    </pre>
                                </CollapsibleSection>
                            </div>

                            {generationResult.variations.map((variation, index) => (
                                <VariationCard
                                    key={`${sessionId}-${index}`}
                                    variation={variation}
                                    index={index}
                                    logic={logic}
                                    onUpload={onUpload}
                                />
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdClonerResults;