import React from 'react';
import { ArchitectureGenerationOptions } from '../../types';
import {
    ARCHITECTURE_SCOPES,
    INTERIOR_STYLES,
    EXTERIOR_STYLES,
    FACADE_STYLES,
    GARDEN_STYLES,
    LANDSCAPE_STYLES,
    ROOM_TYPES,
    BUILDING_TYPES,
    ARCHITECTURE_TIMES,
    ARCHITECTURE_THEMES,
    CAMERA_ANGLE_OPTIONS,
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
    title?: string;
    buttonDisabled: boolean;
}> = ({ label, isActive, onClick, title, buttonDisabled }) => (
    <button
        onClick={onClick}
        disabled={buttonDisabled}
        title={title}
        className={`py-2 px-3 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
            // Reset room/building type when changing scope
            roomType: 'none',
            buildingType: 'none',
            // Reset styles when changing scope to avoid incompatible styles
            styles: [],
            customStyles: '',
            useCustomStyles: false,
        }));
    };

    const handleToggleStyle = (styleId: string) => {
        setOptions(prev => {
            const newStyles = prev.styles.includes(styleId)
                ? prev.styles.filter(s => s !== styleId)
                : [...prev.styles, styleId];
            return { ...prev, styles: newStyles };
        });
    };

    const handleToggleCustomStyles = () => {
        setOptions(prev => ({ ...prev, useCustomStyles: !prev.useCustomStyles }));
    };

    const handleCustomStylesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setOptions(prev => ({ ...prev, customStyles: e.target.value }));
    };

    const handleTimeChange = (timeId: string) => {
        setOptions(prev => ({ ...prev, time: timeId }));
    };

    const handleThemeChange = (themeId: string) => {
        setOptions(prev => ({ ...prev, theme: themeId }));
    };

    const handleColorSchemeChange = (colorSchemeId: string) => {
        setOptions(prev => ({ ...prev, colorScheme: colorSchemeId }));
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

    const handleTidyChange = (tidyId: string) => {
        setOptions(prev => ({ ...prev, tidy: tidyId }));
    };

    const currentStyles = getStylesForScope(options.scope);
    const isCustomActive = options.useCustomStyles;

    return (
        <div className="space-y-6">
            {/* 1. Architectural Scope */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">1. Architectural Scope</label>
                <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Choose the type of space to transform.</p>
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

            {/* 2. Room/Building Type (Optional - Collapsible) */}
            {options.scope === 'interior' && (
                <details className="group">
                    <summary className="block text-sm font-medium text-[var(--color-text-light)] mb-2 cursor-pointer hover:text-[var(--color-primary)]">
                        2. Room Type (Optional - Auto-Detect Available) ▼
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
                        2. Building / Space Type (Optional - Auto-Detect Available) ▼
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

            {/* 3. Styles */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">3. Styles</label>
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

            {/* 4. Tidiness Level */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">4. Tidiness Level</label>
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

            {/* 5. Color Scheme */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">5. Color Scheme (Optional)</label>
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

            {/* 6. Time of Day */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">6. Time of Day / Lighting</label>
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

            {/* 7. Theme / Season */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">7. Theme / Season</label>
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

            {/* 8. Camera Angle */}
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">8. Camera Angle</label>
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
