import React from 'react';
import { VideoAnalyzerSettings, AnalysisModel } from '../../types';
import { analysisModels } from '../../constants';

interface AnalysisSettingsProps {
    settings: VideoAnalyzerSettings;
    onSettingsChange: (newSettings: React.SetStateAction<VideoAnalyzerSettings>) => void;
    disabled: boolean;
    onLoadMockData: () => void;
}

const AnalysisSettings: React.FC<AnalysisSettingsProps> = ({ settings, onSettingsChange, disabled, onLoadMockData }) => {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <label htmlFor="analysis-model" className="block text-sm font-medium text-[var(--color-text-light)]">Analysis Model</label>
                <select
                    id="analysis-model"
                    value={settings.analysisModel}
                    onChange={e => onSettingsChange(s => ({ ...s, analysisModel: e.target.value as AnalysisModel }))}
                    disabled={disabled}
                    className="mt-1 block w-full rounded-md bg-[var(--color-bg-base)] border-[var(--color-border-default)] shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-ring)] sm:text-sm disabled:opacity-50"
                >
                    {analysisModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div className="border-t border-[var(--color-border-muted)] pt-4">
                 <h3 className="text-sm font-medium text-[var(--color-text-light)] mb-2">Developer Tools</h3>
                 <button
                    onClick={onLoadMockData}
                    disabled={disabled}
                    className="bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg w-full disabled:opacity-50"
                >
                    Load Mock Analysis
                </button>
                 <p className="text-xs text-[var(--color-text-dimmer)] mt-2">For testing, this loads a pre-analyzed video result without using the API.</p>
            </div>
        </div>
    );
};

export default AnalysisSettings;
