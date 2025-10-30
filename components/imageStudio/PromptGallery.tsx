/// <reference lib="dom" />
import React, { useState } from 'react';
import { PiCheckIcon } from '../Icons';
import { PromptPreset } from '../../types';

interface PromptGalleryProps {
    prompts: PromptPreset[];
}

export const PromptGallery: React.FC<PromptGalleryProps> = ({ prompts }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (prompt: PromptPreset) => {
        navigator.clipboard.writeText(prompt.content);
        setCopiedId(prompt.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <section className="w-full bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)]">
            <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-4 text-center">Prompt Gallery</h2>
            <p className="text-center text-[var(--color-text-dim)] mb-6 max-w-2xl mx-auto">Need inspiration? Click on a prompt's text to copy it and paste it into a prompt box above.</p>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
                {prompts.map((prompt) => (
                    <div key={prompt.id} className="bg-[var(--color-bg-surface-light)] p-5 rounded-lg shadow-sm border border-[var(--color-border-default)] flex flex-col mb-6 break-inside-avoid">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-[var(--color-text-light)]">{prompt.name}</h3>
                            {copiedId === prompt.id && (
                                <span className="text-sm font-medium text-[var(--color-success-accent)] flex items-center gap-1 transition-opacity duration-300">
                                    <PiCheckIcon className="w-4 h-4" /> Copied!
                                </span>
                            )}
                        </div>
                        <p 
                            onClick={() => handleCopy(prompt)}
                            className="text-sm text-[var(--color-text-dim)] flex-grow cursor-pointer p-2 -m-2 rounded-md hover:bg-[var(--color-bg-muted-hover)]/50 transition-colors"
                        >
                            {prompt.content}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
};