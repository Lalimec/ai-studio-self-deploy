import React from 'react';
import { ArchitectureGenerationOptions, AspectRatio } from '../../types';
import {
    ARCHITECTURE_SCOPES,
    INTERIOR_STYLES,
    EXTERIOR_STYLES,
    FACADE_STYLES,
    GARDEN_STYLES,
    LANDSCAPE_STYLES,
    ARCHITECTURE_TIMES,
    ARCHITECTURE_THEMES,
    CAMERA_ANGLE_OPTIONS,
    ROOM_TYPES,
    BUILDING_TYPES,
    COLOR_SCHEMES,
    TIDY_OPTIONS
} from '../../architectureConstants';
import { ASPECT_RATIO_OPTIONS } from '../../constants';

interface OptionsPanelProps {
    options: ArchitectureGenerationOptions;
    setOptions: React.Dispatch<React.SetStateAction<ArchitectureGenerationOptions>>;
    disabled: boolean;
}

const FilterButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    className?: string;
    title?: string;
    buttonDisabled?: boolean;
}> = ({ label, isActive, onClick, className = '', title, buttonDisabled }) => (
    <button
        onClick={onClick}
        disabled={buttonDisabled}
        title={title}
        className={`py-2 px-3 rounded-md font-semibold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            isActive ? 'bg-[var(--color-secondary)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)]'
        } ${className}`}
    >
        {label}
    </button>
);

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
        className={`py-1 px-2 rounded-md font-semibold transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
            isActive ? 'bg-[var(--color-secondary)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)]'
        }`}
    >
        {label}
    </button>
);

const getStylesForScope = (scope: string) => {
    switch (scope) {
        case 'interior': return INTERIOR_STYLES;
        case 'exterior': return EXTERIOR_STYLES;
        case 'facade': return FACADE_STYLES;
        case 'garden': return GARDEN_STYLES;
        case 'landscape': return LANDSCAPE_STYLES;
        default: return INTERIOR_STYLES;
    }
};

const ArchitectureOptionsPanel: React.FC<OptionsPanelProps> = ({ options, setOptions, disabled }) => {
    const handleScopeChange = (scopeId: string) => {
        setOptions(prev => ({
            ...prev,
            scope: scopeId,
            styles: [], // Clear styles when scope changes
            useCustomStyles: false,
        }));
    };

    const handleToggleStyle = (styleId: string) => {
        setOptions(prev => {
            const newStyles = prev.styles.includes(styleId)
                ? prev.styles.filter(s => s !== styleId)
                : [...prev.styles, styleId];

            return { ...prev, styles: newStyles, useCustomStyles: false };
        });
    };

    const handleCustomStylesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value } = e.target;
        setOptions(prev => ({
            ...prev,
            customStyles: value,
            styles: [],
            useCustomStyles: true,
        }));
    };

    const handleToggleCustomStyles = () => {
        setOptions(prev => {
            const isActivatingCustom = !prev.useCustomStyles;
            if (isActivatingCustom) {
                return { ...prev, useCustomStyles: true, styles: [] };
            } else {
                return { ...prev, useCustomStyles: false };
            }
        });
    };

    const handleTimeChange = (timeId: string) => {
        setOptions(prev => ({ ...prev, time: timeId }));
    };

    const handleThemeChange = (themeId: string) => {
        setOptions(prev => ({ ...prev, theme: themeId }));
    };

    const handleCameraAngleChange = (angleId: string) => {
        setOptions(prev => ({ ...prev, cameraAngle: angleId }));
    };

    const handleImageCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOptions(prev => ({ ...prev, imageCount: parseInt(e.target.value, 10) }));
    };

    const handleRoomTypeChange = (roomTypeId: string) => {
        setOptions(prev => ({ ...prev, roomType: roomTypeId }));
    };

    const handleBuildingTypeChange = (buildingTypeId: string) => {
        setOptions(prev => ({ ...prev, buildingType: buildingTypeId }));
    };

    const handleColorSchemeChange = (colorSchemeId: string) => {
        setOptions(prev => ({ ...prev, colorScheme: colorSchemeId }));
    };

    const handleTidyChange = (tidyId: string) => {
        setOptions(prev => ({ ...prev, tidy: tidyId }));
    };

    const handleShowUnfinishedToggle = () => {
        setOptions(prev => ({ ...prev, showUnfinished: !prev.showUnfinished }));
    };

    const currentStyles = getStylesForScope(options.scope);
    const isCustomActive = options.useCustomStyles;

    return (
        <div className="space-y-6">
            {/* 1. Architectural Scope */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">1. Architectural Scope</label>
                <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Select the type of space you want to transform.</p>
                <div className="flex flex-wrap gap-2">
                    {ARCHITECTURE_SCOPES.map(scope => (
                        <FilterButton
                            key={scope.id}
                            label={scope.name}
                            isActive={options.scope === scope.id}
                            onClick={() => handleScopeChange(scope.id)}
                            title={`Set scope to ${scope.name}`}
                            buttonDisabled={disabled}
                        />
                    ))}
                </div>
            </div>

            {/* 2. Aspect Ratio */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">2. Generation Aspect Ratio</label>
                <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIO_OPTIONS.map(({ label, value }) => (
                        <AspectRatioButton
                            key={value}
                            label={label}
                            isActive={options.aspectRatio === value}
                            onClick={() => setOptions(prev => ({ ...prev, aspectRatio: value }))}
                            title={`Set aspect ratio to ${label}`}
                            disabled={disabled}
                        />
                    ))}
                </div>
            </div>

            {/* 3. Style Selection Mode */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">3. Style Selection Mode</label>
                <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Choose how styles are selected for generation.</p>
                <div className="flex flex-wrap gap-2">
                    <FilterButton
                        label="Generate Selected Styles"
                        isActive={options.styleSelectionMode === 'selected'}
                        onClick={() => setOptions(prev => ({ ...prev, styleSelectionMode: 'selected', imageCount: 1 }))}
                        title="Generate one image for each selected style"
                        buttonDisabled={disabled}
                    />
                    <FilterButton
                        label="Randomize Styles"
                        isActive={options.styleSelectionMode === 'random'}
                        onClick={() => setOptions(prev => ({ ...prev, styleSelectionMode: 'random' }))}
                        title="Randomly pick styles from selected or all styles"
                        buttonDisabled={disabled}
                    />
                </div>
            </div>

            {/* 4. Number of Images - Only shown for Random mode */}
            {options.styleSelectionMode === 'random' && (
                <div>
                    <label htmlFor="image-count-slider" className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
                        4. Number of Images
                    </label>
                    <p className="text-xs text-[var(--color-text-dimmer)] mb-2">
                        Total number of images to generate with random styles.
                    </p>
                    <div className="flex items-center gap-4">
                        <input
                            id="image-count-slider"
                            type="range"
                            min="1"
                            max="12"
                            step="1"
                            value={options.imageCount}
                            onChange={handleImageCountChange}
                            disabled={disabled}
                            className="w-full h-2 bg-[var(--color-border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] disabled:opacity-50"
                            title="Select the number of images to generate (1-12)"
                        />
                        <span className="font-semibold text-[var(--color-primary-accent)] w-8 text-center">{options.imageCount}</span>
                    </div>
                </div>
            )}

            {/* Room/Building Type (Optional - Collapsible) */}
            {options.scope === 'interior' && (
                <details className="group">
                    <summary className="block text-sm font-medium text-[var(--color-text-light)] mb-2 cursor-pointer hover:text-[var(--color-primary)]">
                        {options.styleSelectionMode === 'random' ? '5. ' : '4. '}Room Type (Optional - Auto-Detect Available) ▼
                    </summary>
                    <p className="text-xs text-[var(--color-text-dimmer)] mb-2 mt-2">Override automatic detection by specifying room type.</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {ROOM_TYPES.map(roomType => (
                            <FilterButton
                                key={roomType.id}
                                label={roomType.name}
                                isActive={options.roomType === roomType.id}
                                onClick={() => handleRoomTypeChange(roomType.id)}
                                title={roomType.name}
                                buttonDisabled={disabled}
                            />
                        ))}
                    </div>
                </details>
            )}

            {(options.scope === 'exterior' || options.scope === 'facade' || options.scope === 'garden' || options.scope === 'landscape') && (
                <details className="group">
                    <summary className="block text-sm font-medium text-[var(--color-text-light)] mb-2 cursor-pointer hover:text-[var(--color-primary)]">
                        {options.styleSelectionMode === 'random' ? '5. ' : '4. '}Building / Space Type (Optional - Auto-Detect Available) ▼
                    </summary>
                    <p className="text-xs text-[var(--color-text-dimmer)] mb-2 mt-2">Override automatic detection by specifying building type.</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {BUILDING_TYPES.map(buildingType => (
                            <FilterButton
                                key={buildingType.id}
                                label={buildingType.name}
                                isActive={options.buildingType === buildingType.id}
                                onClick={() => handleBuildingTypeChange(buildingType.id)}
                                title={buildingType.name}
                                buttonDisabled={disabled}
                            />
                        ))}
                    </div>
                </details>
            )}

            {/* Styles */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
                    {options.styleSelectionMode === 'random' ? '6. ' : '5. '}Styles
                </label>
                <p className="text-xs text-[var(--color-text-dimmer)] mb-2">
                    {options.styleSelectionMode === 'selected'
                        ? 'Select at least one style to generate. One image will be generated per style.'
                        : 'Select styles to include in randomization, or leave blank to use all styles.'}
                </p>
                {options.styleSelectionMode === 'selected' && !options.useCustomStyles && options.styles.length === 0 && (
                    <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            ⚠️ Please select at least one style to continue.
                        </p>
                    </div>
                )}
                {options.styleSelectionMode === 'selected' && options.useCustomStyles && !options.customStyles.trim() && (
                    <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            ⚠️ Please enter at least one custom style to continue.
                        </p>
                    </div>
                )}
                <div className="flex flex-wrap gap-2">
                    {currentStyles.map(style => (
                        <FilterButton
                            key={style.id}
                            label={style.name}
                            isActive={!isCustomActive && options.styles.includes(style.id)}
                            onClick={() => handleToggleStyle(style.id)}
                            title={style.name}
                            buttonDisabled={disabled || isCustomActive}
                        />
                    ))}
                    <FilterButton
                        label="Custom"
                        isActive={isCustomActive}
                        onClick={handleToggleCustomStyles}
                        title="Enter custom style descriptions"
                        buttonDisabled={disabled}
                    />
                </div>
                {isCustomActive && (
                    <div className="mt-3 animate-fade-in">
                        <textarea
                            value={options.customStyles}
                            onChange={handleCustomStylesChange}
                            disabled={disabled}
                            rows={3}
                            className="prompt-textarea w-full bg-[var(--color-bg-base)] border-2 border-[var(--color-border-default)] rounded-lg p-2 text-sm text-[var(--color-text-light)] focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-colors resize-y"
                            placeholder="e.g., Tropical resort style, Cyberpunk aesthetic"
                        />
                    </div>
                )}
            </div>

            {/* Show Unfinished/Before Version */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
                    {options.styleSelectionMode === 'random' ? '7. ' : '6. '}Before/After View
                </label>
                <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Generate styled unfinished/before-renovation versions.</p>
                <div className="flex items-center gap-3">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={options.showUnfinished}
                            onChange={handleShowUnfinishedToggle}
                            disabled={disabled}
                            className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-[var(--color-text-light)]">Show Styled Unfinished State</span>
                    </label>
                </div>
            </div>

            {/* Tidiness Level */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
                    {options.styleSelectionMode === 'random' ? '8. ' : '7. '}Tidiness Level
                </label>
                <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Choose between neat and organized or lived-in appearance.</p>
                <div className="flex flex-wrap gap-2">
                    {TIDY_OPTIONS.map(tidyOption => (
                        <FilterButton
                            key={tidyOption.id}
                            label={tidyOption.name}
                            isActive={options.tidy === tidyOption.id}
                            onClick={() => handleTidyChange(tidyOption.id)}
                            title={tidyOption.name}
                            buttonDisabled={disabled}
                        />
                    ))}
                </div>
            </div>

            {/* Color Scheme */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
                    {options.styleSelectionMode === 'random' ? '9. ' : '8. '}Color Scheme (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                    {COLOR_SCHEMES.map(colorScheme => (
                        <FilterButton
                            key={colorScheme.id}
                            label={colorScheme.name}
                            isActive={options.colorScheme === colorScheme.id}
                            onClick={() => handleColorSchemeChange(colorScheme.id)}
                            title={colorScheme.name}
                            buttonDisabled={disabled}
                        />
                    ))}
                </div>
            </div>

            {/* Time of Day */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
                    {options.styleSelectionMode === 'random' ? '10. ' : '9. '}Time of Day / Lighting
                </label>
                <div className="flex flex-wrap gap-2">
                    {ARCHITECTURE_TIMES.map(time => (
                        <FilterButton
                            key={time.id}
                            label={time.name}
                            isActive={options.time === time.id}
                            onClick={() => handleTimeChange(time.id)}
                            title={time.name}
                            buttonDisabled={disabled}
                        />
                    ))}
                </div>
            </div>

            {/* Theme / Season */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
                    {options.styleSelectionMode === 'random' ? '11. ' : '10. '}Theme / Season
                </label>
                <div className="flex flex-wrap gap-2">
                    {ARCHITECTURE_THEMES.map(theme => (
                        <FilterButton
                            key={theme.id}
                            label={theme.name}
                            isActive={options.theme === theme.id}
                            onClick={() => handleThemeChange(theme.id)}
                            title={theme.name}
                            buttonDisabled={disabled}
                        />
                    ))}
                </div>
            </div>

            {/* Camera Angle */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
                    {options.styleSelectionMode === 'random' ? '12. ' : '11. '}Camera Angle
                </label>
                <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Control how the camera perspective is handled.</p>
                <div className="flex flex-wrap gap-2">
                    {CAMERA_ANGLE_OPTIONS.map(angle => (
                        <FilterButton
                            key={angle.id}
                            label={angle.name}
                            isActive={options.cameraAngle === angle.id}
                            onClick={() => handleCameraAngleChange(angle.id)}
                            title={angle.name}
                            buttonDisabled={disabled}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ArchitectureOptionsPanel;
