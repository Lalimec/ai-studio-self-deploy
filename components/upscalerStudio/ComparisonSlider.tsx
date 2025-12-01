import React, { useState, useRef, useCallback } from 'react';

interface ComparisonSliderProps {
    originalSrc: string;
    upscaledSrc: string;
    className?: string;
    showLabels?: boolean;
}

/**
 * A before/after comparison slider for comparing original and upscaled images.
 * The slider tracks cursor position to reveal the original image on the left
 * and the upscaled image on the right.
 */
const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
    originalSrc,
    upscaledSrc,
    className = '',
    showLabels = true,
}) => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const updateSliderPosition = useCallback((clientX: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        updateSliderPosition(e.clientX);
    }, [updateSliderPosition]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        updateSliderPosition(e.clientX);
    }, [isDragging, updateSliderPosition]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setIsDragging(true);
        updateSliderPosition(e.touches[0].clientX);
    }, [updateSliderPosition]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return;
        updateSliderPosition(e.touches[0].clientX);
    }, [isDragging, updateSliderPosition]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden select-none ${className}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ cursor: isDragging ? 'grabbing' : 'col-resize' }}
        >
            {/* Upscaled image (background - right side) */}
            <img
                src={upscaledSrc}
                alt="Upscaled"
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
            />

            {/* Original image (foreground - left side, clipped) */}
            <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
            >
                <img
                    src={originalSrc}
                    alt="Original"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{
                        width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%',
                        maxWidth: 'none'
                    }}
                    draggable={false}
                />
            </div>

            {/* Slider line */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 pointer-events-none"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
                {/* Slider handle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                </div>
            </div>

            {/* Labels */}
            {showLabels && (
                <>
                    <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none">
                        Original
                    </div>
                    <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none">
                        Upscaled
                    </div>
                </>
            )}
        </div>
    );
};

export default ComparisonSlider;
