// This component will be created in a future step.
// For now, it is a placeholder.
import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import CollapsibleSection from '../help/CollapsibleSection';

interface AdAnalysisCardProps {
    analysis: string;
}

const AdAnalysisCard: React.FC<AdAnalysisCardProps> = ({ analysis }) => {
    return (
        <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl shadow-lg border border-[var(--color-border-muted)]">
            <CollapsibleSection title="10-Point Strategic Analysis" defaultOpen={true}>
                <MarkdownRenderer content={analysis} />
            </CollapsibleSection>
        </div>
    );
};

export default AdAnalysisCard;
