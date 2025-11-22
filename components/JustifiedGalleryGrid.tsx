/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { DisplayImage } from '../types';
import { JustifiedGallery, useImageDimensions } from './imageStudio/JustifiedGallery';
import {
    DownloadIcon,
    RegenerateIcon,
    TrashIcon,
    PrepareMagicIcon,
    CheckCircleIcon,
    VideoIcon,
    AlertCircleIcon,
    PiCubeIcon,
    DepthMapIcon
} from './Icons';

interface JustifiedGalleryGridProps {
    images: DisplayImage[];
    pendingCount: number;
    pendingAspectRatio?: string; // Aspect ratio for pending placeholders (e.g., "1:1", "4:5", "16:9", "auto")
    onImageClick: (id: string) => void;
    onRegenerate?: (id: string) => void;
    onRemove: (id: string) => void;
    onReprepare?: (id: string) => void;
    onDownloadSingle: (id: string) => void;
    onGenerateSingleVideo?: (id: string) => void;
    onGenerateDepthMap?: (id: string) => void;
    emptyStateIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    emptyStateTitle?: string;
    emptyStateDescription?: string;
    showVideoActions?: boolean;
    // Progress tracking (optional)
    progressCompleted?: number;
    progressTotal?: number;
}

/**
 * Helper function to convert aspect ratio string to number
 * @param aspectRatio - String like "1:1", "4:5", "16:9", "auto"
 * @returns Numeric aspect ratio (width/height)
 */
const parseAspectRatio = (aspectRatio?: string): number => {
    if (!aspectRatio || aspectRatio === 'auto') {
        return 1; // Default to square for auto
    }

    const parts = aspectRatio.split(':');
    if (parts.length === 2) {
        const width = parseFloat(parts[0]);
        const height = parseFloat(parts[1]);
        if (!isNaN(width) && !isNaN(height) && height !== 0) {
            return width / height;
        }
    }

    return 1; // Fallback to square
};

export const JustifiedGalleryGrid: React.FC<JustifiedGalleryGridProps> = ({
    images,
    pendingCount,
    pendingAspectRatio,
    onImageClick,
    onRegenerate,
    onRemove,
    onReprepare,
    onDownloadSingle,
    onGenerateSingleVideo,
    onGenerateDepthMap,
    emptyStateIcon: EmptyIcon,
    emptyStateTitle = "Gallery is Empty",
    emptyStateDescription = "Your generated images will appear here.",
    showVideoActions = true,
    progressCompleted,
    progressTotal,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number | null>(null);

    // Measure container width - use ref callback for immediate measurement
    const measureWidth = React.useCallback((node: HTMLDivElement | null) => {
        if (node) {
            // Immediate measurement
            const width = node.offsetWidth;
            if (width > 0) {
                setContainerWidth(width);
            }
        }
    }, []);

    // Also use ResizeObserver for dynamic resizing
    useEffect(() => {
        if (!containerRef.current) return;

        const updateWidth = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                if (width > 0) {
                    setContainerWidth(width);
                }
            }
        };

        // Ensure we have an initial measurement
        updateWidth();

        const resizeObserver = new ResizeObserver(updateWidth);
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // Extract image URLs and load aspect ratios
    const imageUrls = images.map(img => img.src);
    const aspectRatios = useImageDimensions(imageUrls);

    // Check if all aspect ratios have loaded
    const allAspectRatiosLoaded = imageUrls.length === 0 || imageUrls.every(url => aspectRatios.has(url));

    // Empty state
    if (images.length === 0 && pendingCount === 0) {
        const IconComponent = EmptyIcon || PiCubeIcon;
        return (
            <div className="col-span-full flex flex-col items-center justify-center text-center p-10 rounded-lg min-h-[500px]">
                <div className="text-center">
                    <IconComponent className="mx-auto h-24 w-24 text-[var(--color-border-default)] opacity-75"/>
                    <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-light)]">{emptyStateTitle}</h3>
                    <p className="mt-1 text-sm text-[var(--color-text-dimmer)]">{emptyStateDescription}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Progress Indicator */}
            {pendingCount > 0 && (
                <div className="mb-4 flex items-center justify-center gap-3 p-3 bg-[var(--color-bg-surface-light)] rounded-lg text-sm text-[var(--color-text-light)]">
                    <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                    <span>
                        Generating {pendingCount} image(s)...
                        {progressCompleted !== undefined && progressTotal !== undefined && (
                            <> ({progressCompleted}/{progressTotal} completed)</>
                        )}
                    </span>
                </div>
            )}

            {/* Loading Indicator for Aspect Ratios */}
            {!allAspectRatiosLoaded && images.length > 0 && (
                <div className="mb-4 flex items-center justify-center gap-3 p-3 bg-[var(--color-bg-surface-light)] rounded-lg text-sm text-[var(--color-text-light)]">
                    <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                    <span>Preparing gallery...</span>
                </div>
            )}

            {/* Gallery */}
            <div
                ref={(node) => {
                    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                    measureWidth(node);
                }}
                className="w-full overflow-y-auto overflow-x-hidden min-h-0"
            >
                {containerWidth !== null && containerWidth > 0 && allAspectRatiosLoaded && (
                    <JustifiedGallery
                    images={[
                        // Pending placeholders FIRST - use generation aspect ratio
                        ...Array.from({ length: pendingCount }, (_, i) => ({
                            url: `pending:${i}`,
                            aspectRatio: parseAspectRatio(pendingAspectRatio),
                            key: `pending-${i}`
                        })),
                        // Actual images
                        ...images.map(img => ({
                            url: img.src,
                            aspectRatio: aspectRatios.get(img.src) || 4/5,
                            key: 'id' in img ? img.id : img.filename
                        }))
                    ]}
                    targetRowHeight={280}
                    containerWidth={containerWidth}
                    gap={16}
                    renderImage={(item, width, height) => {
                        // Render pending placeholder
                        if (item.url.startsWith('pending:')) {
                            return (
                                <div className="w-full h-full bg-[var(--color-bg-muted)] rounded-lg flex items-center justify-center animate-pulse">
                                    <PiCubeIcon className="w-10 h-10 text-[var(--color-text-dimmer)] opacity-50" />
                                </div>
                            );
                        }

                        // Find the actual image
                        const image = images.find(img =>
                            ('id' in img ? img.id : img.filename) === item.key
                        );

                        if (!image) return null;

                        return <ImageCard
                            image={image}
                            onImageClick={onImageClick}
                            onRegenerate={onRegenerate}
                            onRemove={onRemove}
                            onReprepare={onReprepare}
                            onDownloadSingle={onDownloadSingle}
                            onGenerateSingleVideo={onGenerateSingleVideo}
                            onGenerateDepthMap={onGenerateDepthMap}
                            showVideoActions={showVideoActions}
                        />;
                    }}
                />
                )}
            </div>
        </div>
    );
};

interface ImageCardProps {
    image: DisplayImage;
    onImageClick: (id: string) => void;
    onRegenerate?: (id: string) => void;
    onRemove: (id: string) => void;
    onReprepare?: (id: string) => void;
    onDownloadSingle: (id: string) => void;
    onGenerateSingleVideo?: (id: string) => void;
    onGenerateDepthMap?: (id: string) => void;
    showVideoActions: boolean;
}

const ImageCard: React.FC<ImageCardProps> = ({
    image,
    onImageClick,
    onRegenerate,
    onRemove,
    onReprepare,
    onDownloadSingle,
    onGenerateSingleVideo,
    onGenerateDepthMap,
    showVideoActions,
}) => {
    const [isHovering, setIsHovering] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    const { src, filename, isPreparing, videoPrompt, videoSrc, isGeneratingVideo } = image;
    const isRegenerating = 'isRegenerating' in image && image.isRegenerating;
    const videoGenerationFailed = 'videoGenerationFailed' in image && image.videoGenerationFailed;
    const depthMapSrc = 'depthMapSrc' in image ? image.depthMapSrc : undefined;
    const isGeneratingDepthMap = 'isGeneratingDepthMap' in image && image.isGeneratingDepthMap;
    const depthMapGenerationFailed = 'depthMapGenerationFailed' in image && image.depthMapGenerationFailed;
    const isBusy = isRegenerating || isPreparing || isGeneratingVideo || isGeneratingDepthMap;

    const uniqueId = 'id' in image ? image.id : image.filename;

    useEffect(() => {
        if (videoSrc) {
            setIsVideoReady(false);
        }
    }, [videoSrc]);

    const handleActionClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const videoButtonTitle = !videoPrompt
        ? "Prepare image first to generate video"
        : videoSrc
            ? "Regenerate video"
            : "Generate video";

    const downloadButtonTitle = videoSrc
        ? "Download image, info file, and video"
        : "Download image and info file";

    return (
        <div
            className="group relative bg-[var(--color-bg-surface)] rounded-lg overflow-hidden shadow-lg w-full h-full"
            onMouseEnter={() => videoSrc && setIsHovering(true)}
            onMouseLeave={() => videoSrc && setIsHovering(false)}
        >
            <button onClick={() => onImageClick(uniqueId)} className="w-full h-full block" aria-label="View larger image">
                <img
                    src={src}
                    alt={`Generated image: ${filename}`}
                    className="w-full h-full object-cover block"
                />
                {videoSrc && isHovering && showVideoActions && (
                    <div className="absolute inset-0">
                        {!isVideoReady && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                                <div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-[var(--color-text-main)]"></div>
                            </div>
                        )}
                        <video
                            key={videoSrc}
                            src={videoSrc}
                            onCanPlay={() => setIsVideoReady(true)}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-5"
                            style={{ opacity: isVideoReady ? 1 : 0 }}
                        />
                    </div>
                )}
                {videoGenerationFailed && !isBusy && showVideoActions && (
                    <div className="absolute inset-0 bg-red-500/30 pointer-events-none flex items-center justify-center">
                        <AlertCircleIcon className="w-8 h-8 text-white/80" />
                    </div>
                )}
            </button>

            {showVideoActions && (
                <>
                    {videoSrc && !isBusy && (
                        <div className="absolute top-2 left-2 p-1 bg-black bg-opacity-60 rounded-full text-[var(--color-primary-accent)] pointer-events-none">
                            <VideoIcon className="w-5 h-5" />
                        </div>
                    )}
                    {!videoSrc && videoPrompt && !isBusy && (
                        <div className="absolute top-2 left-2 p-1 bg-black bg-opacity-60 rounded-full text-[var(--color-success-accent)] pointer-events-none">
                            <CheckCircleIcon className="w-5 h-5" />
                        </div>
                    )}
                </>
            )}

            {onGenerateDepthMap && depthMapSrc && !isBusy && (
                <div className="absolute top-14 left-2 p-1 bg-black bg-opacity-60 rounded-full text-[var(--color-info-accent)] pointer-events-none" title="Depth map is ready">
                    <DepthMapIcon className="w-5 h-5" />
                </div>
            )}

            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-20">
                <button
                    onClick={(e) => { handleActionClick(e); onDownloadSingle(uniqueId); }}
                    className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all"
                    title={downloadButtonTitle}
                >
                    <DownloadIcon className="w-5 h-5" />
                </button>
                {onRegenerate && (
                    <button
                        onClick={(e) => { handleActionClick(e); onRegenerate(uniqueId); }}
                        className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50"
                        title="Generate a new variation"
                        disabled={isBusy}
                    >
                        <RegenerateIcon className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    </button>
                )}
                {showVideoActions && onReprepare && (
                    <button
                        onClick={(e) => { handleActionClick(e); onReprepare(uniqueId); }}
                        className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50"
                        title={videoPrompt ? 'Re-prepare for video' : 'Prepare for video'}
                        disabled={isBusy}
                    >
                        <PrepareMagicIcon className={`w-5 h-5 ${isPreparing ? 'animate-spin' : ''}`} />
                    </button>
                )}
                {showVideoActions && onGenerateSingleVideo && (
                    <button
                        onClick={(e) => { handleActionClick(e); onGenerateSingleVideo(uniqueId); }}
                        className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50"
                        title={videoButtonTitle}
                        disabled={!videoPrompt || isBusy}
                    >
                        <VideoIcon className={`w-5 h-5 ${isGeneratingVideo ? 'animate-spin' : ''}`} />
                    </button>
                )}
                {onGenerateDepthMap && (
                    <button
                        onClick={(e) => { handleActionClick(e); onGenerateDepthMap(uniqueId); }}
                        className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50"
                        title={depthMapSrc ? 'Regenerate depth map' : 'Generate depth map'}
                        disabled={isBusy}
                    >
                        <DepthMapIcon className={`w-5 h-5 ${isGeneratingDepthMap ? 'animate-spin' : ''}`} />
                    </button>
                )}
                <button
                    onClick={(e) => { handleActionClick(e); onRemove(uniqueId); }}
                    className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50"
                    title="Remove this image"
                    disabled={isBusy}
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>

            {isBusy && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-[var(--color-text-main)] text-xs font-semibold z-30">
                    <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                    <span className="mt-2">
                        {isRegenerating && 'Regenerating...'}
                        {isPreparing && 'Preparing...'}
                        {isGeneratingVideo && 'Making Video...'}
                        {isGeneratingDepthMap && 'Generating Depth Map...'}
                    </span>
                </div>
            )}
        </div>
    );
};

export default JustifiedGalleryGrid;
