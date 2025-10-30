import React from 'react';

const HelpSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-8">
    <h3 className="text-xl font-bold text-[var(--color-primary-accent)] border-b-2 border-[var(--color-primary)]/30 pb-2 mb-4">{title}</h3>
    <div className="space-y-3 text-[var(--color-text-light)] prose prose-invert prose-sm max-w-none prose-p:my-1 prose-strong:text-[var(--color-text-main)] prose-a:text-[var(--color-primary-accent)]">{children}</div>
  </section>
);

export default HelpSection;