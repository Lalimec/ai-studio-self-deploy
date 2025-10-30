import React from 'react';
import { PiSpinnerIcon, PiMagicWandFillIcon, PiTranslateIcon, PiRecycleIcon } from './Icons';

interface SinglePromptEditorProps {
    content: string;
    onContentChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    label?: string;
    
    onEnhance?: () => void;
    isEnhancing?: boolean;

    onGenerateVariation?: () => void;
    isGeneratingVariation?: boolean;
    
    onTranslate?: () => void;
    isTranslating?: boolean;
}

export const SinglePromptEditor: React.FC<SinglePromptEditorProps> = ({
    content,
    onContentChange,
    placeholder = "Describe your vision...",
    rows = 5,
    label,
    onEnhance,
    isEnhancing = false,
    onGenerateVariation,
    isGeneratingVariation = false,
    onTranslate,
    isTranslating = false,
}) => {
    const isProcessing = isEnhancing || isGeneratingVariation || isTranslating;

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium text-[var(--color-text-dimmer)] mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {isProcessing && (
                    <div className="absolute inset-0 bg-[var(--color-bg-surface)]/70 backdrop-blur-sm rounded-md flex items-center justify-center z-10">
                        <PiSpinnerIcon className="w-6 h-6 animate-spin text-[var(--color-primary-accent)]" />
                    </div>
                )}
                <textarea
                    value={content}
                    onChange={(e) => onContentChange(e.target.value)}
                    rows={rows}
                    disabled={isProcessing}
                    className="block w-full rounded-md border-0 bg-[var(--color-bg-base)] py-2 pl-3 pr-12 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-default)] placeholder:text-[var(--color-text-dimmer)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] sm:text-sm sm:leading-6 transition-all prompt-textarea disabled:bg-[var(--color-bg-surface)]"
                    placeholder={placeholder}
                />
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-20">
                    {onEnhance && (
                        <button
                            onClick={onEnhance}
                            disabled={isProcessing || !content?.trim()}
                            className="p-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:text-[var(--color-border-default)] disabled:cursor-not-allowed transition-colors rounded-md"
                            title="Enhance Prompt"
                            aria-label="Enhance prompt"
                        >
                            {isEnhancing ? (
                                <PiSpinnerIcon className="w-5 h-5 animate-spin" />
                            ) : (
                                <PiMagicWandFillIcon className="w-5 h-5" />
                            )}
                        </button>
                    )}
                    {onGenerateVariation && (
                         <button
                            onClick={onGenerateVariation}
                            disabled={isProcessing || !content?.trim()}
                            className="p-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:text-[var(--color-border-default)] disabled:cursor-not-allowed transition-colors rounded-md"
                            title="Generate Variation"
                            aria-label="Generate a variation for prompt"
                        >
                            {isGeneratingVariation ? (
                                <PiSpinnerIcon className="w-5 h-5 animate-spin" />
                            ) : (
                                <PiRecycleIcon className="w-5 h-5" />
                            )}
                        </button>
                    )}
                   {onTranslate && (
                        <button
                            onClick={onTranslate}
                            disabled={isProcessing || !content?.trim()}
                            className="p-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:text-[var(--color-border-default)] disabled:cursor-not-allowed transition-colors rounded-md"
                            title="Translate to English"
                            aria-label="Translate prompt to English"
                        >
                            {isTranslating ? (
                                <PiSpinnerIcon className="w-5 h-5 animate-spin" />
                            ) : (
                                <PiTranslateIcon className="w-5 h-5" />
                            )}
                        </button>
                   )}
                </div>
            </div>
        </div>
    );
};

export default SinglePromptEditor;