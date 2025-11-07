// This component will be created in a future step.
// For now, it is a placeholder.
import React from 'react';
import { PiSparkleIcon } from '../Icons';

interface AnalysisErrorCardProps {
    rawResponse: string;
    onRetry: () => void;
    isRetrying: boolean;
}

const AnalysisErrorCard: React.FC<AnalysisErrorCardProps> = ({ rawResponse, onRetry, isRetrying }) => {
    return (
        <div className="bg-red-900/30 border border-[var(--color-destructive)] text-red-300 p-4 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Analysis Parsing Failed</h3>
            <p className="text-sm mb-4">The AI's response was not in a valid JSON format. You can inspect the raw output below and retry the analysis.</p>
            <button
                onClick={onRetry}
                disabled={isRetrying}
                className="mb-4 flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
                <PiSparkleIcon className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : 'Retry Analysis'}
            </button>
            <details>
                <summary className="cursor-pointer text-sm font-semibold">View Raw AI Response</summary>
                <pre className="mt-2 p-3 bg-[var(--color-bg-base)] text-xs text-gray-400 rounded-md overflow-auto custom-scrollbar">
                    <code>{rawResponse}</code>
                </pre>
            </details>
        </div>
    );
};

export default AnalysisErrorCard;