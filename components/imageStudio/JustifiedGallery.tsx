/// <reference lib="dom" />
import React, { useState, useEffect, useMemo } from 'react';

interface ImageItem {
    url: string;
    aspectRatio: number;
    key: string;
}

interface JustifiedRow {
    images: ImageItem[];
    height: number;
}

interface JustifiedGalleryProps {
    images: ImageItem[];
    targetRowHeight: number;
    containerWidth: number;
    gap: number;
    renderImage: (item: ImageItem, width: number, height: number) => React.ReactNode;
}

/**
 * Calculates justified gallery layout
 * Algorithm:
 * 1. Try to fit images into rows at target height
 * 2. Calculate total width of row
 * 3. If row is "full", adjust height to make it exactly fit container width
 * 4. Start new row
 */
const calculateJustifiedLayout = (
    images: ImageItem[],
    containerWidth: number,
    targetRowHeight: number,
    gap: number
): JustifiedRow[] => {
    const rows: JustifiedRow[] = [];
    let currentRow: ImageItem[] = [];
    let currentRowWidth = 0;

    images.forEach((image, index) => {
        // Calculate width at target height
        const width = targetRowHeight * image.aspectRatio;

        // Check if adding this image would exceed container width
        const totalGaps = currentRow.length * gap; // gaps between current images + gap before new image
        const wouldExceed = currentRowWidth + width + totalGaps > containerWidth;

        if (wouldExceed && currentRow.length > 0) {
            // Finalize current row with adjusted height
            const totalGapsInRow = (currentRow.length - 1) * gap;
            const availableWidth = containerWidth - totalGapsInRow;
            const currentRowWidthAtTarget = currentRow.reduce((sum, img) => sum + targetRowHeight * img.aspectRatio, 0);
            const adjustedHeight = (availableWidth / currentRowWidthAtTarget) * targetRowHeight;

            rows.push({
                images: [...currentRow],
                height: adjustedHeight
            });

            // Start new row with current image
            currentRow = [image];
            currentRowWidth = width;
        } else {
            // Add to current row
            currentRow.push(image);
            currentRowWidth += width;
        }

        // Handle last image
        if (index === images.length - 1 && currentRow.length > 0) {
            // For last row, use target height (don't stretch to fill)
            rows.push({
                images: [...currentRow],
                height: targetRowHeight
            });
        }
    });

    return rows;
};

export const JustifiedGallery: React.FC<JustifiedGalleryProps> = ({
    images,
    targetRowHeight,
    containerWidth,
    gap,
    renderImage
}) => {
    const rows = useMemo(() => {
        if (containerWidth === 0 || images.length === 0) return [];
        return calculateJustifiedLayout(images, containerWidth, targetRowHeight, gap);
    }, [images, containerWidth, targetRowHeight, gap]);

    return (
        <div className="flex flex-col" style={{ gap: `${gap}px` }}>
            {rows.map((row, rowIndex) => (
                <div
                    key={rowIndex}
                    className="flex flex-row"
                    style={{ gap: `${gap}px` }}
                >
                    {row.images.map((image) => {
                        const width = row.height * image.aspectRatio;
                        return (
                            <div
                                key={image.key}
                                style={{
                                    width: `${width}px`,
                                    height: `${row.height}px`,
                                    flexShrink: 0
                                }}
                            >
                                {renderImage(image, width, row.height)}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

/**
 * Hook to load image dimensions and calculate aspect ratios
 */
export const useImageDimensions = (urls: string[]): Map<string, number> => {
    const [aspectRatios, setAspectRatios] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        const newRatios = new Map<string, number>();
        let loadedCount = 0;

        urls.forEach((url) => {
            // Check if already loaded
            if (aspectRatios.has(url)) {
                newRatios.set(url, aspectRatios.get(url)!);
                loadedCount++;
                if (loadedCount === urls.length) {
                    setAspectRatios(newRatios);
                }
                return;
            }

            // Load image to get dimensions
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                newRatios.set(url, ratio);
                loadedCount++;

                if (loadedCount === urls.length) {
                    setAspectRatios(newRatios);
                }
            };
            img.onerror = () => {
                // Default to 4:5 if image fails to load
                newRatios.set(url, 4 / 5);
                loadedCount++;

                if (loadedCount === urls.length) {
                    setAspectRatios(newRatios);
                }
            };
            img.src = url;
        });
    }, [urls.join(',')]); // Only re-run if URLs change

    return aspectRatios;
};
