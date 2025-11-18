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

            {/* 2. Room/Building Type */}
            {options.scope === 'interior' && (
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">2. Room Type</label>
                    <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Specify what type of interior space this is.</p>
                    <div className="flex flex-wrap gap-2">
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
                </div>
            )}

            {(options.scope === 'exterior' || options.scope === 'facade' || options.scope === 'garden' || options.scope === 'landscape') && (
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">2. Building / Space Type</label>
                    <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Specify what type of building or outdoor space this is.</p>
                    <div className="flex flex-wrap gap-2">
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
                </div>
            )}

            {/* 3. Styles */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">3. Styles</label>
                <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Select styles to apply. Leave all blank for random mix.</p>
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

            {/* 4. Show Unfinished/Before Version */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">4. Before/After View</label>
                <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Generate an unfinished/before-renovation version.</p>
                <div className="flex items-center gap-3">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={options.showUnfinished}
                            onChange={handleShowUnfinishedToggle}
                            disabled={disabled}
                            className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-[var(--color-text-light)]">Show Unfinished/Before State</span>
                    </label>
                </div>
            </div>

            {/* 5. Tidy/Untidy */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">5. Tidiness Level</label>
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

            {/* 6. Color Scheme */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">6. Color Scheme (Optional)</label>
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

            {/* 7. Time of Day */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">7. Time of Day / Lighting</label>
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

            {/* 8. Theme / Season */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">8. Theme / Season</label>
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

            {/* 9. Camera Angle */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">9. Camera Angle</label>
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

            {/* 10. Aspect Ratio */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">10. Generation Aspect Ratio</label>
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

            {/* 11. Number of Images */}
            <div>
                <label htmlFor="image-count-slider" className="block text-sm font-medium text-[var(--color-text-light)] mb-2">11. Number of Images</label>
                <div className="flex items-center gap-4">
                    <input
                        id="image-count-slider"
                        type="range"
                        min="1"
                        max="20"
                        step="1"
                        value={options.imageCount}
                        onChange={handleImageCountChange}
                        disabled={disabled}
                        className="w-full h-2 bg-[var(--color-border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] disabled:opacity-50"
                        title="Select the number of images to generate (1-20)"
                    />
                    <span className="font-semibold text-[var(--color-primary-accent)] w-8 text-center">{options.imageCount}</span>
                </div>
            </div>
        </div>
    );
};

export default ArchitectureOptionsPanel;
