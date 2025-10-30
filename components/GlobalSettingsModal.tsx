import React from 'react';
import { CloseIcon } from './Icons';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showBetaFeatures: boolean;
  onToggleBetaFeatures: (enabled: boolean) => void;
}

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose, showBetaFeatures, onToggleBetaFeatures }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in" 
            onClick={onClose}
        >
            <div 
                className="bg-[var(--color-bg-surface)] rounded-2xl shadow-xl w-full max-w-md" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-[var(--color-border-muted)]">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--color-bg-muted)]">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <label htmlFor="beta-features-toggle" className="font-medium text-[var(--color-text-light)]">
                                Show Beta Features
                            </label>
                            <p className="text-sm text-[var(--color-text-dim)]">
                                Access experimental new studios like Ad Cloner.
                            </p>
                        </div>
                        <label htmlFor="beta-features-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                id="beta-features-toggle" 
                                className="sr-only peer" 
                                checked={showBetaFeatures}
                                onChange={(e) => onToggleBetaFeatures(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-[var(--color-bg-muted)] rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--color-primary-ring)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalSettingsModal;