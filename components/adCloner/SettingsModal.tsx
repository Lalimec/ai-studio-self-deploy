import React, { useState } from 'react';
import { AdClonerSettings } from '../../types';
import { CloseIcon } from '../Icons';

type SettingsModalProps = {
    settings: AdClonerSettings;
    onClose: () => void;
    onSave: (newSettings: AdClonerSettings) => void;
};

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onSave }) => {
    const [localSettings, setLocalSettings] = useState(settings);

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };
    
    const RadioButton = ({ value, label, description, disabled = false }: {value: string, label: string, description: string, disabled?: boolean}) => (
        <label className={`block p-4 border rounded-lg transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${localSettings.textModel === value ? 'bg-[var(--color-bg-surface-light)] border-[var(--color-primary)]' : 'bg-[var(--color-bg-surface)] border-[var(--color-border-default)] hover:bg-[var(--color-bg-muted)]'}`}>
            <div className="flex items-center">
                <input
                    type="radio"
                    name="textModel"
                    value={value}
                    checked={localSettings.textModel === value}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, textModel: e.target.value as AdClonerSettings['textModel'] }))}
                    className="h-4 w-4 text-[var(--color-primary)] bg-[var(--color-bg-base)] border-[var(--color-border-default)] focus:ring-[var(--color-primary-ring)]"
                    disabled={disabled}
                />
                <div className="ml-3 text-sm">
                    <p className="font-medium text-[var(--color-text-main)]">{label}</p>
                    <p className="text-[var(--color-text-dim)]">{description}</p>
                </div>
            </div>
        </label>
    );

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--color-bg-surface)] rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-[var(--color-border-muted)]">
                    <h2 className="text-xl font-bold">Ad Cloner Settings</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--color-bg-muted)]"><CloseIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <fieldset>
                        <legend className="text-base font-semibold text-[var(--color-text-light)] mb-2">Text Generation Model</legend>
                        <div className="space-y-3">
                            <RadioButton
                                value="gemini-2.5-flash"
                                label="Gemini 2.5 Flash"
                                description="Fast and cost-effective. Ideal for rapid iteration."
                            />
                            <RadioButton
                                value="gemini-2.5-pro"
                                label="Gemini 2.5 Pro (Coming Soon)"
                                description="More powerful. May yield more creative prompts."
                                disabled={true}
                            />
                        </div>
                    </fieldset>
                </div>
                <div className="flex justify-end p-4 bg-[var(--color-bg-surface-light)] rounded-b-2xl border-t border-[var(--color-border-muted)]">
                    <button onClick={handleSave} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-2 px-6 rounded-lg">Save</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;