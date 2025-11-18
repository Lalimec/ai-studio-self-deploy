import React, { useState } from 'react';
import { VideoModel, VideoGenerationSettings, VideoResolution, VideoDuration } from '../types';
import { videoModels } from '../constants';
import { PiCaretDownIcon, VideoIcon } from './Icons';

interface VideoSettingsPanelProps {
    settings: VideoGenerationSettings;
    onSettingsChange: (settings: VideoGenerationSettings) => void;
    disabled?: boolean;
}

export const VideoSettingsPanel: React.FC<VideoSettingsPanelProps> = ({ settings, onSettingsChange, disabled = false }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const currentModel = videoModels.find(m => m.id === settings.model) || videoModels[0];

    const handleModelChange = (model: VideoModel) => {
        const modelConfig = videoModels.find(m => m.id === model);
        if (!modelConfig) return;

        // Reset settings to defaults when changing models
        onSettingsChange({
            model,
            resolution: modelConfig.defaultResolution,
            duration: modelConfig.defaultDuration,
            aspectRatio: modelConfig.defaultAspectRatio,
        });
    };

    const handleResolutionChange = (resolution: VideoResolution) => {
        onSettingsChange({ ...settings, resolution });
    };

    const handleDurationChange = (duration: VideoDuration) => {
        onSettingsChange({ ...settings, duration });
    };

    const handleAspectRatioChange = (aspectRatio: string) => {
        onSettingsChange({ ...settings, aspectRatio });
    };

    return (
        <section className="w-full bg-[var(--color-bg-surface-light)] border-2 border-[var(--color-border-default)] rounded-xl shadow-md overflow-hidden">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                disabled={disabled}
                className="w-full flex justify-between items-center px-6 py-4 text-left bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-muted-hover)] transition-colors disabled:cursor-not-allowed"
                aria-expanded={!isCollapsed}
                aria-controls="video-settings-panel"
            >
                <div className="flex items-center gap-3">
                    <VideoIcon className="w-6 h-6 text-[var(--color-primary-accent)]" />
                    <h3 className="text-lg font-bold text-[var(--color-text-main)]">Video Generation Settings</h3>
                </div>
                <PiCaretDownIcon
                    className={`w-5 h-5 text-[var(--color-text-dim)] transition-transform duration-300 ${
                        isCollapsed ? '' : 'rotate-180'
                    }`}
                />
            </button>

            {!isCollapsed && (
                <div id="video-settings-panel" className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Model Selector */}
                    <div className="flex flex-col gap-2">
                        <label className="block text-sm font-semibold text-[var(--color-text-light)]">
                            Model
                        </label>
                        <div className="flex flex-col gap-2">
                            {videoModels.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => handleModelChange(model.id)}
                                    disabled={disabled}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        settings.model === model.id
                                            ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-md'
                                            : 'bg-[var(--color-bg-muted)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {model.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Resolution Selector */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="video-resolution" className="block text-sm font-semibold text-[var(--color-text-light)]">
                            Resolution
                        </label>
                        <select
                            id="video-resolution"
                            value={settings.resolution}
                            onChange={(e) => handleResolutionChange(e.target.value as VideoResolution)}
                            disabled={disabled}
                            className="block w-full rounded-lg border-0 bg-[var(--color-bg-base)] py-2.5 px-3 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-default)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] disabled:opacity-50 disabled:cursor-not-allowed sm:text-sm"
                        >
                            {currentModel.supportedResolutions.map((res) => (
                                <option key={res} value={res}>
                                    {res}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-[var(--color-text-dim)]">
                            Video quality setting
                        </p>
                    </div>

                    {/* Duration Slider */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="video-duration" className="block text-sm font-semibold text-[var(--color-text-light)]">
                            Duration: {settings.duration}s
                        </label>
                        <input
                            id="video-duration"
                            type="range"
                            min={Math.min(...currentModel.supportedDurations)}
                            max={Math.max(...currentModel.supportedDurations)}
                            step={1}
                            value={settings.duration}
                            onChange={(e) => handleDurationChange(parseInt(e.target.value, 10) as VideoDuration)}
                            disabled={disabled}
                            className="w-full h-2 bg-[var(--color-bg-muted)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex justify-between text-xs text-[var(--color-text-dim)]">
                            <span>{Math.min(...currentModel.supportedDurations)}s</span>
                            <span>{Math.max(...currentModel.supportedDurations)}s</span>
                        </div>
                    </div>

                    {/* Aspect Ratio Selector */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="video-aspect-ratio" className="block text-sm font-semibold text-[var(--color-text-light)]">
                            Aspect Ratio
                        </label>
                        <select
                            id="video-aspect-ratio"
                            value={settings.aspectRatio}
                            onChange={(e) => handleAspectRatioChange(e.target.value)}
                            disabled={disabled}
                            className="block w-full rounded-lg border-0 bg-[var(--color-bg-base)] py-2.5 px-3 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-default)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] disabled:opacity-50 disabled:cursor-not-allowed sm:text-sm"
                        >
                            {currentModel.supportedAspectRatios.map((ratio) => (
                                <option key={ratio} value={ratio}>
                                    {ratio}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-[var(--color-text-dim)]">
                            Video dimensions ratio
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
};
