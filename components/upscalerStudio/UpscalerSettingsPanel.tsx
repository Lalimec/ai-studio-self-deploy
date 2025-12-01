import React from 'react';
import { UpscalerSettings, UpscalerModel, UpscaleMode, TargetResolution } from '../../types';

interface UpscalerSettingsPanelProps {
    settings: UpscalerSettings;
    onUpdateSettings: (newSettings: Partial<UpscalerSettings>) => void;
    disabled?: boolean;
}

const UpscalerSettingsPanel: React.FC<UpscalerSettingsPanelProps> = ({
    settings,
    onUpdateSettings,
    disabled = false
}) => {
    const handleModelChange = (model: UpscalerModel) => {
        onUpdateSettings({ model });
    };

    const handleModeChange = (upscaleMode: UpscaleMode) => {
        onUpdateSettings({ upscaleMode });
    };

    const handleScaleFactorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateSettings({ scaleFactor: parseFloat(e.target.value) });
    };

    const handleTargetResolutionChange = (targetResolution: TargetResolution) => {
        onUpdateSettings({ targetResolution });
    };

    const targetResolutions: TargetResolution[] = ['720p', '1080p', '1440p', '2160p'];

    return (
        <div className="mb-6 p-4 bg-[var(--color-bg-surface-light)] rounded-lg border border-[var(--color-border-default)]">
            <div className="flex flex-wrap items-center gap-6">
                {/* Model Selection */}
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-[var(--color-text-light)]">Model:</label>
                    <div className="flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
                        <button
                            onClick={() => handleModelChange('crystal')}
                            disabled={disabled}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                settings.model === 'crystal'
                                    ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                                    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            Crystal
                        </button>
                        <button
                            onClick={() => handleModelChange('seedvr')}
                            disabled={disabled}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-l border-[var(--color-border-default)] ${
                                settings.model === 'seedvr'
                                    ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                                    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            SeedVR
                        </button>
                    </div>
                </div>

                {/* Crystal: Scale Factor Slider */}
                {settings.model === 'crystal' && (
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-[var(--color-text-light)]">Scale Factor:</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="1"
                                max="4"
                                step="0.5"
                                value={settings.scaleFactor}
                                onChange={handleScaleFactorChange}
                                disabled={disabled}
                                className="w-24 h-2 bg-[var(--color-bg-muted)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-sm font-mono text-[var(--color-text-main)] min-w-[3ch]">
                                {settings.scaleFactor}x
                            </span>
                        </div>
                    </div>
                )}

                {/* SeedVR: Mode Selection */}
                {settings.model === 'seedvr' && (
                    <>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-[var(--color-text-light)]">Mode:</label>
                            <div className="flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
                                <button
                                    onClick={() => handleModeChange('factor')}
                                    disabled={disabled}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                                        settings.upscaleMode === 'factor'
                                            ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                                            : 'bg-[var(--color-bg-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    Factor
                                </button>
                                <button
                                    onClick={() => handleModeChange('target')}
                                    disabled={disabled}
                                    className={`px-4 py-2 text-sm font-medium transition-colors border-l border-[var(--color-border-default)] ${
                                        settings.upscaleMode === 'target'
                                            ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                                            : 'bg-[var(--color-bg-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    Target
                                </button>
                            </div>
                        </div>

                        {/* SeedVR Factor Mode: Scale Factor Slider */}
                        {settings.upscaleMode === 'factor' && (
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-[var(--color-text-light)]">Scale Factor:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="4"
                                        step="0.5"
                                        value={settings.scaleFactor}
                                        onChange={handleScaleFactorChange}
                                        disabled={disabled}
                                        className="w-24 h-2 bg-[var(--color-bg-muted)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className="text-sm font-mono text-[var(--color-text-main)] min-w-[3ch]">
                                        {settings.scaleFactor}x
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* SeedVR Target Mode: Resolution Selection */}
                        {settings.upscaleMode === 'target' && (
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-[var(--color-text-light)]">Resolution:</label>
                                <div className="flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
                                    {targetResolutions.map((resolution, index) => (
                                        <button
                                            key={resolution}
                                            onClick={() => handleTargetResolutionChange(resolution)}
                                            disabled={disabled}
                                            className={`px-3 py-2 text-sm font-medium transition-colors ${
                                                index > 0 ? 'border-l border-[var(--color-border-default)]' : ''
                                            } ${
                                                settings.targetResolution === resolution
                                                    ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                                                    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {resolution}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UpscalerSettingsPanel;
