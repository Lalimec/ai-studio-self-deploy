import React, { useState } from 'react';
import { PiWarningIcon, PiSpinnerIcon, PiTrashIcon } from './Icons';

interface GalleryErrorCardProps {
    id: string;
    error: string;
    prompt?: string;
    modelResponse?: string;
    onRetry?: (id: string) => void;
    onRemove: (id: string) => void;
    aspectRatio?: number;
}

export const GalleryErrorCard: React.FC<GalleryErrorCardProps> = ({
    id,
    error,
    prompt,
    modelResponse,
    onRetry,
    onRemove,
    aspectRatio = 0.8
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpansion = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="group relative w-full h-full">
            <div className="h-full p-4 bg-red-900/30 border border-[var(--color-destructive)] rounded-lg flex flex-col items-center justify-center text-center overflow-y-auto custom-scrollbar">
                <PiWarningIcon className="w-8 h-8 text-[var(--color-destructive)] mb-2 flex-shrink-0" />
                <p className="text-sm font-semibold text-[var(--color-text-light)]">Image Failed</p>
                <p className="text-xs text-red-300 mt-1 break-all">{error}</p>

                {prompt && (
                    <div className="mt-2 w-full text-left bg-[var(--color-bg-surface)] p-2 rounded-md border border-[var(--color-border-default)] max-h-24 overflow-y-auto custom-scrollbar flex-shrink-0">
                        <p className="text-xs font-semibold text-[var(--color-text-main)] mb-1">Failed Prompt:</p>
                        <pre className="text-xs text-[var(--color-text-light)] whitespace-pre-wrap font-mono">{prompt}</pre>
                    </div>
                )}

                {isExpanded && modelResponse && (
                    <div className="mt-2 w-full text-left bg-[var(--color-bg-surface)] p-2 rounded-md border border-[var(--color-border-default)] max-h-48 overflow-y-auto custom-scrollbar flex-shrink-0">
                        <p className="text-xs font-semibold text-[var(--color-text-main)] mb-1">Model's Response:</p>
                        <pre className="text-xs text-[var(--color-text-light)] whitespace-pre-wrap font-mono">{modelResponse}</pre>
                    </div>
                )}

                {modelResponse && !isExpanded && (
                    <button
                        onClick={toggleExpansion}
                        className="mt-2 text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text-light)] underline"
                    >
                        Show Details
                    </button>
                )}
            </div>

            <div className="absolute top-2 right-2 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-20">
                {onRetry && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRetry(id); }}
                        className="p-2 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-primary-hover)] focus:opacity-100"
                        aria-label="Retry generation"
                        title="Retry generation"
                    >
                        <PiSpinnerIcon className="w-5 h-5" />
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(id); }}
                    className="p-2 bg-[var(--color-bg-overlay)] text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-destructive-hover)] focus:opacity-100"
                    aria-label="Remove error"
                    title="Remove error"
                >
                    <PiTrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
