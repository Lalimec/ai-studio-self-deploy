/// <reference lib="dom" />
import React from 'react';
import SinglePromptEditor from '../SinglePromptEditor';

interface PromptEditorProps {
    numberOfVersions: number;
    onNumberOfVersionsChange: (value: number) => void;
    promptContents: string[];
    onPromptContentChange: (index: number, value: string) => void;
    onTranslate: (index: number) => void;
    translatingIndices: Set<number>;
    onGenerateVariation: (index: number) => void;
    generatingVariationIndices: Set<number>;
    onEnhance: (index: number) => void;
    enhancingIndices: Set<number>;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
    numberOfVersions, onNumberOfVersionsChange, promptContents, onPromptContentChange,
    onTranslate, translatingIndices,
    onGenerateVariation, generatingVariationIndices,
    onEnhance, enhancingIndices
}) => {
    return (
        <div className="w-full flex flex-col gap-4">
            <div>
                <div className="flex items-center gap-3 text-sm font-medium text-[var(--color-text-dim)]">
                    <label htmlFor="versions-slider">Versions per image:</label>
                    <input
                        id="versions-slider"
                        type="range"
                        min="1"
                        max="10"
                        value={numberOfVersions}
                        onChange={(e) => onNumberOfVersionsChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-[var(--color-border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                    />
                    <span className="font-bold text-[var(--color-primary-accent)] text-base">{numberOfVersions}</span>
                </div>
            </div>
            <div className="flex flex-col gap-4">
            {promptContents.slice(0, numberOfVersions).map((content, index) => (
                <SinglePromptEditor
                    key={index}
                    label={`Prompt ${index + 1}`}
                    content={content}
                    onContentChange={(value) => onPromptContentChange(index, value)}
                    placeholder={`Describe version ${index + 1}...`}
                    rows={5}
                    onEnhance={() => onEnhance(index)}
                    isEnhancing={enhancingIndices.has(index)}
                    onGenerateVariation={() => onGenerateVariation(index)}
                    isGeneratingVariation={generatingVariationIndices.has(index)}
                    onTranslate={() => onTranslate(index)}
                    isTranslating={translatingIndices.has(index)}
                />
            ))}
            </div>
        </div>
    );
};