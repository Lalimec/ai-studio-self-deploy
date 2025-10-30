

import React from 'react';
import { PiSpinner, PiMagicWandFill, PiTranslate, PiRecycle } from 'react-icons/pi';

interface PromptEditorProps {
    numberOfVersions: number;
    onNumberOfVersionsChange: (value: number) => void;
    promptContents: string[];
    onPromptContentChange: (index: number, value: string) => void;
    onEnhanceAndTranslate: (index: number) => void;
    translatingIndices: Set<number>;
    onGenerateVariation: (index: number) => void;
    generatingVariationIndices: Set<number>;
    onEnhance: (index: number) => void;
    enhancingIndices: Set<number>;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
    numberOfVersions, onNumberOfVersionsChange, promptContents, onPromptContentChange, 
    onEnhanceAndTranslate, translatingIndices,
    onGenerateVariation, generatingVariationIndices,
    onEnhance, enhancingIndices
}) => {
    return (
        <div className="w-full flex flex-col gap-4">
            <div>
                <label htmlFor="prompt-select" className="block text-sm font-medium text-slate-700 mb-2">3. Write Your Prompts</label>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600 mt-2">
                    <label htmlFor="versions-slider">Versions per image:</label>
                    <input
                        id="versions-slider"
                        type="range"
                        min="1"
                        max="5"
                        value={numberOfVersions}
                        onChange={(e) => onNumberOfVersionsChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="font-bold text-violet-600 text-base">{numberOfVersions}</span>
                </div>
            </div>
            <div className="flex flex-col gap-4">
            {promptContents.slice(0, numberOfVersions).map((content, index) => {
                const isTranslating = translatingIndices.has(index);
                const isGeneratingVariation = generatingVariationIndices.has(index);
                const isEnhancing = enhancingIndices.has(index);
                const isProcessing = isTranslating || isGeneratingVariation || isEnhancing;

                return (
                    <div key={index}>
                        <label htmlFor={`prompt-editor-${index}`} className="block text-xs font-medium text-slate-500 mb-1">
                            Prompt {index + 1}
                        </label>
                        <div className="relative">
                            {isProcessing && (
                                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-md flex items-center justify-center z-10">
                                    <PiSpinner className="w-6 h-6 animate-spin text-violet-600" />
                                </div>
                            )}
                            <textarea
                                id={`prompt-editor-${index}`}
                                value={content}
                                onChange={(e) => onPromptContentChange(index, e.target.value)}
                                rows={5}
                                disabled={isProcessing}
                                className="block w-full rounded-md border-0 bg-white py-2 pl-3 pr-12 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-violet-600 sm:text-sm sm:leading-6 transition-all custom-scrollbar disabled:bg-slate-50"
                                placeholder={`Describe version ${index + 1}...`}
                            />
                            <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-20">
                                <button
                                    onClick={() => onEnhance(index)}
                                    disabled={isProcessing || !content?.trim()}
                                    className="p-1.5 text-slate-400 hover:text-violet-600 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors rounded-md"
                                    title="Enhance Prompt"
                                    aria-label={`Enhance prompt ${index + 1}`}
                                >
                                    {isEnhancing ? (
                                        <PiSpinner className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <PiMagicWandFill className="w-5 h-5" />
                                    )}
                                </button>
                                <button
                                    onClick={() => onGenerateVariation(index)}
                                    disabled={isProcessing || !content?.trim()}
                                    className="p-1.5 text-slate-400 hover:text-violet-600 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors rounded-md"
                                    title="Generate Variation"
                                    aria-label={`Generate a variation for prompt ${index + 1}`}
                                >
                                    {isGeneratingVariation ? (
                                        <PiSpinner className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <PiRecycle className="w-5 h-5" />
                                    )}
                                </button>
                                <button
                                    onClick={() => onEnhanceAndTranslate(index)}
                                    disabled={isProcessing || !content?.trim()}
                                    className="p-1.5 text-slate-400 hover:text-violet-600 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors rounded-md"
                                    title="Enhance & Translate to English"
                                    aria-label={`Enhance and translate prompt ${index + 1} to English`}
                                >
                                    {isTranslating ? (
                                        <PiSpinner className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <PiTranslate className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
            </div>
        </div>
    );
};