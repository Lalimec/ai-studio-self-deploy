// This component will be created in a future step.
// For now, it is a placeholder.
import React, { useState } from 'react';
import { AdIdea, ImageModel, AspectRatio, VideoAnalyzerSettings } from '../../types';
import { PrepareMagicIcon } from '../Icons';

interface AdIdeaCardProps {
    idea: AdIdea;
    index: number;
    settings: VideoAnalyzerSettings;
    subjectImages: File[];
    onGenerateImage: (ideaId: string, prompt: string) => Promise<void>;
    onImageClick: (id: string) => void;
}

const AdIdeaCard: React.FC<AdIdeaCardProps> = ({ idea, index, settings, subjectImages, onGenerateImage, onImageClick }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!idea.id) return;
        setIsGenerating(true);
        setError(null);
        try {
            await onGenerateImage(idea.id, idea.generation_prompt);
        } catch (e: any) {
            setError(e.message || "An unknown error occurred.");
        } finally {
            setIsGenerating(false);
        }
    };

    const hasImage = idea.generatedImages && idea.generatedImages.length > 0;
    const modelRequiresImage = settings.imageModel === 'gemini-2.5-flash-image';

    return (
        <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl shadow-lg border border-[var(--color-border-muted)] grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                {isGenerating ? (
                    <div className="w-full aspect-[3/4] bg-[var(--color-bg-muted)] rounded-lg flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                        <p className="text-sm text-[var(--color-text-dim)] mt-2">Generating...</p>
                    </div>
                ) : hasImage ? (
                     <div className="w-full aspect-[3/4] bg-[var(--color-bg-muted)] rounded-lg overflow-hidden cursor-pointer" onClick={() => onImageClick(idea.generatedImages![0])}>
                        <img src={idea.generatedImages![0]} alt={`Generated ad concept ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-full aspect-[3/4] bg-[var(--color-bg-muted)] rounded-lg flex flex-col items-center justify-center text-center p-4">
                        <p className="text-sm text-[var(--color-text-dim)]">No image generated yet.</p>
                        {modelRequiresImage && subjectImages.length === 0 && (
                            <p className="text-xs text-amber-400 mt-2">Upload a Subject Image in the 'Generate Concepts' tab to use this model.</p>
                        )}
                    </div>
                )}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-[var(--color-action-generate)] hover:bg-[var(--color-action-generate-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                    <PrepareMagicIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    {hasImage ? 'Regenerate Image' : 'Generate Image'}
                </button>
                 {error && <p className="text-xs text-red-400 mt-2 text-center">{error}</p>}
            </div>
            <div className="md:col-span-2 space-y-3 text-sm">
                <h3 className="font-bold text-lg text-[var(--color-text-light)]">Concept {index + 1}: {idea.title}</h3>
                <p><strong className="text-[var(--color-text-main)]">Description:</strong> {idea.description}</p>
                <p><strong className="text-[var(--color-text-main)]">Layout:</strong> {idea.layout}</p>
                <p><strong className="text-[var(--color-text-main)]">CTA:</strong> {idea.cta}</p>
                 <div>
                    <strong className="text-[var(--color-text-main)]">Text Elements:</strong>
                    <ul className="list-disc list-inside ml-2 text-xs">
                        <li><strong>Headline:</strong> {idea.text.headline}</li>
                        <li><strong>Body:</strong> {idea.text.body}</li>
                        {idea.text.disclaimer && <li><strong>Disclaimer:</strong> {idea.text.disclaimer}</li>}
                    </ul>
                </div>
                 <div className="bg-[var(--color-bg-base)] p-3 rounded-md">
                     <p className="text-xs font-semibold uppercase text-[var(--color-text-dimmer)]">Generation Prompt</p>
                     <p className="font-mono text-xs mt-1 max-h-48 overflow-y-auto custom-scrollbar">{idea.generation_prompt}</p>
                 </div>
            </div>
        </div>
    );
};

export default AdIdeaCard;
