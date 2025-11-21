import React from 'react';
import { AspectRatio } from '../types';
import { ASPECT_RATIO_OPTIONS } from '../constants';

export type GenerationToolbarConfig = {
  // Aspect Ratio
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  aspectRatioDisabled?: boolean;
  showAspectRatio?: boolean; // default true
  aspectRatioOptions?: Array<{ label: string; value: AspectRatio }>; // Custom aspect ratio options

  // Image Count
  imageCount: number;
  onImageCountChange: (count: number) => void;
  imageCountMin?: number; // default 1
  imageCountMax?: number; // default 20
  imageCountDisabled?: boolean;
  showImageCount?: boolean; // default true

  // Generate Button
  generateButtonText: string;
  onGenerate: () => void;
  generateDisabled?: boolean;
  pendingCount?: number; // Show "Generating... (N left)" if > 0

  // Start Over / Clear Button
  startOverButtonText?: string; // default "Start Over", if null, hide button
  onStartOver?: () => void;
  startOverDisabled?: boolean;

  // Mode Selection Buttons (shown in their own section, e.g., for style selection modes)
  modeButtons?: Array<{
    key: string;
    text: string;
    onClick: () => void;
    disabled?: boolean;
    isActive?: boolean;
    tooltip?: string;
  }>;

  // Model Selection Buttons with icons (for Image Studio)
  modelButtons?: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    isActive?: boolean;
  }>;

  // Style Mode Selection Buttons with icons (for Architecture Studio)
  styleModeButtons?: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    isActive?: boolean;
  }>;

  // Additional Buttons (left side of generate button)
  additionalButtons?: Array<{
    key: string;
    text: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'action'; // default 'action'
    isActive?: boolean; // for toggle-style buttons
  }>;

  // Studio mode for specific customization
  studioMode?: 'hair' | 'baby' | 'architecture' | 'image';

  // Seedream Resolution Settings (for Image Studio with Seedream model)
  seedreamSettings?: {
    imageSizePreset: string;
    onImageSizePresetChange: (preset: string) => void;
    imageSizePresets: { [key: string]: { name: string; width?: number; height?: number } };
    customWidth: number;
    customHeight: number;
    onCustomWidthChange: (width: number) => void;
    onCustomHeightChange: (height: number) => void;
    aspectRatioPresets: Array<{ label: string; width: number; height: number }>;
    currentAspectRatio: string | null;
    onAspectRatioPresetClick: (preset: { label: string; width: number; height: number }) => void;
    isSeedreamAspectRatioInvalid: boolean;
  };
};

const AspectRatioButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  title?: string;
  disabled: boolean;
}> = ({ label, isActive, onClick, title, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`py-1.5 px-3 rounded-md font-semibold transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
      isActive ? 'bg-[var(--color-secondary)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)]'
    }`}
  >
    {label}
  </button>
);

const GenerationToolbar: React.FC<GenerationToolbarConfig> = ({
  aspectRatio,
  onAspectRatioChange,
  aspectRatioDisabled = false,
  showAspectRatio = true,
  aspectRatioOptions,

  imageCount,
  onImageCountChange,
  imageCountMin = 1,
  imageCountMax = 20,
  imageCountDisabled = false,
  showImageCount = true,

  generateButtonText,
  onGenerate,
  generateDisabled = false,
  pendingCount = 0,

  startOverButtonText = 'Start Over',
  onStartOver,
  startOverDisabled = false,

  modeButtons = [],
  modelButtons = [],
  styleModeButtons = [],
  additionalButtons = [],

  studioMode,
  seedreamSettings,
}) => {
  const handleImageCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onImageCountChange(parseInt(e.target.value, 10));
  };

  // Use custom aspect ratio options if provided, otherwise default
  const ratioOptions = aspectRatioOptions || ASPECT_RATIO_OPTIONS;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[95px] bg-[var(--color-bg-surface)] border-t-2 border-[var(--color-border-muted)] shadow-lg z-50 overflow-visible">
      <div className="max-w-7xl mx-auto px-6 py-4 h-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left side: Aspect Ratio + Image Count + Seedream Settings */}
          <div className="flex flex-wrap items-center gap-6">
            {showAspectRatio && !seedreamSettings && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-[var(--color-text-light)] whitespace-nowrap">
                  Aspect Ratio:
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {ratioOptions.map(({ label, value }) => (
                    <AspectRatioButton
                      key={value}
                      label={label}
                      isActive={aspectRatio === value}
                      onClick={() => onAspectRatioChange(value)}
                      title={`Set aspect ratio to ${label}`}
                      disabled={aspectRatioDisabled}
                    />
                  ))}
                </div>
              </div>
            )}

            {seedreamSettings && (
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-[var(--color-text-light)] whitespace-nowrap">
                  Resolution:
                </label>
                <select
                  value={seedreamSettings.imageSizePreset}
                  onChange={(e) => seedreamSettings.onImageSizePresetChange(e.target.value)}
                  className="rounded-md border-0 bg-[var(--color-bg-base)] py-1.5 px-2 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-default)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] text-xs"
                >
                  {Object.keys(seedreamSettings.imageSizePresets).map((key) => (
                    <option key={key} value={key}>{seedreamSettings.imageSizePresets[key].name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={seedreamSettings.imageSizePreset.startsWith('auto') ? '' : seedreamSettings.customWidth}
                  placeholder={seedreamSettings.imageSizePreset.startsWith('auto') ? '?' : undefined}
                  onChange={(e) => seedreamSettings.onCustomWidthChange(Math.max(1024, Math.min(4096, parseInt(e.target.value, 10) || 1024)))}
                  disabled={seedreamSettings.imageSizePreset !== 'custom'}
                  readOnly={seedreamSettings.imageSizePreset === 'custom_4K' || seedreamSettings.imageSizePreset === 'custom_2K'}
                  className="w-14 rounded-md border-0 bg-[var(--color-bg-base)] py-1.5 px-2 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-default)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] text-xs disabled:opacity-50 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Width"
                  min="1024"
                  max="4096"
                />
                <span className="text-[var(--color-text-dimmer)] text-xs">×</span>
                <input
                  type="number"
                  value={seedreamSettings.imageSizePreset.startsWith('auto') ? '' : seedreamSettings.customHeight}
                  placeholder={seedreamSettings.imageSizePreset.startsWith('auto') ? '?' : undefined}
                  onChange={(e) => seedreamSettings.onCustomHeightChange(Math.max(1024, Math.min(4096, parseInt(e.target.value, 10) || 1024)))}
                  disabled={seedreamSettings.imageSizePreset !== 'custom'}
                  readOnly={seedreamSettings.imageSizePreset === 'custom_4K' || seedreamSettings.imageSizePreset === 'custom_2K'}
                  className="w-14 rounded-md border-0 bg-[var(--color-bg-base)] py-1.5 px-2 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-default)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] text-xs disabled:opacity-50 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Height"
                  min="1024"
                  max="4096"
                />
                {(seedreamSettings.imageSizePreset === 'custom' || seedreamSettings.imageSizePreset === 'custom_4K' || seedreamSettings.imageSizePreset === 'custom_2K') && (
                  <div className="flex flex-wrap gap-1">
                    {seedreamSettings.aspectRatioPresets.map(preset => {
                      const isActive = seedreamSettings.imageSizePreset === 'custom'
                        ? preset.width === seedreamSettings.customWidth && preset.height === seedreamSettings.customHeight
                        : seedreamSettings.currentAspectRatio === preset.label;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => seedreamSettings.onAspectRatioPresetClick(preset)}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            isActive
                              ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] ring-1 ring-[var(--color-primary-ring)]'
                              : 'bg-[var(--color-bg-muted)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {seedreamSettings.isSeedreamAspectRatioInvalid && (
                  <span className="text-xs text-[var(--color-warning-accent)] font-medium">
                    ⚠ Aspect ratio should be 0.333-3
                  </span>
                )}
              </div>
            )}

            {showImageCount && (
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-[var(--color-text-light)] whitespace-nowrap">
                  Images:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={imageCountMin}
                    max={imageCountMax}
                    step="1"
                    value={imageCount}
                    onChange={handleImageCountChange}
                    disabled={imageCountDisabled}
                    className="w-32 h-2 bg-[var(--color-border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] disabled:opacity-50"
                    title={`Select the number of images to generate (${imageCountMin}-${imageCountMax})`}
                  />
                  <span className="font-semibold text-[var(--color-primary-accent)] w-6 text-center">
                    {imageCount}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right side: Mode Selection + Model Selection + Additional Buttons + Generate + Start Over */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Selection Buttons */}
            {modeButtons.length > 0 && (
              <>
                <div className="flex items-center gap-1">
                  {modeButtons.map((btn) => (
                    <button
                      key={btn.key}
                      onClick={btn.onClick}
                      disabled={btn.disabled}
                      title={btn.tooltip}
                      className={`${
                        btn.isActive
                          ? 'bg-[var(--color-secondary)] text-[var(--color-text-on-primary)]'
                          : 'bg-[var(--color-bg-muted)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted-hover)]'
                      } font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {btn.text}
                    </button>
                  ))}
                </div>
                <div className="w-px h-8 bg-[var(--color-border-muted)]"></div>
              </>
            )}

            {/* Model Selection Buttons with Icons */}
            {modelButtons.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  {modelButtons.map((btn) => (
                    <button
                      key={btn.key}
                      onClick={btn.onClick}
                      title={btn.label}
                      className={`group relative p-2.5 rounded-lg transition-all ${
                        btn.isActive
                          ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-lg scale-110'
                          : 'bg-[var(--color-bg-muted)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-muted-hover)] hover:scale-105'
                      }`}
                    >
                      {btn.icon}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--color-primary-accent)] text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none shadow-lg z-50">
                        {btn.label}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="w-px h-8 bg-[var(--color-border-muted)]"></div>
              </>
            )}
            {styleModeButtons.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  {styleModeButtons.map((btn) => (
                    <button
                      key={btn.key}
                      onClick={btn.onClick}
                      title={btn.label}
                      className={`group relative p-2.5 rounded-lg transition-all ${
                        btn.isActive
                          ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-lg scale-110'
                          : 'bg-[var(--color-bg-muted)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-muted-hover)] hover:scale-105'
                      }`}
                    >
                      {btn.icon}
                      <span className="absolute bottom-full left-1\2 -translate-x-1\2 mb-2 px-3 py-1.5 bg-[var(--color-primary-accent)] text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none shadow-lg z-50">
                        {btn.label}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="w-px h-8 bg-[var(--color-border-muted)]"></div>
              </>
            )}
            {additionalButtons.map((btn) => {
              const variantClass = btn.isActive
                ? 'bg-[var(--color-secondary)] text-[var(--color-text-on-primary)]'
                : btn.variant === 'primary' ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]' :
                  btn.variant === 'secondary' ? 'bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)]' :
                  'bg-[var(--color-action-generate)] hover:bg-[var(--color-action-generate-hover)]';

              return (
                <button
                  key={btn.key}
                  onClick={btn.onClick}
                  disabled={btn.disabled}
                  className={`${variantClass} text-[var(--color-text-on-primary)] font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] disabled:cursor-not-allowed`}
                >
                  {btn.text}
                </button>
              );
            })}

            <button
              onClick={onGenerate}
              disabled={generateDisabled}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-muted)] disabled:cursor-not-allowed text-[var(--color-text-on-primary)] font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {pendingCount > 0 ? `Generating... (${pendingCount} left)` : generateButtonText}
            </button>

            {startOverButtonText && onStartOver && (
              <button
                onClick={onStartOver}
                disabled={startOverDisabled}
                className="bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-main)] font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface)] disabled:text-[var(--color-text-dimmer)] disabled:cursor-not-allowed text-sm"
              >
                {startOverButtonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerationToolbar;
