import React from 'react';
import { BabyGenerationOptions, BabyAge, BabyGender } from '../../types';
import {
    BABY_COMPOSITIONS,
    BABY_BACKGROUNDS,
    BABY_CLOTHING_STYLES_UNISEX,
    BABY_CLOTHING_STYLES_BOY,
    BABY_CLOTHING_STYLES_GIRL,
    BABY_ACTIONS
} from '../../constants';

interface BabyOptionsPanelProps {
  options: BabyGenerationOptions;
  setOptions: React.Dispatch<React.SetStateAction<BabyGenerationOptions>>;
  disabled: boolean;
}

const FilterButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  title?: string;
  buttonDisabled?: boolean;
}> = ({ label, isActive, onClick, title, buttonDisabled }) => (
  <button
    onClick={onClick}
    disabled={buttonDisabled}
    title={title}
    className={`py-2 px-3 rounded-md font-semibold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
      isActive ? 'bg-[var(--color-secondary)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)]'
    }`}
  >
    {label}
  </button>
);

const BabyOptionsPanel: React.FC<BabyOptionsPanelProps> = ({ options, setOptions, disabled }) => {
  
    type CustomizableOptionKey = 'composition' | 'background' | 'clothing' | 'action';

    interface CustomizableSectionProps {
        title: string;
        optionKey: CustomizableOptionKey;
        categories: { name: string }[];
        placeholder: string;
    }

    const CustomizableSection: React.FC<CustomizableSectionProps> = ({ title, optionKey, categories, placeholder }) => {
        const key = optionKey;
        const customKey = `custom${key.charAt(0).toUpperCase() + key.slice(1)}${key === 'background' ? 's' : ''}` as keyof BabyGenerationOptions;
        const useCustomKey = `useCustom${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof BabyGenerationOptions;
        
        const handleToggleCategory = (categoryName: string) => {
            setOptions(prev => {
                const currentCategories = prev[key] as string[];
                const newCategories = currentCategories.includes(categoryName)
                    ? currentCategories.filter(c => c !== categoryName)
                    : [...currentCategories, categoryName];
                
                return { ...prev, [key]: newCategories, [useCustomKey]: false };
            });
        };

        const handleCustomChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const { value } = e.target;
            setOptions(prev => ({
                ...prev,
                [customKey]: value,
                [key]: [],
                [useCustomKey]: true,
            }));
        };

        const handleToggleCustomInput = () => {
            setOptions(prev => {
                const isActivatingCustom = !(prev[useCustomKey] as boolean);
                if (isActivatingCustom) {
                    return { ...prev, [useCustomKey]: true, [key]: [] };
                } else {
                    return { ...prev, [useCustomKey]: false };
                }
            });
        };

        const isCustomActive = options[useCustomKey] as boolean;
        const customValue = options[customKey] as string;

        return (
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">{title}</label>
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <FilterButton
                            key={cat.name}
                            label={cat.name}
                            isActive={!isCustomActive && (options[key] as string[]).includes(cat.name)}
                            onClick={() => handleToggleCategory(cat.name)}
                            title={`Toggle ${cat.name} category`}
                            buttonDisabled={disabled || isCustomActive}
                        />
                    ))}
                    <FilterButton
                        label="Custom"
                        isActive={isCustomActive}
                        onClick={handleToggleCustomInput}
                        title={`Enter a custom list of ${key}s`}
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

    const handleGenderChange = (gender: BabyGender) => {
        setOptions(prev => ({ ...prev, gender, clothing: [], customClothing: '', useCustomClothing: false }));
    };

    const handleAgeChange = (age: BabyAge) => {
        setOptions(prev => ({ ...prev, age }));
    };

    let clothingCategoriesToShow: { name: string }[] = [];
    if (options.gender === BabyGender.Boy) {
        clothingCategoriesToShow = [...BABY_CLOTHING_STYLES_UNISEX, ...BABY_CLOTHING_STYLES_BOY];
    } else if (options.gender === BabyGender.Girl) {
        clothingCategoriesToShow = [...BABY_CLOTHING_STYLES_UNISEX, ...BABY_CLOTHING_STYLES_GIRL];
    } else { // Surprise Me
        clothingCategoriesToShow = [...BABY_CLOTHING_STYLES_UNISEX, ...BABY_CLOTHING_STYLES_BOY, ...BABY_CLOTHING_STYLES_GIRL];
    }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">1. Baby's Gender</label>
        <div className="flex flex-wrap gap-2">
            {Object.values(BabyGender).map(gender => (
                <FilterButton 
                    key={gender} 
                    label={gender} 
                    isActive={options.gender === gender} 
                    onClick={() => handleGenderChange(gender)} 
                    title={`Set baby's gender to ${gender}`}
                    buttonDisabled={disabled}
                />
            ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-light)] mb-2">2. Baby's Age</label>
        <div className="flex flex-wrap gap-2">
            {Object.values(BabyAge).map(age => (
                <FilterButton 
                    key={age} 
                    label={age} 
                    isActive={options.age === age} 
                    onClick={() => handleAgeChange(age)} 
                    title={`Set baby's age to ${age}`}
                    buttonDisabled={disabled}
                />
            ))}
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-dimmer)] !mt-2">Leave categories blank to randomize from all options.</p>
      
      <CustomizableSection 
        title="3. Composition"
        optionKey="composition"
        categories={BABY_COMPOSITIONS}
        placeholder="e.g., in a basket, held by a sibling"
      />
      
      <CustomizableSection 
        title="4. Background / Setting"
        optionKey="background"
        categories={BABY_BACKGROUNDS}
        placeholder="e.g., on the moon, in a candy land"
      />
      
      <CustomizableSection 
        title="5. Clothing Style"
        optionKey="clothing"
        categories={clothingCategoriesToShow}
        placeholder="e.g., tiny tuxedo, little astronaut suit"
      />
      
      <CustomizableSection
        title="6. Action / Expression"
        optionKey="action"
        categories={BABY_ACTIONS}
        placeholder="e.g., riding a tricycle, conducting an orchestra"
      />
    </div>
  );
};

export default BabyOptionsPanel;