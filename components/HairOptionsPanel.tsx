import React from 'react';
import { GenerationOptions, Gender, PoseStyle, ColorOption, AdornmentOption, AspectRatio } from '../types';
import { MALE_HAIRSTYLES, FEMALE_HAIRSTYLES, AVANT_GARDE_HAIRSTYLES, ASPECT_RATIO_OPTIONS } from '../constants';

interface OptionsPanelProps {
  options: GenerationOptions;
  setOptions: React.Dispatch<React.SetStateAction<GenerationOptions>>;
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

const CustomizableSection: React.FC<{
    title: string;
    optionKey: keyof GenerationOptions;
    categories: { name: string }[];
    placeholder: string;
    options: GenerationOptions;
    setOptions: React.Dispatch<React.SetStateAction<GenerationOptions>>;
    disabled: boolean;
    helpText?: string;
}> = ({ title, optionKey, categories, placeholder, options, setOptions, disabled, helpText }) => {
    let customKey: keyof GenerationOptions, useCustomKey: keyof GenerationOptions;
    if (optionKey === 'hairstyleCategories') {
        customKey = 'customHairstyles';
        useCustomKey = 'useCustomHairstyles';
    } else if (optionKey === 'colorOptions') {
        customKey = 'customHairColors';
        useCustomKey = 'useCustomHairColors';
    } else if (optionKey === 'poseOptions') {
        customKey = 'customPoses';
        useCustomKey = 'useCustomPoses';
    } else { // adornmentOptions
        customKey = 'customAdornments';
        useCustomKey = 'useCustomAdornments';
    }

    const handleToggleCategory = (categoryName: string) => {
        setOptions(prev => {
            const currentCategories = prev[optionKey] as string[];
            const newCategories = currentCategories.includes(categoryName)
                ? currentCategories.filter(c => c !== categoryName)
                : [...currentCategories, categoryName];
            
            return { ...prev, [optionKey]: newCategories, [useCustomKey]: false };
        });
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value } = e.target;
        setOptions(prev => ({
            ...prev,
            [customKey]: value,
            [optionKey]: [],
            [useCustomKey]: true,
        }));
    };

    const handleToggleCustomInput = () => {
        setOptions(prev => {
            const isActivatingCustom = !(prev[useCustomKey] as boolean);
            if (isActivatingCustom) {
                return { ...prev, [useCustomKey]: true, [optionKey]: [] };
            } else {
                return { ...prev, [useCustomKey]: false };
            }
        });
    };

    const isCustomActive = options[useCustomKey] as boolean;
    const customValue = options[customKey] as string;

    const getShortLabel = (label: string) => {
        if (label === PoseStyle.Static) return 'Static';
        if (label === PoseStyle.Random) return 'Random';
        return label;
    };

    return (
        <div>
            <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">{title}</label>
            {helpText && <p className="text-xs text-[var(--color-text-dimmer)] mb-2">{helpText}</p>}
            <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                    <FilterButton
                        key={cat.name}
                        label={getShortLabel(cat.name)}
                        isActive={!isCustomActive && (options[optionKey] as string[]).includes(cat.name)}
                        onClick={() => handleToggleCategory(cat.name)}
                        title={`Toggle ${cat.name} category`}
                        buttonDisabled={disabled || isCustomActive}
                    />
                ))}
                <FilterButton
                    label="Custom"
                    isActive={isCustomActive}
                    onClick={handleToggleCustomInput}
                    title="Enter a custom comma-separated list"
                    buttonDisabled={disabled}
                />
            </div>
            {isCustomActive && (
                <div className="mt-3 animate-fade-in">
                    <textarea
                        value={customValue}
                        onChange={handleCustomChange}
                        disabled={disabled}
                        rows={3}
                        className="prompt-textarea w-full bg-[var(--color-bg-base)] border-2 border-[var(--color-border-default)] rounded-lg p-2 text-sm text-[var(--color-text-light)] focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-colors resize-y"
                        placeholder={placeholder}
                    />
                </div>
            )}
        </div>
    );
};


const HairOptionsPanel: React.FC<OptionsPanelProps> = ({ options, setOptions, disabled }) => {

  const handleGenderChange = (gender: Gender) => {
    setOptions(prev => ({ 
        ...prev, 
        gender, 
        hairstyleCategories: [],
        adornmentOptions: [AdornmentOption.Original],
        customAdornments: '',
        useCustomAdornments: false,
    }));
  };

  const toggleKeepOriginalHairstyle = () => {
    setOptions(prev => {
      const isActivating = !prev.keepOriginalHairstyle;
      return {
        ...prev,
        keepOriginalHairstyle: isActivating,
        hairstyleCategories: isActivating ? [] : prev.hairstyleCategories,
        useCustomHairstyles: isActivating ? false : prev.useCustomHairstyles,
      };
    });
  };

  const handleImageCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOptions(prev => ({ ...prev, imageCount: parseInt(e.target.value, 10) }));
  };
  
  const genderSpecificCategories = options.gender === Gender.Male ? MALE_HAIRSTYLES : FEMALE_HAIRSTYLES;
  const allHairstyleCategories = [...genderSpecificCategories, AVANT_GARDE_HAIRSTYLES];
  const adornmentTitle = options.gender === Gender.Male ? "4. Facial Hair" : "4. Accessories";
  const adornmentPlaceholder = options.gender === Gender.Male ? "e.g., Van Dyke, Walrus Moustache" : "e.g., Aviator Sunglasses, Pearl Necklace";
  const adornmentCategories = [{ name: AdornmentOption.Original }, { name: AdornmentOption.Random }];
  const poseCategories = [{ name: PoseStyle.Static }, { name: PoseStyle.Random }];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">1. Subject</label>
        <div className="grid grid-cols-2 gap-2">
            <FilterButton label="Female" isActive={options.gender === Gender.Female} onClick={() => handleGenderChange(Gender.Female)} title="Set subject to Female" buttonDisabled={disabled}/>
            <FilterButton label="Male" isActive={options.gender === Gender.Male} onClick={() => handleGenderChange(Gender.Male)} title="Set subject to Male" buttonDisabled={disabled}/>
        </div>
      </div>
        
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">2. Hairstyle Options</label>
        <p className="text-xs text-[var(--color-text-dimmer)] mb-2">Select "Keep Original" for color changes only, or select/add styles below.</p>
        <div className="flex flex-wrap gap-2 mb-3">
             <FilterButton 
                label="Keep Original"
                isActive={options.keepOriginalHairstyle}
                onClick={toggleKeepOriginalHairstyle}
                title="Only change the color of the original hairstyle"
                className={options.keepOriginalHairstyle ? 'border-2 border-white' : 'border-2 border-[var(--color-border-secondary-alpha-50)]'}
                buttonDisabled={disabled}
            />
        </div>
        {!options.keepOriginalHairstyle && 
            <CustomizableSection
                title=""
                optionKey="hairstyleCategories"
                categories={allHairstyleCategories}
                placeholder="e.g., Cyberpunk Braids, Long Surfer Hair"
                options={options}
                setOptions={setOptions}
                disabled={disabled || options.keepOriginalHairstyle}
                helpText="Leave all blank to use a random mix."
            />
        }
      </div>
      
      <CustomizableSection
        title="3. Hair Color"
        optionKey="colorOptions"
        categories={Object.values(ColorOption).map(c => ({ name: c }))}
        placeholder="e.g., midnight blue, pastel pink with lilac highlights"
        options={options}
        setOptions={setOptions}
        disabled={disabled}
      />
      
      <CustomizableSection
        title={adornmentTitle}
        optionKey="adornmentOptions"
        categories={adornmentCategories}
        placeholder={adornmentPlaceholder}
        options={options}
        setOptions={setOptions}
        disabled={disabled}
      />
      
       <CustomizableSection
        title="5. Pose Preference"
        optionKey="poseOptions"
        categories={poseCategories}
        placeholder="e.g., looking over the shoulder, head tilted"
        options={options}
        setOptions={setOptions}
        disabled={disabled}
      />

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">6. Generation Aspect Ratio</label>
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

      <div>
        <label htmlFor="image-count-slider" className="block text-sm font-medium text-[var(--color-text-light)] mb-2">7. Number of Images</label>
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

export default HairOptionsPanel;
