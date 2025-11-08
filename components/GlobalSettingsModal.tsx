import React, { useState } from 'react';
import { CloseIcon } from './Icons';
import { NanoBananaWebhookSettings, VideoSettings, VideoModel, VideoModelParameters } from '../types';
import { videoModels, videoResolutions, videoDurations, videoAspectRatios } from '../constants';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showBetaFeatures: boolean;
  onToggleBetaFeatures: (enabled: boolean) => void;
  nanoBananaWebhookSettings: NanoBananaWebhookSettings;
  onToggleNanoBananaWebhookSetting: (studio: keyof NanoBananaWebhookSettings, enabled: boolean) => void;
  videoSettings: VideoSettings;
  onUpdateVideoSettings: (settings: VideoSettings) => void;
}

const Toggle: React.FC<{id: string, label: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({id, label, checked, onChange}) => (
    <div className="flex items-center justify-between">
        <label htmlFor={id} className="font-medium text-[var(--color-text-light)] cursor-pointer">
            {label}
        </label>
        <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
            <input 
                type="checkbox" 
                id={id} 
                className="sr-only peer" 
                checked={checked}
                onChange={onChange}
            />
            <div className="w-11 h-6 bg-[var(--color-bg-muted)] rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--color-primary-ring)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
        </label>
    </div>
);


const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({
    isOpen, onClose, showBetaFeatures, onToggleBetaFeatures,
    nanoBananaWebhookSettings, onToggleNanoBananaWebhookSetting,
    videoSettings, onUpdateVideoSettings
}) => {
    const [localVideoSettings, setLocalVideoSettings] = useState<VideoSettings>(videoSettings);

    const handleModelChange = (model: VideoModel) => {
        setLocalVideoSettings(prev => ({ ...prev, selectedModel: model }));
    };

    const handleParameterChange = (model: VideoModel, param: keyof VideoModelParameters, value: any) => {
        setLocalVideoSettings(prev => ({
            ...prev,
            modelParameters: {
                ...prev.modelParameters,
                [model]: {
                    ...prev.modelParameters[model],
                    [param]: value
                }
            }
        }));
    };

    const handleSave = () => {
        onUpdateVideoSettings(localVideoSettings);
        onClose();
    };

    if (!isOpen) return null;

    const currentParams = localVideoSettings.modelParameters[localVideoSettings.selectedModel];

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-[var(--color-bg-surface)] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-[var(--color-border-muted)] sticky top-0 bg-[var(--color-bg-surface)] z-10">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--color-bg-muted)]">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <label htmlFor="beta-features-toggle" className="font-medium text-[var(--color-text-light)]">
                                Show Beta Features
                            </label>
                            <p className="text-sm text-[var(--color-text-dim)]">
                                Access experimental new studios like Ad Cloner.
                            </p>
                        </div>
                        <label htmlFor="beta-features-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                id="beta-features-toggle" 
                                className="sr-only peer" 
                                checked={showBetaFeatures}
                                onChange={(e) => onToggleBetaFeatures(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-[var(--color-bg-muted)] rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--color-primary-ring)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                        </label>
                    </div>

                    <div className="pt-4 border-t border-[var(--color-border-muted)]">
                        <h3 className="font-semibold text-[var(--color-text-light)] mb-2">Nano Banana Endpoint Control</h3>
                        <p className="text-sm text-[var(--color-text-dim)] mb-4">
                            Choose whether to use the n8n webhook or the native Gemini API for each studio.
                        </p>
                        <div className="space-y-4">
                            <Toggle
                                id="hair-webhook-toggle"
                                label="Hair Studio"
                                checked={nanoBananaWebhookSettings.hair}
                                onChange={(e) => onToggleNanoBananaWebhookSetting('hair', e.target.checked)}
                            />
                            <Toggle
                                id="baby-webhook-toggle"
                                label="Baby Studio"
                                checked={nanoBananaWebhookSettings.baby}
                                onChange={(e) => onToggleNanoBananaWebhookSetting('baby', e.target.checked)}
                            />
                            <Toggle
                                id="image-webhook-toggle"
                                label="Image Studio"
                                checked={nanoBananaWebhookSettings.image}
                                onChange={(e) => onToggleNanoBananaWebhookSetting('image', e.target.checked)}
                            />
                            {showBetaFeatures && (
                                <Toggle
                                    id="adcloner-webhook-toggle"
                                    label="Ad Cloner Studio"
                                    checked={nanoBananaWebhookSettings.adCloner}
                                    onChange={(e) => onToggleNanoBananaWebhookSetting('adCloner', e.target.checked)}
                                />
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--color-border-muted)]">
                        <h3 className="font-semibold text-[var(--color-text-light)] mb-2">Video Generation Settings</h3>
                        <p className="text-sm text-[var(--color-text-dim)] mb-4">
                            Configure video model and parameters for all video generation features.
                        </p>

                        <div className="space-y-4">
                            {/* Video Model Selection */}
                            <div>
                                <label htmlFor="video-model-select" className="block font-medium text-[var(--color-text-light)] mb-2">
                                    Video Model
                                </label>
                                <select
                                    id="video-model-select"
                                    value={localVideoSettings.selectedModel}
                                    onChange={(e) => handleModelChange(e.target.value as VideoModel)}
                                    className="w-full px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)]"
                                >
                                    {videoModels.map(model => (
                                        <option key={model.id} value={model.id}>
                                            {model.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-[var(--color-text-dim)] mt-1">
                                    {videoModels.find(m => m.id === localVideoSettings.selectedModel)?.description}
                                </p>
                            </div>

                            {/* Resolution */}
                            <div>
                                <label htmlFor="video-resolution-select" className="block font-medium text-[var(--color-text-light)] mb-2">
                                    Resolution
                                </label>
                                <select
                                    id="video-resolution-select"
                                    value={currentParams.resolution}
                                    onChange={(e) => handleParameterChange(localVideoSettings.selectedModel, 'resolution', e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)]"
                                >
                                    {videoResolutions.map(res => (
                                        <option key={res.value} value={res.value}>
                                            {res.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Duration */}
                            <div>
                                <label htmlFor="video-duration-select" className="block font-medium text-[var(--color-text-light)] mb-2">
                                    Duration
                                </label>
                                <select
                                    id="video-duration-select"
                                    value={currentParams.duration}
                                    onChange={(e) => handleParameterChange(localVideoSettings.selectedModel, 'duration', e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)]"
                                >
                                    {videoDurations.map(dur => (
                                        <option key={dur.value} value={dur.value}>
                                            {dur.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Aspect Ratio */}
                            <div>
                                <label htmlFor="video-aspect-ratio-select" className="block font-medium text-[var(--color-text-light)] mb-2">
                                    Aspect Ratio
                                </label>
                                <select
                                    id="video-aspect-ratio-select"
                                    value={currentParams.aspectRatio}
                                    onChange={(e) => handleParameterChange(localVideoSettings.selectedModel, 'aspectRatio', e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)]"
                                >
                                    {videoAspectRatios.map(ratio => (
                                        <option key={ratio.value} value={ratio.value}>
                                            {ratio.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-4 bg-[var(--color-bg-surface-light)] rounded-b-2xl border-t border-[var(--color-border-muted)] sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-surface)] text-[var(--color-text-main)] font-medium rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium rounded-lg transition-colors"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GlobalSettingsModal;