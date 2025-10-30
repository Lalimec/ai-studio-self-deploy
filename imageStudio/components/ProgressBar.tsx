

import React from 'react';

export const ProgressBar: React.FC<{ progress: number; completed: number; total: number }> = ({ progress }) => (
    <div className="w-full my-4">
        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
                className="bg-gradient-to-r from-violet-500 to-sky-500 h-2.5 rounded-full transition-all duration-300 ease-out"
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