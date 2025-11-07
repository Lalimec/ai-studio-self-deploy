// This component will be created in a future step.
// For now, it is a placeholder.
import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { PrepareMagicIcon } from '../Icons';

interface ConceptApproachCardProps {
    approaches: string;
    onGenerate: (approach: string) => void;
    generatingApproach: string | null;
}

const ConceptApproachCard: React.FC<ConceptApproachCardProps> = ({ approaches, onGenerate, generatingApproach }) => {

    const approachSections = approaches.split(/\n(?=###\s)/).map(section => {
        const titleMatch = section.match(/###\s(.*?)\n/);
        const title = titleMatch ? titleMatch[1] : 'Concept';
        return { title, content: section };
    });

    return (
        <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl shadow-lg border border-[var(--color-border-muted)]">
            <h2 className="text-xl font-bold mb-4">Static Concept Approaches</h2>
            {approachSections.map((approach, index) => (
                <div key={index} className="mb-4 border-b border-[var(--color-border-muted)] pb-4 last:border-b-0 last:pb-0">
                    <MarkdownRenderer content={approach.content} />
                    <button
                        onClick={() => onGenerate(approach.title)}
                        disabled={!!generatingApproach}
                        className="mt-3 flex items-center justify-center gap-2 bg-[var(--color-action-generate)] hover:bg-[var(--color-action-generate-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
                    >
                        <PrepareMagicIcon className={`w-4 h-4 ${generatingApproach === approach.title ? 'animate-spin' : ''}`} />
                        {generatingApproach === approach.title ? 'Generating...' : `Generate This Concept`}
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ConceptApproachCard;
