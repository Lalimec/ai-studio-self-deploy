import React from 'react';
import { PrepareMagicIcon, TrashIcon, UploadIcon } from '../Icons';
import { VideoAnalyzerSettings, ImageModel, AspectRatio } from '../../types';
import { imageModels, ASPECT_RATIO_OPTIONS } from '../../constants';
import UploaderZone from '../UploaderZone';

interface ConceptGenerationControlsProps {
    settings: VideoAnalyzerSettings;
    onSettingsChange: (newSettings: React.SetStateAction<VideoAnalyzerSettings>) => void;
    disabled: boolean;
    subjectImages: File[];
    onAddSubjectImage: (file: File) => void;
    onRemoveSubjectImage: (index: number) => void;
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

const ConceptGenerationControls: React.FC<ConceptGenerationControlsProps> = ({
    settings,
    onSettingsChange,
    disabled,
    subjectImages,
    onAddSubjectImage,
    onRemoveSubjectImage
}) => {
    return (
        <div className="bg-[var(--color-bg-surface)] p-6 rounded-xl shadow-lg border border-[var(--color-border-muted)]">
            <h2 className="text-2xl font-bold mb-4">Concept Generation Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">Subject Images (Optional)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 6 }).map((_, i) => {
                                const file = subjectImages[i];
                                return file ? (
                                    <div key={i} className="relative group aspect-square">
                                        <img src={URL.createObjectURL(file)} alt={`Subject ${i+1}`} className="w-full h-full object-cover rounded-lg" />
                                        <button onClick={() => onRemoveSubjectImage(i)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <UploaderZone key={i} onFileUpload={onAddSubjectImage} className="aspect-square p-2" disabled={disabled}>
                                        <UploadIcon className="h-5 w-5 text-[var(--color-text-dim)]" />
                                    </UploaderZone>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="concept-image-model" className="block text-sm font-medium text-[var(--color-text-light)]">Image Model</label>
                        <select
                            id="concept-image-model"
                            value={settings.imageModel}
                            onChange={e => onSettingsChange(s => ({ ...s, imageModel: e.target.value as ImageModel }))}
                            disabled={disabled}
                            className="mt-1 block w-full rounded-md bg-[var(--color-bg-base)] border-[var(--color-border-default)] shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-ring)] sm:text-sm"
                        >
                            {imageModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-[var(--color-text-light)]">Aspect Ratio</label>
                         <div className="flex flex-wrap gap-1.5 mt-2">
                            {ASPECT_RATIO_OPTIONS.filter(o => o.value !== 'auto').map(({ label, value }) => (
                                <AspectRatioButton
                                    key={value}
                                    label={label}
                                    isActive={settings.aspectRatio === value}
                                    onClick={() => onSettingsChange(s => ({...s, aspectRatio: value as AspectRatio}))}
                                    disabled={disabled}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="additional-instructions" className="block text-sm font-medium text-[var(--color-text-light)]">Additional Instructions</label>
                        <textarea
                            id="additional-instructions"
                            value={settings.additionalInstructions}
                            onChange={e => onSettingsChange(s => ({ ...s, additionalInstructions: e.target.value }))}
                            disabled={disabled}
                            rows={3}
                            className="mt-1 prompt-textarea w-full bg-[var(--color-bg-base)] border-2 border-[var(--color-border-muted)] rounded-lg p-2 text-sm"
                            placeholder="e.g., 'Focus on a younger audience...'"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConceptGenerationControls;
