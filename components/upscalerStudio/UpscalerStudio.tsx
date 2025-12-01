/// <reference lib="dom" />
import React, { useRef, useCallback, useState } from 'react';
import { GeneratedImage, GeneratedBabyImage, GeneratedArchitectureImage, ImageStudioResultImage, UpscalerImage, UpscalerModel, UpscaleMode, TargetResolution } from '../../types';
import MultiImageUploader from '../MultiImageUploader';
import {
    UpscalerIcon, TrashIcon, DownloadIcon,
    HairStudioIcon, BabyIcon, ArchitectureStudioIcon, UploadIcon,
    ImageStudioIcon, AdClonerIcon, BananaIcon, AlertCircleIcon, CheckCircleIcon
} from '../Icons';
import { useUpscalerStudio } from '../../hooks/useUpscalerStudio';

interface UpscalerStudioProps {
    logic: ReturnType<typeof useUpscalerStudio>;
    hairImages: GeneratedImage[];
    babyImages: GeneratedBabyImage[];
    architectureImages: GeneratedArchitectureImage[];
    imageStudioImages: ImageStudioResultImage[];
    nanoBananaProStudioImages: ImageStudioResultImage[];
    adClonerImageCount: number;
    showBetaFeatures: boolean;
    onImport: (source: 'hair' | 'baby' | 'architecture' | 'imageStudio' | 'nanoBananaProStudio' | 'adCloner') => void;
    onImageClick: (id: string) => void;
}

const UpscalerCard: React.FC<{
    image: UpscalerImage;
    logic: ReturnType<typeof useUpscalerStudio>;
    onImageClick: (id: string) => void;
}> = ({ image, logic, onImageClick }) => {
    const { id, src, upscaledSrc, isUpscaling, upscaleFailed } = image;

    const [isHovering, setIsHovering] = useState(false);

    const handleActionClick = (e: React.MouseEvent) => e.stopPropagation();

    const upscaleButtonTitle = upscaledSrc ? "Re-upscale image" : "Upscale image";
    const downloadButtonTitle = upscaledSrc ? "Download original and upscaled" : "Download original";

    return (
        <div className="flex flex-col gap-3">
            <div
                className="group relative bg-[var(--color-bg-surface-light)] rounded-lg overflow-hidden shadow-lg shadow-[var(--color-shadow-primary)]/10 aspect-[4/5]"
                onMouseEnter={() => upscaledSrc && setIsHovering(true)}
                onMouseLeave={() => upscaledSrc && setIsHovering(false)}
            >
                <button
                    onClick={() => onImageClick(upscaledSrc || src)}
                    className="w-full h-full block"
                    aria-label={`View larger image of ${image.filename}`}
                    title="Click to view a larger version"
                >
                    <img
                        src={isHovering && upscaledSrc ? upscaledSrc : src}
                        alt={`Upscaler image ${image.filename}`}
                        className="w-full h-full object-cover block transition-opacity duration-300"
                    />
                    {upscaleFailed && !isUpscaling && (
                        <div className="absolute inset-0 bg-red-500/30 pointer-events-none flex items-center justify-center" title="Upscaling failed. Please try again.">
                            <AlertCircleIcon className="w-8 h-8 text-white/80" />
                        </div>
                    )}
                </button>

                {upscaledSrc && !isUpscaling && (
                    <div className="absolute top-2 left-2 p-1 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-success-accent)] pointer-events-none" title="Upscaled version available">
                        <CheckCircleIcon className="w-5 h-5" />
                    </div>
                )}

                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-20">
                    <button
                        onClick={(e) => { handleActionClick(e); logic.handleDownloadSingle(id); }}
                        className="p-2 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all"
                        title={downloadButtonTitle}
                    >
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={(e) => { handleActionClick(e); logic.handleUpscaleSingle(id); }}
                        className="p-2 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title={upscaleButtonTitle}
                        disabled={isUpscaling}
                    >
                        <UpscalerIcon className={`w-5 h-5 ${isUpscaling ? 'animate-pulse' : ''}`} />
                    </button>
                    <button
                        onClick={(e) => { handleActionClick(e); logic.handleRemoveImage(id); }}
                        className="p-2 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all"
                        title="Remove this image"
                        disabled={isUpscaling}
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>

                {isUpscaling && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-[var(--color-text-main)] text-xs font-semibold z-30">
                        <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                        <span className="mt-2">Upscaling...</span>
                    </div>
                )}
            </div>
            <div className="text-center">
                <p className="text-sm text-[var(--color-text-dim)] truncate" title={image.filename}>
                    {image.filename}
                </p>
                {image.appliedSettings && (
                    <p className="text-xs text-[var(--color-text-dimmer)]">
                        {image.appliedSettings.model === 'crystal'
                            ? `Crystal ${image.appliedSettings.scaleFactor}x`
                            : `SeedVR ${image.appliedSettings.upscaleMode === 'factor'
                                ? `${image.appliedSettings.scaleFactor}x`
                                : image.appliedSettings.targetResolution}`
                        }
                    </p>
                )}
            </div>
        </div>
    );
};

const SourceButton: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    count?: number;
    onClick: () => void;
    disabled?: boolean;
}> = ({ icon, title, description, count, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`relative bg-[var(--color-bg-surface-light)] p-6 rounded-xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105 hover:bg-[var(--color-bg-muted-hover)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full h-full`}
    >
        <div className="relative">
            {icon}
            {count !== undefined && count > 0 && <span className="absolute -top-2 -right-2 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] text-xs font-bold rounded-full px-2 py-0.5">{count}</span>}
        </div>
        <h3 className="text-xl font-bold mt-4 text-[var(--color-text-main)]">{title}</h3>
        <p className="text-[var(--color-text-dim)] mt-1 text-sm">{description}</p>
    </button>
);

// Compact import button for header
const ImportButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    count?: number;
    onClick: () => void;
    disabled?: boolean;
}> = ({ icon, label, count, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-1.5 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-main)] font-medium py-1.5 px-3 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface-light)] disabled:text-[var(--color-text-dimmer)] disabled:cursor-not-allowed text-xs"
        title={`Import from ${label}`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        {count !== undefined && count > 0 && (
            <span className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {count}
            </span>
        )}
    </button>
);

const UpscalerStudio: React.FC<UpscalerStudioProps> = (props) => {
    const {
        logic, hairImages, babyImages, architectureImages, imageStudioImages, nanoBananaProStudioImages, adClonerImageCount, showBetaFeatures, onImport,
        onImageClick
    } = props;

    const {
        upscalerImages, isBusy, isUpscaling, settings,
        handleImagesUpload, handleClearAll, handleUpscaleAll, sessionId,
        handleDownloadAll, handleUpdateSettings,
    } = logic;

    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const handleUploadClick = () => inputRef.current?.click();

    const onDragEnter = useCallback((e: React.DragEvent<HTMLElement>) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    }, []);

    const onDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
        e.preventDefault(); e.stopPropagation();
    }, []);

    const onDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);
        if (e.dataTransfer.files?.length > 0) {
            const imageFiles = Array.from(e.dataTransfer.files as FileList).filter((file: File) => file.type.startsWith('image/'));
            if (imageFiles.length > 0) handleImagesUpload(imageFiles);
            e.dataTransfer.clearData();
        }
    }, [handleImagesUpload]);

    const upscaledCount = upscalerImages.filter(img => img.upscaledSrc).length;
    const targetResolutions: TargetResolution[] = ['720p', '1080p', '1440p', '2160p'];

    // Empty state - welcome screen
    if (upscalerImages.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <h2 className="text-3xl font-bold text-[var(--color-text-light)] mb-4">Welcome to the Upscaler Studio</h2>
                <p className="text-[var(--color-text-dim)] mb-8 text-lg">Start by adding images from one of the sources below.</p>
                <div className="max-w-5xl w-full flex flex-col gap-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <SourceButton
                            icon={<HairStudioIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                            title="Hair Studio"
                            description="Import generated hairstyles"
                            count={hairImages.length}
                            onClick={() => onImport('hair')}
                            disabled={hairImages.length === 0 || isBusy}
                        />
                        <SourceButton
                            icon={<BabyIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                            title="Baby Studio"
                            description="Import baby photos"
                            count={babyImages.length}
                            onClick={() => onImport('baby')}
                            disabled={babyImages.length === 0 || isBusy}
                        />
                        <SourceButton
                            icon={<ArchitectureStudioIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                            title="Architecture"
                            description="Import architectural designs"
                            count={architectureImages.length}
                            onClick={() => onImport('architecture')}
                            disabled={architectureImages.length === 0 || isBusy}
                        />
                        <SourceButton
                            icon={<ImageStudioIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                            title="Image Studio"
                            description="Import batch images"
                            count={imageStudioImages.length}
                            onClick={() => onImport('imageStudio')}
                            disabled={imageStudioImages.length === 0 || isBusy}
                        />
                        <SourceButton
                            icon={<BananaIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                            title="Pro Studio"
                            description="Import pro quality images"
                            count={nanoBananaProStudioImages.length}
                            onClick={() => onImport('nanoBananaProStudio')}
                            disabled={nanoBananaProStudioImages.length === 0 || isBusy}
                        />
                        {showBetaFeatures && (
                            <SourceButton
                                icon={<AdClonerIcon className="w-12 h-12 text-[var(--color-primary-accent)]" />}
                                title="Ad Cloner"
                                description="Import ad variations"
                                count={adClonerImageCount}
                                onClick={() => onImport('adCloner')}
                                disabled={adClonerImageCount === 0 || isBusy}
                            />
                        )}
                    </div>
                    <div
                        className={`relative w-full border-4 border-dashed rounded-xl p-12 sm:p-20 transition-colors ${isDragging ? 'border-[var(--color-primary-accent)] bg-[var(--color-bg-surface-light)]' : 'border-[var(--color-border-default)] hover:border-[var(--color-primary)]'}`}
                        onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDrop} onDrop={onDrop}
                    >
                        <div className="flex flex-col items-center text-[var(--color-text-dim)] pointer-events-none">
                            <UploadIcon className="h-16 w-16 mb-4" />
                            <p className="text-xl font-semibold mb-2">Drag & drop your images here</p>
                            <p className="mb-6">or</p>
                            <button onClick={handleUploadClick} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] font-bold py-3 px-6 rounded-lg transition-colors shadow-md shadow-[var(--color-shadow-primary)]/30 pointer-events-auto">
                                Browse Files
                            </button>
                        </div>
                        <input
                            ref={inputRef} type="file" className="sr-only" accept="image/*" multiple
                            onChange={(e) => { if (e.target.files) handleImagesUpload(Array.from(e.target.files)); (e.target as HTMLInputElement).value = ''; }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Working state with images
    return (
        <div className="relative w-full pb-28" onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}>
            {isDragging && (
                <div className="pointer-events-none absolute inset-0 bg-[var(--color-bg-flash)] border-4 border-dashed border-[var(--color-primary-accent)] rounded-2xl z-50 flex items-center justify-center">
                    <div className="text-center bg-[var(--color-bg-surface)]/80 p-6 rounded-lg">
                        <UploadIcon className="w-16 h-16 text-[var(--color-primary-accent)] mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-[var(--color-text-main)]">Drop to Upload Images</h2>
                    </div>
                </div>
            )}

            <div className={`w-full max-w-7xl mx-auto flex flex-col ${isDragging ? 'opacity-50' : ''}`}>
                {/* Top Header: Import Options + Session Info */}
                <header className="flex justify-between items-center mb-6 gap-4 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <MultiImageUploader onImagesUpload={handleImagesUpload} isButton />
                        <ImportButton icon={<HairStudioIcon className="w-4 h-4" />} label="Hair" count={hairImages.length} onClick={() => onImport('hair')} disabled={isBusy || hairImages.length === 0} />
                        <ImportButton icon={<BabyIcon className="w-4 h-4" />} label="Baby" count={babyImages.length} onClick={() => onImport('baby')} disabled={isBusy || babyImages.length === 0} />
                        <ImportButton icon={<ArchitectureStudioIcon className="w-4 h-4" />} label="Arch" count={architectureImages.length} onClick={() => onImport('architecture')} disabled={isBusy || architectureImages.length === 0} />
                        <ImportButton icon={<ImageStudioIcon className="w-4 h-4" />} label="Image" count={imageStudioImages.length} onClick={() => onImport('imageStudio')} disabled={isBusy || imageStudioImages.length === 0} />
                        <ImportButton icon={<BananaIcon className="w-4 h-4" />} label="Pro" count={nanoBananaProStudioImages.length} onClick={() => onImport('nanoBananaProStudio')} disabled={isBusy || nanoBananaProStudioImages.length === 0} />
                        {showBetaFeatures && (
                            <ImportButton icon={<AdClonerIcon className="w-4 h-4" />} label="Ad" count={adClonerImageCount} onClick={() => onImport('adCloner')} disabled={isBusy || adClonerImageCount === 0} />
                        )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        {sessionId && (
                            <div className="hidden lg:inline-block bg-[var(--color-bg-muted)] text-[var(--color-text-dim)] text-xs font-mono py-1.5 px-3 rounded-lg truncate">
                                Set: {sessionId}
                            </div>
                        )}
                        <div className="text-sm text-[var(--color-text-dim)]">
                            {upscalerImages.length} image{upscalerImages.length !== 1 ? 's' : ''} • {upscaledCount} upscaled
                        </div>
                    </div>
                </header>

                {/* Image Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {upscalerImages.map(image => (
                        <UpscalerCard
                            key={image.id}
                            image={image}
                            logic={logic}
                            onImageClick={onImageClick}
                        />
                    ))}
                </div>
            </div>

            {/* Fixed Bottom Toolbar */}
            <div className="fixed bottom-0 left-0 right-0 h-[95px] bg-[var(--color-bg-surface)] border-t-2 border-[var(--color-border-muted)] shadow-lg z-50 overflow-visible">
                <div className="max-w-7xl mx-auto px-6 py-4 h-full">
                    <div className="h-full flex flex-wrap items-center justify-between gap-4">
                        {/* Left side: Model & Settings */}
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Model Selection */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-[var(--color-text-light)] whitespace-nowrap">Model:</label>
                                <div className="flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
                                    <button
                                        onClick={() => handleUpdateSettings({ model: 'crystal' })}
                                        disabled={isBusy}
                                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                            settings.model === 'crystal'
                                                ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                                                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        Crystal
                                    </button>
                                    <button
                                        onClick={() => handleUpdateSettings({ model: 'seedvr' })}
                                        disabled={isBusy}
                                        className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-[var(--color-border-default)] ${
                                            settings.model === 'seedvr'
                                                ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]'
                                                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        SeedVR
                                    </button>
                                </div>
                            </div>

                            {/* Crystal: Scale Factor */}
                            {settings.model === 'crystal' && (
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-[var(--color-text-light)] whitespace-nowrap">Scale:</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="4"
                                        step="0.5"
                                        value={settings.scaleFactor}
                                        onChange={(e) => handleUpdateSettings({ scaleFactor: parseFloat(e.target.value) })}
                                        disabled={isBusy}
                                        className="w-20 h-2 bg-[var(--color-border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] disabled:opacity-50"
                                    />
                                    <span className="text-xs font-mono text-[var(--color-primary-accent)] w-6 text-center">
                                        {settings.scaleFactor}x
                                    </span>
                                </div>
                            )}

                            {/* SeedVR: Mode + Factor/Resolution */}
                            {settings.model === 'seedvr' && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-[var(--color-text-light)] whitespace-nowrap">Mode:</label>
                                        <div className="flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
                                            <button
                                                onClick={() => handleUpdateSettings({ upscaleMode: 'factor' })}
                                                disabled={isBusy}
                                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                                    settings.upscaleMode === 'factor'
                                                        ? 'bg-[var(--color-secondary)] text-[var(--color-text-on-primary)]'
                                                        : 'bg-[var(--color-bg-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                Factor
                                            </button>
                                            <button
                                                onClick={() => handleUpdateSettings({ upscaleMode: 'target' })}
                                                disabled={isBusy}
                                                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-[var(--color-border-default)] ${
                                                    settings.upscaleMode === 'target'
                                                        ? 'bg-[var(--color-secondary)] text-[var(--color-text-on-primary)]'
                                                        : 'bg-[var(--color-bg-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                Target
                                            </button>
                                        </div>
                                    </div>

                                    {settings.upscaleMode === 'factor' && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-medium text-[var(--color-text-light)] whitespace-nowrap">Scale:</label>
                                            <input
                                                type="range"
                                                min="1"
                                                max="4"
                                                step="0.5"
                                                value={settings.scaleFactor}
                                                onChange={(e) => handleUpdateSettings({ scaleFactor: parseFloat(e.target.value) })}
                                                disabled={isBusy}
                                                className="w-20 h-2 bg-[var(--color-border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] disabled:opacity-50"
                                            />
                                            <span className="text-xs font-mono text-[var(--color-primary-accent)] w-6 text-center">
                                                {settings.scaleFactor}x
                                            </span>
                                        </div>
                                    )}

                                    {settings.upscaleMode === 'target' && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-medium text-[var(--color-text-light)] whitespace-nowrap">Resolution:</label>
                                            <div className="flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
                                                {targetResolutions.map((resolution, index) => (
                                                    <button
                                                        key={resolution}
                                                        onClick={() => handleUpdateSettings({ targetResolution: resolution })}
                                                        disabled={isBusy}
                                                        className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                                                            index > 0 ? 'border-l border-[var(--color-border-default)]' : ''
                                                        } ${
                                                            settings.targetResolution === resolution
                                                                ? 'bg-[var(--color-secondary)] text-[var(--color-text-on-primary)]'
                                                                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]'
                                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    >
                                                        {resolution}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Right side: Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClearAll}
                                disabled={isBusy}
                                className="flex items-center gap-1.5 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-main)] font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                title="Clear all images"
                            >
                                <TrashIcon className="w-4 h-4" />
                                Clear
                            </button>
                            <button
                                onClick={handleDownloadAll}
                                disabled={isBusy || upscalerImages.length === 0}
                                className="flex items-center gap-1.5 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-text-on-primary)] font-semibold py-2 px-3 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] disabled:cursor-not-allowed text-sm"
                                title="Download all as ZIP"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Download
                            </button>
                            <button
                                onClick={handleUpscaleAll}
                                disabled={isBusy || upscalerImages.length === 0}
                                className="flex items-center gap-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] disabled:cursor-not-allowed text-sm"
                                title="Upscale all images"
                            >
                                <UpscalerIcon className={`w-4 h-4 ${isUpscaling ? 'animate-pulse' : ''}`} />
                                {isUpscaling ? 'Upscaling...' : 'Upscale All'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(UpscalerStudio);
