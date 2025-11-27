/// <reference lib="dom" />
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getAspectRatio, setAspectRatio as cacheAspectRatio, hasAspectRatio } from '../../services/imageAspectRatioCache';

interface ImageItem {
    url: string;
    aspectRatio: number;
    key: string;
}

type ContainerType = 'portrait' | 'square' | 'landscape';

interface ContainerInfo {
    type: ContainerType;
    slots: number;
    aspectRatio: number;
}

interface ImageWithContainer extends ImageItem {
    container: ContainerInfo;
}

interface JustifiedRow {
    images: ImageWithContainer[];
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
 * Categorize image into container type based on aspect ratio
 */
const getContainerType = (aspectRatio: number): ContainerInfo => {
    // Portrait: aspect ratio <= 0.81 (taller than or equal to ~4:5)
    // We use 0.81 to include 4:5 (0.8) and account for minor floating point differences
    if (aspectRatio <= 0.81) {
        return {
            type: 'portrait',
            slots: 2,
            aspectRatio: 4 / 5  // 4:5 container
        };
    }
    // Landscape: aspect ratio > 1.2 (wider than 6:5)
    else if (aspectRatio > 1.2) {
        return {
            type: 'landscape',
            slots: 4,
            aspectRatio: 3 / 2  // 3:2 container
        };
    }
    // Square: everything in between
    else {
        return {
            type: 'square',
            slots: 3,
            aspectRatio: 1  // 1:1 container
        };
    }
};

/**
 * 12-Slot Grid System with Fixed Container Aspect Ratios
 * Algorithm:
 * 1. Categorize each image into Portrait (2 slots), Square (3 slots), or Landscape (4 slots)
 * 2. Pack images left-to-right until slot count would exceed 12
 * 3. Start new row
 * 4. Calculate slot width dynamically to minimize gaps
 * 5. All rows have fixed height (280px default)
 */
const calculateJustifiedLayout = (
    images: ImageItem[],
    containerWidth: number,
    targetRowHeight: number,
    gap: number
): JustifiedRow[] => {
    const SLOTS_PER_ROW = 12;

    // Add container info to each image
    const imagesWithContainers: ImageWithContainer[] = images.map(img => ({
        ...img,
        container: getContainerType(img.aspectRatio)
    }));

    const rows: JustifiedRow[] = [];
    let currentRow: ImageWithContainer[] = [];
    let currentSlots = 0;

    imagesWithContainers.forEach((image, index) => {
        const imageSlots = image.container.slots;

        // Check if adding this image would exceed slot limit
        const wouldExceed = currentSlots + imageSlots > SLOTS_PER_ROW;

        if (wouldExceed && currentRow.length > 0) {
            // Finalize current row
            rows.push({
                images: [...currentRow],
                height: targetRowHeight
            });

            // Start new row with current image
            currentRow = [image];
            currentSlots = imageSlots;
        } else {
            // Add to current row
            currentRow.push(image);
            currentSlots += imageSlots;
        }

        // Handle last image
        if (index === imagesWithContainers.length - 1 && currentRow.length > 0) {
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
            {rows.map((row, rowIndex) => {
                // Calculate slot width for this row
                const totalSlots = row.images.reduce((sum, img) => sum + img.container.slots, 0);
                const totalGaps = (row.images.length - 1) * gap;
                const availableWidth = containerWidth - totalGaps;
                const slotWidth = availableWidth / 12; // Always 12 slots per row width

                return (
                    <div
                        key={rowIndex}
                        className="flex flex-row"
                        style={{ gap: `${gap}px` }}
                    >
                        {row.images.map((image) => {
                            // Calculate container dimensions based on slots
                            const width = slotWidth * image.container.slots;
                            const height = row.height;

                            return (
                                <div
                                    key={image.key}
                                    style={{
                                        width: `${width}px`,
                                        height: `${height}px`,
                                        flexShrink: 0,
                                        overflow: 'hidden'
                                    }}
                                >
                                    {renderImage(image, width, height)}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

/**
 * Hook to load image dimensions and calculate aspect ratios
 * OPTIMIZED: Uses global cache to persist across component unmounts and tab switches
 */
export const useImageDimensions = (urls: string[]): Map<string, number> => {
    // Initialize state from global cache
    const [aspectRatios, setAspectRatios] = useState<Map<string, number>>(() => {
        const initial = new Map<string, number>();
        urls.forEach(url => {
            const cached = getAspectRatio(url);
            if (cached !== undefined) {
                initial.set(url, cached);
            }
        });
        return initial;
    });

    // Use ref to track which URLs are already loading to avoid duplicate requests
    const loadingUrlsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Load each URL that isn't already in global cache or currently loading
        urls.forEach((url) => {
            // Skip if already in global cache
            if (hasAspectRatio(url)) {
                // Update local state if not already present
                setAspectRatios(prev => {
                    if (!prev.has(url)) {
                        const next = new Map(prev);
                        next.set(url, getAspectRatio(url)!);
                        return next;
                    }
                    return prev;
                });
                return;
            }

            // Skip if already loading
            if (loadingUrlsRef.current.has(url)) return;

            // Mark as loading
            loadingUrlsRef.current.add(url);

            // Load image to get dimensions
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                // Store in global cache
                cacheAspectRatio(url, ratio);
                // Update local state
                setAspectRatios(prev => {
                    const next = new Map(prev);
                    next.set(url, ratio);
                    return next;
                });
            };
            img.onerror = () => {
                // Default to 4:5 if image fails to load
                const defaultRatio = 4 / 5;
                cacheAspectRatio(url, defaultRatio);
                setAspectRatios(prev => {
                    const next = new Map(prev);
                    next.set(url, defaultRatio);
                    return next;
                });
            };
            img.src = url;
        });
    }, [urls.join(',')]); // Only re-run when URLs change

    return aspectRatios;
};
