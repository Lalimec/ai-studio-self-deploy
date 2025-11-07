// This component will be created in a future step.
// For now, it is a placeholder.
import React from 'react';
import { PrepareMagicIcon, TrashIcon } from '../Icons';
import UploaderZone from '../UploaderZone';
import { VideoAnalyzerSettings, ImageModel, AspectRatio } from '../../types';
import { imageModels, ASPECT_RATIO_OPTIONS } from '../../constants';
import SinglePromptEditor from '../SinglePromptEditor';

interface SceneGenerationControlsProps {
    onGenerateScene: (index: 'all') => void;
    generatingScene: 'all' | number | null;
    onFileChange: (files: File[]) => void;
    files: File[];
    instructions: string;
    onInstructionsChange: (value: string) => void;
    disabled: boolean;
    settings: VideoAnalyzerSettings;
    onSettingsChange: (newSettings: React.SetStateAction<VideoAnalyzerSettings>) => void;
    onApplyGlobalInstructions: () => void;
}

const AspectRatioButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; disabled: boolean; }> =
({ label, isActive, onClick, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-1 px-2 rounded-md font-semibold transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive ? 'bg-[var(--color-secondary)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-light)]'
      }`}
    >
      {label}
    </button>
);


const SceneGenerationControls: React.FC<SceneGenerationControlsProps> = ({
    onGenerateScene,
    generatingScene,
    onFileChange,
    files,
    instructions,
    onInstructionsChange,
    disabled,
    settings,
    onSettingsChange,
    onApplyGlobalInstructions,
}) => {
    const isGeneratingAll = generatingScene === 'all';
    const modelRequiresImage = imageModels.find(m => m.id === settings.sceneImageModel)?.requiresImage ?? false;

    return (
        <div className="bg-[var(--color-bg-surface)] p-6 rounded-xl shadow-lg border border-[var(--color-border-muted)]">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Generate Scene Variations</h2>
                <button
                    onClick={() => onGenerateScene('all')}
                    disabled={disabled || isGeneratingAll}
                    className="flex items-center justify-center gap-2 bg-[var(--color-action-prepare)] hover:bg-[var(--color-action-prepare-hover)] text-[var(--color-text-on-primary)] font-bold py-2.5 px-4 rounded-lg transition-colors text-sm"
                >
                    <PrepareMagicIcon className={`w-4 h-4 ${isGeneratingAll ? 'animate-spin' : ''}`} />
                    {isGeneratingAll ? 'Generating All...' : 'Generate All Scenes'}
                </button>
            </div>
            <p className="text-sm text-[var(--color-text-dim)] mb-4">
                Optionally upload a new subject, provide instructions, and generate new versions of the storyboard scenes below.
            </p>
            <div className="flex flex-col md:flex-row gap-6 mb-4">
                {/* Left: Uploader */}
                <div className="flex-shrink-0">
                    <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">1. Subject Image (Optional)</label>
                    <UploaderZone onFileUpload={(file) => onFileChange([file])} className="aspect-square w-32 h-32" disabled={disabled}>
                        {files.length > 0 ? (
                        <div className="relative w-full h-full">
                            <img src={URL.createObjectURL(files[0])} alt="Subject Preview" className="w-full h-full object-cover rounded-md" />
                            <button onClick={(e) => { e.stopPropagation(); onFileChange([]); }} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-600"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    ) : (
                        <div className="text-center text-[var(--color-text-dim)]">
                            <p className="font-semibold text-xs">Click or drag</p>
                        </div>
                    )}
                    </UploaderZone>
                </div>
                
                {/* Right: Settings & Instructions */}
                <div className="flex-grow flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="scene-image-model" className="block text-sm font-medium text-[var(--color-text-light)] mb-2">2. Image Generation Model</label>
                            <select
                                id="scene-image-model"
                                value={settings.sceneImageModel}
                                onChange={e => onSettingsChange(s => ({ ...s, sceneImageModel: e.target.value as ImageModel }))}
                                className="mt-1 block w-full rounded-md bg-[var(--color-bg-base)] border-[var(--color-border-default)] shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-ring)] sm:text-sm"
                            >
                                {imageModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">3. Image Aspect Ratio</label>
                             <div className="flex flex-wrap gap-1.5 mt-2">
                                {ASPECT_RATIO_OPTIONS.map(({ label, value }) => (
                                    <AspectRatioButton
                                        key={value}
                                        label={label}
                                        isActive={settings.sceneAspectRatio === value}
                                        onClick={() => onSettingsChange(s => ({...s, sceneAspectRatio: value as AspectRatio}))}
                                        disabled={disabled}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="scene-instructions" className="block text-sm font-medium text-[var(--color-text-light)]">
                                4. Global Instructions
                            </label>
                             <button
                                onClick={onApplyGlobalInstructions}
                                disabled={disabled || !instructions.trim()}
                                className="text-xs bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] px-2 py-1 rounded-md disabled:opacity-50"
                            >
                                Apply to All Scenes
                            </button>
                        </div>
                        <textarea
                            id="scene-instructions"
                            value={instructions}
                            onChange={(e) => onInstructionsChange(e.target.value)}
                            rows={2}
                            className="prompt-textarea w-full bg-[var(--color-bg-base)] border-2 border-[var(--color-border-muted)] rounded-lg p-2 text-sm"
                            placeholder="e.g., 'Make the style photorealistic'"
                            disabled={disabled}
                        />
                    </div>
                </div>
            </div>
            {modelRequiresImage && (
             <div>
                <label htmlFor="nano-banana-prompt" className="block text-xs font-medium text-[var(--color-text-dim)] mb-2">
                    Image Editing System Prompt
                </label>
                <textarea
                    id="nano-banana-prompt"
                    value={settings.nanoBananaPrompt}
                    onChange={e => onSettingsChange(s => ({ ...s, nanoBananaPrompt: e.target.value }))}
                    rows={4}
                    className="prompt-textarea w-full bg-[var(--color-bg-base)] border-2 border-[var(--color-border-muted)] rounded-lg p-2 text-xs font-mono"
                    disabled={disabled}
                />
            </div>
            )}
        </div>
    );
};

export default SceneGenerationControls;
