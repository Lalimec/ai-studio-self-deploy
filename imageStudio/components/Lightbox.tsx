/// <reference lib="dom" />
import React, { useEffect } from 'react';
import { PiX, PiCaretLeft, PiCaretRight } from 'react-icons/pi';

interface LightboxProps {
    images: string[];
    currentIndex: number | null;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ images, currentIndex, onClose, onNext, onPrev }) => {
    useEffect(() => {
        if (currentIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowRight') {
                onNext();
            } else if (e.key === 'ArrowLeft') {
                onPrev();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [currentIndex, onClose, onNext, onPrev]);

    if (currentIndex === null) return null;

    const imageUrl = images[currentIndex];
    if (!imageUrl) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors z-50"
                aria-label="Close image view"
            >
                <PiX className="w-8 h-8"/>
            </button>

            {/* Previous Button */}
            {currentIndex > 0 && (
                <button
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-50"
                    aria-label="Previous image"
                >
                    <PiCaretLeft className="w-8 h-8" />
                </button>
            )}

            {/* Image */}
            <img 
                src={imageUrl} 
                alt="Enlarged figure view" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image
            />

            {/* Next Button */}
            {currentIndex < images.length - 1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-50"
                    aria-label="Next image"
                >
                    <PiCaretRight className="w-8 h-8" />
                </button>
            )}
        </div>
    );
};