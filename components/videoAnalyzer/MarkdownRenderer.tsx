import React from 'react';

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    // This is a very basic renderer. A more robust solution would use a library
    // like 'marked' or 'react-markdown', but for this scope, we'll do simple replacements.
    const renderContent = () => {
        return content
            .split('\n')
            .map((line, index) => {
                if (line.startsWith('### ')) {
                    return <h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-[var(--color-text-light)]">{line.substring(4)}</h3>;
                }
                if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-xl font-bold mt-6 mb-3 text-[var(--color-primary-accent)]">{line.substring(3)}</h2>;
                }
                if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-2xl font-extrabold mt-8 mb-4">{line.substring(2)}</h1>;
                }
                if (line.startsWith('* ')) {
                    return <li key={index} className="ml-5">{line.substring(2)}</li>;
                }
                 if (line.trim() === '') {
                    return <br key={index} />;
                }
                return <p key={index}>{line}</p>;
            });
    };

    return (
        <div className="prose prose-sm prose-invert max-w-none text-[var(--color-text-dim)]">
            {renderContent()}
        </div>
    );
};

export default MarkdownRenderer;
