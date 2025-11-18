import React from 'react';
import { ArchitectureGenerationOptions } from '../../types';
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

            {/* 2. Style Selection Mode */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">2. Style Selection Mode</label>
                <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Choose how styles are selected for generation.</p>
                <div className="flex flex-wrap gap-2">
                    <FilterButton
                        label="Generate Selected Styles"
                        isActive={options.styleSelectionMode === 'selected'}
                        onClick={() => setOptions(prev => ({ ...prev, styleSelectionMode: 'selected' }))}
                        title="Generate images for each selected style (imageCount × styles)"
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

            {/* 3. Room/Building Type (Optional - Collapsible) */}
            {options.scope === 'interior' && (
                <details className="group">
                    <summary className="block text-sm font-medium text-[var(--color-text-light)] mb-2 cursor-pointer hover:text-[var(--color-primary)]">
                        3. Room Type (Optional - Auto-Detect Available) ▼
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
                        3. Building / Space Type (Optional - Auto-Detect Available) ▼
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

            {/* 4. Styles */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">4. Styles</label>
                <p className="text-xs text-[var(--color-text-dimmer)] mb-2">
                    {options.styleSelectionMode === 'selected'
                        ? 'Select specific styles to generate. Each style will generate the number of images specified above.'
                        : 'Select styles to include in randomization, or leave blank to use all styles.'}
                </p>
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

            {/* 5. Show Unfinished/Before Version */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">5. Before/After View</label>
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

            {/* 6. Tidiness Level */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">6. Tidiness Level</label>
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

            {/* 7. Color Scheme */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">7. Color Scheme (Optional)</label>
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

            {/* 8. Time of Day */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">8. Time of Day / Lighting</label>
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

            {/* 9. Theme / Season */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">9. Theme / Season</label>
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

            {/* 10. Camera Angle */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">10. Camera Angle</label>
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
