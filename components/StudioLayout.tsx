import React from 'react';

interface StudioLayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Shared layout component for all studios with left sidebar
 * Provides centralized control over:
 * - Container max width (max-w-screen-2xl = 1536px)
 * - Sidebar width (300px)
 * - Grid gap (48px / gap-12)
 * - Bottom padding for fixed toolbar (pb-28)
 */
export const StudioLayout: React.FC<StudioLayoutProps> = ({ sidebar, children }) => {
    return (
        <div className="w-full max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 pb-28">
            {/* Left Sidebar (Options Panel) */}
            <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)] flex flex-col items-center gap-6">
                {sidebar}
            </div>

            {/* Right Content (Gallery/Results) */}
            <div>
                {children}
            </div>
        </div>
    );
};

export default StudioLayout;
