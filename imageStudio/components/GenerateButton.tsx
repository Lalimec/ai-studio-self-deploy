

import React from 'react';
import { PiSparkleFill } from 'react-icons/pi';

interface GenerateButtonProps {
    onClick: () => void;
    disabled: boolean;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-lg"
    >
        <PiSparkleFill className="w-6 h-6" />
        Generate Image(s)
    </button>
);