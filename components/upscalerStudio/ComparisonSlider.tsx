import React, { useState, useRef, useCallback } from 'react';

interface ComparisonSliderProps {
    originalSrc: string;
    upscaledSrc: string;
    className?: string;
    showLabels?: boolean;
    /**
     * Display mode:
     * - 'fill': Images fill the container using object-cover (may crop). Use for gallery cards.
     * - 'fit': Images fit within constraints without cropping, container sizes to image. Use for lightbox.
     */
    mode?: 'fill' | 'fit';
}

/**
 * A before/after comparison slider for comparing original and upscaled images.
 * The slider follows the cursor position on hover to reveal the original image on the left
 * and the upscaled image on the right.
 */
const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
    originalSrc,
    upscaledSrc,
    className = '',
    showLabels = true,
    mode = 'fill',
}) => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const updateSliderPosition = useCallback((clientX: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    }, []);

    // Follow cursor on mouse move (no click required)
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        updateSliderPosition(e.clientX);
    }, [updateSliderPosition]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        updateSliderPosition(e.touches[0].clientX);
    }, [updateSliderPosition]);

    // 'fit' mode: Container sizes to the image, image fits without cropping
    if (mode === 'fit') {
        return (
            <div
                ref={containerRef}
                className={`relative inline-block select-none ${className}`}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                style={{ cursor: 'col-resize' }}
            >
                {/* Upscaled image (background - determines container size) */}
                <img
                    src={upscaledSrc}
                    alt="Upscaled"
                    className="block max-w-[90vw] max-h-[85vh] w-auto h-auto"
                    draggable={false}
                />

                {/* Original image (foreground - clipped from right, positioned absolutely) */}
                <img
                    src={originalSrc}
                    alt="Original"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{
                        clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                    }}
                    draggable={false}
                />

                {/* Slider line */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 pointer-events-none"
                    style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                >
                    {/* Slider handle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-300">
                        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    }

    // 'fill' mode (default): Images fill the container using object-cover
    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden select-none ${className}`}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            style={{ cursor: 'col-resize' }}
        >
            {/* Upscaled image (background - full) */}
            <img
                src={upscaledSrc}
                alt="Upscaled"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
            />

            {/* Original image (foreground - clipped from right) */}
            <img
                src={originalSrc}
                alt="Original"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                    clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                }}
                draggable={false}
            />

            {/* Slider line */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 pointer-events-none"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
                {/* Slider handle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-300">
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
