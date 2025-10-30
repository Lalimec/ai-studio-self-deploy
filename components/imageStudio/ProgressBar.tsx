/// <reference lib="dom" />
import React from 'react';

export const ProgressBar: React.FC<{ progress: number; completed: number; total: number }> = ({ progress }) => (
    <div className="w-full my-4">
        <div className="w-full bg-[var(--color-bg-muted)] rounded-full h-2.5 overflow-hidden">
            <div
                className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Generation progress"
            ></div>
        </div>
    </div>
);