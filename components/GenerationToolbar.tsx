import React from 'react';
import { AspectRatio } from '../types';
import { ASPECT_RATIO_OPTIONS } from '../constants';

export type GenerationToolbarConfig = {
  // Aspect Ratio
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  aspectRatioDisabled?: boolean;
  showAspectRatio?: boolean; // default true

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
  additionalButtons = [],

  studioMode,
}) => {
  const handleImageCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onImageCountChange(parseInt(e.target.value, 10));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-surface)] border-t-2 border-[var(--color-border-muted)] shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left side: Aspect Ratio + Image Count */}
          <div className="flex flex-wrap items-center gap-6">
            {showAspectRatio && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-[var(--color-text-light)] whitespace-nowrap">
                  Aspect Ratio:
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {ASPECT_RATIO_OPTIONS.map(({ label, value }) => (
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

          {/* Right side: Mode Selection + Additional Buttons + Generate + Start Over */}
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
