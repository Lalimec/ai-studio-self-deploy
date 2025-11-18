import { useState, useCallback } from 'react';
import {
    ArchitectureGenerationOptions,
    GeneratedArchitectureImage,
    Toast as ToastType,
    DownloadSettings,
    OriginalImageState
} from '../types';
import {
    generateArchitecturalStyles,
    regenerateSingleArchitecturalStyle,
    generateDepthMap,
    generateArchitecturalVideoPrompt
} from '../services/architectureStudioService';
import {
    enhanceVideoPromptForImage,
    VideoTask
} from '../services/videoService';
import { dataUrlToBlob } from '../services/geminiClient';
import { generateAllVideos, generateSingleVideoForImage } from '../services/videoService';
import { getTimestamp, generateSetId } from '../services/imageUtils';
import { logUserAction } from '../services/loggingService';
import { uploadImageFromDataUrl } from '../services/imageUploadService';
import { downloadBulkImages, downloadImageWithMetadata } from '../services/downloadService';
import { processWithConcurrency } from '../services/apiUtils';

declare const JSZip: any;

type ArchitectureStudioHookProps = {
    addToast: (message: string, type: ToastType['type']) => void;
    setConfirmAction: (action: any) => void;
    withMultiDownloadWarning: (action: () => void) => void;
    setDownloadProgress: (progress: { visible: boolean; message: string; progress: number }) => void;
    useNanoBananaWebhook: boolean;
    downloadSettings: DownloadSettings;
};

export const useArchitectureStudio = ({
    addToast,
    setConfirmAction,
    withMultiDownloadWarning,
    setDownloadProgress,
    useNanoBananaWebhook,
    downloadSettings
}: ArchitectureStudioHookProps) => {
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);
    const [croppedImageAspectRatio, setCroppedImageAspectRatio] = useState<number>(16 / 9);
    const [originalImage, setOriginalImage] = useState<OriginalImageState>({
        file: null,
        croppedSrc: null,
        publicUrl: undefined,
        isPreparing: false,
        videoPrompt: undefined,
        isGeneratingVideo: false,
        videoSrc: undefined,
        filename: undefined,
        videoGenerationFailed: false,
        depthMapSrc: undefined,
        isGeneratingDepthMap: false,
        depthMapGenerationFailed: false,
    });
    const [options, setOptions] = useState<ArchitectureGenerationOptions>({
        scope: 'interior',
        roomType: 'none',
        buildingType: 'none',
        styles: [],
        customStyles: '',
        useCustomStyles: false,
        styleSelectionMode: 'selected',
        colorScheme: 'none',
        tidy: 'tidy',
        showUnfinished: false,
        generateUnstyledVersion: false,
        time: 'current',
        theme: 'none',
        cameraAngle: 'preserve',
        imageCount: 1,
        aspectRatio: 'auto',
    });
    const [generatedImages, setGeneratedImages] = useState<GeneratedArchitectureImage[]>([]);
    const [pendingImageCount, setPendingImageCount] = useState(0);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [generationTimestamp, setGenerationTimestamp] = useState<string>('');
    const [isPreparing, setIsPreparing] = useState(false);
    const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
    const [isGeneratingDepthMaps, setIsGeneratingDepthMaps] = useState(false);

    const isBusy = isPreparing || isGeneratingVideos || isGeneratingDepthMaps || pendingImageCount > 0 || originalImage.isPreparing || originalImage.isGeneratingVideo || originalImage.isGeneratingDepthMap;
    const isGenerateDisabled = !croppedImage;

    const onCropConfirm = (croppedImageDataUrl: string, aspectRatio: number) => {
        const isNewUpload = !croppedImage;
        const applyCrop = () => {
            setCroppedImage(croppedImageDataUrl);
            setCroppedImageAspectRatio(aspectRatio);
            if (isNewUpload) {
                const newSessionId = generateSetId();
                setSessionId(newSessionId);
                const timestamp = getTimestamp();
                const baseFilename = originalFile?.name.split('.').slice(0, -1).join('.') || 'image';
                const sanitizedFilename = baseFilename.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
                const filename = `${newSessionId}_${sanitizedFilename}_original_${timestamp}.jpg`;

                setOriginalImage({
                    file: originalFile,
                    croppedSrc: croppedImageDataUrl,
                    publicUrl: undefined,
                    isPreparing: false,
                    videoPrompt: undefined,
                    isGeneratingVideo: false,
                    videoSrc: undefined,
                    filename: filename,
                    videoGenerationFailed: false,
                    depthMapSrc: undefined,
                    isGeneratingDepthMap: false,
                    depthMapGenerationFailed: false,
                });
                logUserAction('UPLOAD_ARCHITECTURE_IMAGE', { sessionId: newSessionId });
            }
        };

        if (!isNewUpload && generatedImages.length > 0) {
            setConfirmAction({
                title: "Recrop Confirmation",
                message: "Recropping works best with new results. Would you like to clear previous results?",
                confirmText: "Clear & Continue",
                cancelText: "Keep Results",
                onConfirm: () => {
                    const newSessionId = generateSetId();
                    applyCrop();
                    setGeneratedImages([]);
                    setSessionId(newSessionId);
                    logUserAction('RECROP_ARCHITECTURE_IMAGE', { action: 'clear_and_continue', newSessionId });
                },
                onCancel: () => {
                    applyCrop();
                    logUserAction('RECROP_ARCHITECTURE_IMAGE', { action: 'keep_results' });
                },
            });
        } else {
            applyCrop();
        }
    };

    const handleClearImageAndResults = () => {
        setConfirmAction({
            title: "Clear Photo & Results?",
            message: 'This will remove your uploaded photo and all generated styles. This action cannot be undone.',
            onConfirm: () => {
                logUserAction('CLEAR_ARCHITECTURE_IMAGE_AND_RESULTS', { sessionId });
                setOriginalFile(null);
                setCroppedImage(null);
                setGeneratedImages([]);
                setGenerationTimestamp('');
                setSessionId(null);
                setOriginalImage({
                    file: null,
                    croppedSrc: null,
                    publicUrl: undefined,
                    isPreparing: false,
                    videoPrompt: undefined,
                    isGeneratingVideo: false,
                    videoSrc: undefined,
                    filename: undefined,
                    videoGenerationFailed: false,
                    depthMapSrc: undefined,
                    isGeneratingDepthMap: false,
                    depthMapGenerationFailed: false,
                });
            }
        });
    };

    const handleGenerate = () => {
        if (!croppedImage || !originalFile || !sessionId) return;

        const currentOptions = { ...options };
        logUserAction('GENERATE_ARCHITECTURAL_STYLES', { options: currentOptions, sessionId });

        // Calculate batch size based on style selection mode
        let batchSize = currentOptions.imageCount;
        if (currentOptions.styleSelectionMode === 'selected') {
            const styleCount = currentOptions.useCustomStyles && currentOptions.customStyles.trim()
                ? currentOptions.customStyles.split(',').filter(s => s.trim()).length
                : currentOptions.styles.length || 1;
            batchSize = styleCount * currentOptions.imageCount;
        }

        setPendingImageCount(prev => prev + batchSize);
        const timestamp = getTimestamp();
        setGenerationTimestamp(timestamp);

        generateArchitecturalStyles(
            croppedImage,
            currentOptions,
            originalFile.name,
            timestamp,
            sessionId,
            useNanoBananaWebhook,
            (newImage) => {
                setGeneratedImages((prev) => [{
                    src: newImage.imageUrl,
                    style: newImage.style,
                    time: newImage.time,
                    theme: newImage.theme,
                    filename: newImage.filename,
                    imageGenerationPrompt: newImage.imageGenerationPrompt
                }, ...prev]);
            },
            (errorMessage) => addToast(errorMessage, 'error'),
            () => {
                // onTaskComplete
                setPendingImageCount(prev => Math.max(0, prev - 1));
            }
        ).catch(err => {
            addToast(err instanceof Error ? err.message : 'A top-level generation error occurred.', 'error');
            setPendingImageCount(prev => Math.max(0, prev - batchSize));
        });
    };

    const handleGenerateUnstyled = () => {
        if (!croppedImage || !originalFile || !sessionId) return;

        // Create unstyled options: no style, no time, no theme, no color scheme
        const unstyledOptions: ArchitectureGenerationOptions = {
            ...options,
            styles: [],
            customStyles: '',
            useCustomStyles: false,
            styleSelectionMode: 'random',
            colorScheme: 'none',
            time: 'current',
            theme: 'none',
            showUnfinished: false,
            imageCount: 1, // Always generate just 1 unstyled version
        };

        logUserAction('GENERATE_UNSTYLED_ARCHITECTURAL_VERSION', { sessionId });
        setPendingImageCount(prev => prev + 1);
        const timestamp = getTimestamp();
        setGenerationTimestamp(timestamp);

        generateArchitecturalStyles(
            croppedImage,
            unstyledOptions,
            originalFile.name,
            timestamp,
            sessionId,
            useNanoBananaWebhook,
            (newImage) => {
                setGeneratedImages((prev) => [{
                    src: newImage.imageUrl,
                    style: 'Unstyled Original',
                    time: newImage.time,
                    theme: newImage.theme,
                    filename: newImage.filename,
                    imageGenerationPrompt: newImage.imageGenerationPrompt
                }, ...prev]);
            },
            (errorMessage) => addToast(errorMessage, 'error'),
            () => {
                setPendingImageCount(prev => Math.max(0, prev - 1));
            }
        ).catch(err => {
            addToast(err instanceof Error ? err.message : 'An error occurred during unstyled generation.', 'error');
            setPendingImageCount(prev => Math.max(0, prev - 1));
        });
    };

    const handleStartOver = () => {
        setConfirmAction({
            title: "Start Over?",
            message: 'This will clear everything. Are you sure?',
            onConfirm: () => {
                logUserAction('START_OVER_ARCHITECTURE', { sessionId });
                setOriginalFile(null);
                setCroppedImage(null);
                setGeneratedImages([]);
                setIsPreparing(false);
                setIsGeneratingVideos(false);
                setGenerationTimestamp('');
                setPendingImageCount(0);
                setSessionId(null);
                setOriginalImage({
                    file: null,
                    croppedSrc: null,
                    publicUrl: undefined,
                    isPreparing: false,
                    videoPrompt: undefined,
                    isGeneratingVideo: false,
                    videoSrc: undefined,
                    filename: undefined,
                    videoGenerationFailed: false,
                    depthMapSrc: undefined,
                    isGeneratingDepthMap: false,
                    depthMapGenerationFailed: false,
                });
            },
        });
    };

    const handleRegenerateSingle = async (filename: string) => {
        if (!croppedImage || !originalFile || !sessionId) {
            addToast("Cannot regenerate without a base image and session.", "error");
            return;
        }
        logUserAction('REGENERATE_ARCHITECTURAL_STYLE', { filename, sessionId });
        setGeneratedImages(prev => prev.map(img =>
            img.filename === filename ? { ...img, isRegenerating: true } : img
        ));

        try {
            const newTimestamp = getTimestamp();
            const newImage = await regenerateSingleArchitecturalStyle(
                croppedImage,
                options,
                originalFile.name,
                newTimestamp,
                sessionId,
                useNanoBananaWebhook
            );
            setGeneratedImages(prev => prev.map(img =>
                img.filename === filename ? {
                    src: newImage.imageUrl,
                    style: newImage.style,
                    time: newImage.time,
                    theme: newImage.theme,
                    filename: newImage.filename,
                    imageGenerationPrompt: newImage.imageGenerationPrompt,
                    isRegenerating: false,
                    publicUrl: undefined, // Invalidate public URL on regenerate
                } : img
            ));
            addToast(`Successfully regenerated style.`, "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'An unknown error occurred during regeneration.', 'error');
            setGeneratedImages(prev => prev.map(img =>
                img.filename === filename ? { ...img, isRegenerating: false } : img
            ));
        }
    };

    const ensurePublicUrl = async (filename: string): Promise<string | null> => {
        const image = generatedImages.find(img => img.filename === filename);
        if (!image) return null;
        if (image.publicUrl) return image.publicUrl;

        try {
            const url = await uploadImageFromDataUrl(image.src, image.filename);
            setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, publicUrl: url } : img));
            return url;
        } catch (error) {
            addToast(`Failed to upload image ${image.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            return null;
        }
    };

    const handlePrepareSingleImage = async (filename: string) => {
        const image = generatedImages.find(img => img.filename === filename);
        if (!image || image.isPreparing || image.isGeneratingVideo) return;
        logUserAction('PREPARE_ARCHITECTURE_VIDEO_SINGLE', { filename, sessionId });
        setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, isPreparing: true } : img));
        addToast(`Preparing video prompt...`, 'info');
        try {
            const imageBlob = dataUrlToBlob(image.src);
            const prompt = await generateArchitecturalVideoPrompt(imageBlob);
            setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, videoPrompt: prompt, isPreparing: false } : img));
            addToast("Video prompt ready!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'An unknown error occurred during preparation.', 'error');
            setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, isPreparing: false } : img));
        }
    };

    const handleGenerateSingleVideo = async (filename: string) => {
        const image = generatedImages.find(img => img.filename === filename);
        if (!image || !image.videoPrompt || image.isGeneratingVideo || image.isPreparing) {
            addToast("Image must be prepared first.", "error");
            return;
        }
        logUserAction('GENERATE_ARCHITECTURE_VIDEO_SINGLE', { filename, sessionId });
        setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, isGeneratingVideo: true, videoGenerationFailed: false } : img));
        addToast(`Generating video... This can take a few minutes.`, 'info');
        try {
            const publicUrl = await ensurePublicUrl(filename);
            if (!publicUrl) {
                throw new Error("Failed to get public URL for the image.");
            }
            const videoSrc = await generateSingleVideoForImage({
                startImageUrl: publicUrl,
                videoPrompt: image.videoPrompt,
                filename: image.filename,
            });
            setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, videoSrc, isGeneratingVideo: false, videoGenerationFailed: false } : img));
            addToast("Video generated!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'An unknown error occurred during video generation.', 'error');
            setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, isGeneratingVideo: false, videoGenerationFailed: true } : img));
        }
    };

    const handleRemoveGeneratedImage = (filenameToRemove: string) => {
        logUserAction('REMOVE_ARCHITECTURE_IMAGE', { filename: filenameToRemove, sessionId });
        setGeneratedImages((prev) => prev.filter(img => img.filename !== filenameToRemove));
    };

    const handlePrepareAll = async () => {
        const unpreparedImages = generatedImages.filter(img => !img.videoPrompt && !img.isPreparing);
        const needsOriginalPrep = originalImage.croppedSrc && !originalImage.videoPrompt && !originalImage.isPreparing;
        const totalCount = unpreparedImages.length + (needsOriginalPrep ? 1 : 0);

        if (totalCount === 0) {
            addToast("All images are already prepared or being prepared.", "info");
            return;
        }
        logUserAction('PREPARE_ARCHITECTURE_VIDEO_ALL', { count: totalCount, sessionId });
        setIsPreparing(true);
        setGeneratedImages(prev => prev.map(img => unpreparedImages.some(unprepared => unprepared.filename === img.filename) ? { ...img, isPreparing: true } : img));
        if (needsOriginalPrep) {
            setOriginalImage(prev => ({ ...prev, isPreparing: true }));
        }
        addToast(`Preparing ${totalCount} video prompts...`, "info");
        try {
            // Use architectural video prompt generation instead of the generic people-focused one
            const processSingleTask = async (image: GeneratedArchitectureImage) => {
                try {
                    const imageBlob = dataUrlToBlob(image.src);
                    const videoPrompt = await generateArchitecturalVideoPrompt(imageBlob);
                    setGeneratedImages(prev => prev.map(img => img.filename === image.filename ? { ...img, videoPrompt, isPreparing: false } : img));
                } catch (error) {
                    console.error(`Failed to generate video prompt for "${image.filename}":`, error);
                    addToast(`Failed on ${image.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                    setGeneratedImages(prev => prev.map(img => img.filename === image.filename ? { ...img, isPreparing: false } : img));
                }
            };

            // Prepare original image if needed
            if (needsOriginalPrep) {
                try {
                    const imageBlob = dataUrlToBlob(originalImage.croppedSrc!);
                    const videoPrompt = await generateArchitecturalVideoPrompt(imageBlob);
                    setOriginalImage(prev => ({ ...prev, videoPrompt, isPreparing: false }));
                } catch (error) {
                    console.error('Failed to generate video prompt for original image:', error);
                    addToast(`Failed on original image: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                    setOriginalImage(prev => ({ ...prev, isPreparing: false }));
                }
            }

            await processWithConcurrency(unpreparedImages, processSingleTask, 6);
            addToast("Video prompt preparation complete!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'An unknown error occurred during preparation.', 'error');
        } finally {
            setIsPreparing(false);
            setGeneratedImages(prev => prev.map(img => img.isPreparing ? { ...img, isPreparing: false } : img));
            setOriginalImage(prev => ({ ...prev, isPreparing: false }));
        }
    };

    const handleGenerateAllVideos = async () => {
        // Find images ready to generate (have prompts, not currently generating)
        const imagesWithPrompts = generatedImages.filter(img => !!img.videoPrompt && !img.isGeneratingVideo);
        const imagesWithoutVideos = imagesWithPrompts.filter(img => !img.videoSrc);
        const imagesWithExistingVideos = imagesWithPrompts.filter(img => img.videoSrc);

        // Check original image
        const originalNeedsVideo = originalImage.croppedSrc && originalImage.videoPrompt && !originalImage.isGeneratingVideo;
        const originalHasVideo = originalImage.videoSrc;

        const totalCount = imagesWithPrompts.length + (originalNeedsVideo ? 1 : 0);

        if (totalCount === 0) {
            addToast("All prepared images already have videos or are currently generating.", "info");
            return;
        }

        // If there are images with existing videos (including original), warn the user
        const totalExisting = imagesWithExistingVideos.length + (originalNeedsVideo && originalHasVideo ? 1 : 0);
        if (totalExisting > 0) {
            setConfirmAction({
                title: "Regenerate Videos?",
                message: `${totalExisting} image(s) already have generated videos. Regenerating will replace the existing videos. Do you want to continue?`,
                confirmText: "Regenerate All",
                confirmVariant: 'primary',
                onConfirm: () => {
                    executeGenerateAllVideos(imagesWithPrompts, originalNeedsVideo as boolean);
                },
            });
            return;
        }

        // No existing videos, proceed directly
        executeGenerateAllVideos(imagesWithoutVideos, originalNeedsVideo && !originalHasVideo);
    };

    const executeGenerateAllVideos = async (imagesToProcess: typeof generatedImages, includeOriginal: boolean = false) => {
        const totalCount = imagesToProcess.length + (includeOriginal ? 1 : 0);
        logUserAction('GENERATE_ARCHITECTURE_VIDEO_ALL', { count: totalCount, sessionId });
        setIsGeneratingVideos(true);
        setGeneratedImages(prev => prev.map(img => imagesToProcess.some(p => p.filename === img.filename) ? { ...img, isGeneratingVideo: true, videoGenerationFailed: false } : img));
        if (includeOriginal) {
            setOriginalImage(prev => ({ ...prev, isGeneratingVideo: true, videoGenerationFailed: false }));
        }
        addToast(`Generating ${totalCount} videos... This may take some time.`, "info");
        try {
            const videoTasks: VideoTask[] = [];

            // Add original image task if needed
            if (includeOriginal && originalImage.croppedSrc && originalImage.videoPrompt) {
                try {
                    let publicUrl = originalImage.publicUrl;
                    if (!publicUrl) {
                        publicUrl = await uploadImageFromDataUrl(originalImage.croppedSrc);
                        setOriginalImage(prev => ({ ...prev, publicUrl }));
                    }
                    videoTasks.push({
                        startImageUrl: publicUrl,
                        videoPrompt: originalImage.videoPrompt,
                        filename: originalImage.filename || 'original',
                    });
                } catch (error) {
                    addToast(`Failed to upload original image`, 'error');
                }
            }

            // Add generated image tasks
            for (const image of imagesToProcess) {
                const publicUrl = await ensurePublicUrl(image.filename);
                if (publicUrl && image.videoPrompt) {
                    videoTasks.push({
                        startImageUrl: publicUrl,
                        videoPrompt: image.videoPrompt,
                        filename: image.filename,
                    });
                }
            }
            if (videoTasks.length !== totalCount) {
                addToast("Some images failed to upload and were skipped.", "warning");
            }

            if (videoTasks.length > 0) {
                await generateAllVideos(videoTasks,
                    (filename, videoSrc) => {
                        // Check if this is the original image
                        if (includeOriginal && filename === (originalImage.filename || 'original')) {
                            setOriginalImage(prev => ({ ...prev, videoSrc, isGeneratingVideo: false, videoGenerationFailed: false }));
                        } else {
                            setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, videoSrc, isGeneratingVideo: false, videoGenerationFailed: false } : img));
                        }
                    },
                    (errorMessage) => {
                        const filenameMatch = errorMessage.match(/Failed on (.*?):/);
                        if (filenameMatch && filenameMatch[1]) {
                            const failedFilename = filenameMatch[1];
                            if (includeOriginal && failedFilename === (originalImage.filename || 'original')) {
                                setOriginalImage(prev => ({ ...prev, isGeneratingVideo: false, videoGenerationFailed: true }));
                            } else {
                                setGeneratedImages(prev => prev.map(img => img.filename === failedFilename ? { ...img, isGeneratingVideo: false, videoGenerationFailed: true } : img));
                            }
                        }
                        addToast(errorMessage, 'error');
                    }
                );
            }
            addToast("Video generation complete!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'An unknown error occurred during video generation.', 'error');
        } finally {
            setIsGeneratingVideos(false);
            setGeneratedImages(prev => prev.map(img => ({ ...img, isGeneratingVideo: false })));
            if (includeOriginal) {
                setOriginalImage(prev => ({ ...prev, isGeneratingVideo: false }));
            }
        }
    };

    const handleGenerateSingleDepthMap = async (filename: string) => {
        const image = generatedImages.find(img => img.filename === filename);
        if (!image || image.isGeneratingDepthMap) {
            return;
        }
        logUserAction('GENERATE_ARCHITECTURE_DEPTH_MAP_SINGLE', { filename, sessionId });
        setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, isGeneratingDepthMap: true, depthMapGenerationFailed: false } : img));
        addToast(`Generating depth map...`, 'info');
        try {
            // Ensure we have a public URL (use cached one if available)
            const publicUrl = await ensurePublicUrl(filename);
            const depthMapSrc = await generateDepthMap(image.src, publicUrl || undefined);
            setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, depthMapSrc, isGeneratingDepthMap: false, depthMapGenerationFailed: false, publicUrl } : img));
            addToast("Depth map generated!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'An unknown error occurred during depth map generation.', 'error');
            setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, isGeneratingDepthMap: false, depthMapGenerationFailed: true } : img));
        }
    };

    const handleGenerateAllDepthMaps = async () => {
        const imagesWithoutDepthMaps = generatedImages.filter(img => !img.depthMapSrc && !img.isGeneratingDepthMap);
        const imagesWithExistingDepthMaps = generatedImages.filter(img => img.depthMapSrc);

        // Check original image
        const originalNeedsDepthMap = originalImage.croppedSrc && !originalImage.isGeneratingDepthMap;
        const originalHasDepthMap = originalImage.depthMapSrc;

        const totalCount = (imagesWithoutDepthMaps.length + imagesWithExistingDepthMaps.length) + (originalNeedsDepthMap ? 1 : 0);

        if (totalCount === 0) {
            addToast("No images available for depth map generation.", "info");
            return;
        }

        if (imagesWithoutDepthMaps.length === 0 && !originalNeedsDepthMap || originalHasDepthMap) {
            addToast("All images already have depth maps.", "info");
            return;
        }

        // If there are images with existing depth maps (including original), warn the user
        const totalExisting = imagesWithExistingDepthMaps.length + (originalNeedsDepthMap && originalHasDepthMap ? 1 : 0);
        if (totalExisting > 0) {
            setConfirmAction({
                title: "Regenerate Depth Maps?",
                message: `${totalExisting} image(s) already have generated depth maps. Regenerating will replace the existing depth maps. Do you want to continue?`,
                confirmText: "Regenerate All",
                confirmVariant: 'primary',
                onConfirm: () => {
                    executeGenerateAllDepthMaps(generatedImages, originalNeedsDepthMap as boolean);
                },
            });
            return;
        }

        // No existing depth maps, proceed directly
        executeGenerateAllDepthMaps(imagesWithoutDepthMaps, originalNeedsDepthMap && !originalHasDepthMap);
    };

    const executeGenerateAllDepthMaps = async (imagesToProcess: typeof generatedImages, includeOriginal: boolean = false) => {
        const totalCount = imagesToProcess.length + (includeOriginal ? 1 : 0);
        logUserAction('GENERATE_ARCHITECTURE_DEPTH_MAP_ALL', { count: totalCount, sessionId });
        setIsGeneratingDepthMaps(true);
        setGeneratedImages(prev => prev.map(img => imagesToProcess.some(p => p.filename === img.filename) ? { ...img, isGeneratingDepthMap: true, depthMapGenerationFailed: false } : img));
        if (includeOriginal) {
            setOriginalImage(prev => ({ ...prev, isGeneratingDepthMap: true, depthMapGenerationFailed: false }));
        }
        addToast(`Generating ${totalCount} depth maps...`, "info");

        let successCount = 0;
        let failureCount = 0;

        try {
            // Process original image if needed
            if (includeOriginal && originalImage.croppedSrc) {
                try {
                    let publicUrl = originalImage.publicUrl;
                    if (!publicUrl) {
                        publicUrl = await uploadImageFromDataUrl(originalImage.croppedSrc);
                        setOriginalImage(prev => ({ ...prev, publicUrl }));
                    }
                    const depthMapSrc = await generateDepthMap(originalImage.croppedSrc, publicUrl || undefined);
                    setOriginalImage(prev => ({ ...prev, depthMapSrc, isGeneratingDepthMap: false, depthMapGenerationFailed: false, publicUrl }));
                    successCount++;
                } catch (err) {
                    console.error('Failed to generate depth map for original image:', err);
                    setOriginalImage(prev => ({ ...prev, isGeneratingDepthMap: false, depthMapGenerationFailed: true }));
                    failureCount++;
                }
            }

            // Define task processor for concurrent processing
            const processDepthMapTask = async (image: GeneratedArchitectureImage) => {
                try {
                    // Ensure we have a public URL
                    const publicUrl = await ensurePublicUrl(image.filename);
                    const depthMapSrc = await generateDepthMap(image.src, publicUrl || undefined);
                    setGeneratedImages(prev => prev.map(img => img.filename === image.filename ? { ...img, depthMapSrc, isGeneratingDepthMap: false, depthMapGenerationFailed: false, publicUrl } : img));
                    successCount++;
                } catch (err) {
                    console.error(`Failed to generate depth map for ${image.filename}:`, err);
                    setGeneratedImages(prev => prev.map(img => img.filename === image.filename ? { ...img, isGeneratingDepthMap: false, depthMapGenerationFailed: true } : img));
                    failureCount++;
                }
            };

            // Process all depth map tasks concurrently (8 at a time, same as video generation)
            await processWithConcurrency(imagesToProcess, processDepthMapTask, 8);

            if (successCount > 0 && failureCount === 0) {
                addToast("All depth maps generated successfully!", "success");
            } else if (successCount > 0 && failureCount > 0) {
                addToast(`Generated ${successCount} depth map(s). ${failureCount} failed.`, "warning");
            } else {
                addToast("All depth map generations failed.", "error");
            }
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'An unknown error occurred during depth map generation.', 'error');
        } finally {
            setIsGeneratingDepthMaps(false);
            setGeneratedImages(prev => prev.map(img => ({ ...img, isGeneratingDepthMap: false })));
            if (includeOriginal) {
                setOriginalImage(prev => ({ ...prev, isGeneratingDepthMap: false }));
            }
        }
    };

    // --- ORIGINAL IMAGE HANDLERS ---

    const handlePrepareOriginal = async () => {
        if (!originalImage.croppedSrc || originalImage.isPreparing || originalImage.isGeneratingVideo) return;
        logUserAction('PREPARE_ORIGINAL_VIDEO', { sessionId });
        setOriginalImage(prev => ({ ...prev, isPreparing: true }));
        addToast(`Preparing video prompt for original image...`, 'info');
        try {
            const imageBlob = dataUrlToBlob(originalImage.croppedSrc);
            const prompt = await generateArchitecturalVideoPrompt(imageBlob);
            setOriginalImage(prev => ({ ...prev, videoPrompt: prompt, isPreparing: false }));
            addToast("Video prompt for original image ready!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : `Error preparing original image.`, 'error');
            setOriginalImage(prev => ({ ...prev, isPreparing: false }));
        }
    };

    const handleGenerateOriginalVideo = async () => {
        if (!originalImage.croppedSrc || !originalImage.videoPrompt || originalImage.isGeneratingVideo || originalImage.isPreparing) {
            addToast("Original image must be prepared first.", "error");
            return;
        }
        logUserAction('GENERATE_ORIGINAL_VIDEO', { sessionId });
        setOriginalImage(prev => ({ ...prev, isGeneratingVideo: true, videoGenerationFailed: false }));
        addToast(`Generating video for original image...`, 'info');

        try {
            let publicUrl = originalImage.publicUrl;
            if (!publicUrl) {
                publicUrl = await uploadImageFromDataUrl(originalImage.croppedSrc);
                setOriginalImage(prev => ({ ...prev, publicUrl }));
            }

            const videoSrc = await generateSingleVideoForImage({
                startImageUrl: publicUrl,
                videoPrompt: originalImage.videoPrompt,
                filename: originalImage.filename || 'original',
            });

            setOriginalImage(prev => ({ ...prev, videoSrc, isGeneratingVideo: false }));
            addToast("Video for original image generated!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : `Error generating video for original image.`, 'error');
            setOriginalImage(prev => ({ ...prev, isGeneratingVideo: false, videoGenerationFailed: true }));
        }
    };

    const handleGenerateOriginalDepthMap = async () => {
        if (!originalImage.croppedSrc || originalImage.isGeneratingDepthMap) return;
        logUserAction('GENERATE_ORIGINAL_DEPTH_MAP', { sessionId });
        setOriginalImage(prev => ({ ...prev, isGeneratingDepthMap: true, depthMapGenerationFailed: false }));
        addToast(`Generating depth map for original image...`, 'info');

        try {
            let publicUrl = originalImage.publicUrl;
            if (!publicUrl) {
                publicUrl = await uploadImageFromDataUrl(originalImage.croppedSrc);
                setOriginalImage(prev => ({ ...prev, publicUrl }));
            }

            const depthMapSrc = await generateDepthMap(originalImage.croppedSrc, publicUrl);
            setOriginalImage(prev => ({ ...prev, depthMapSrc, isGeneratingDepthMap: false }));
            addToast("Depth map for original image generated!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : `Error generating depth map for original image.`, 'error');
            setOriginalImage(prev => ({ ...prev, isGeneratingDepthMap: false, depthMapGenerationFailed: true }));
        }
    };

    // --- DOWNLOAD HANDLERS ---

    const handleDownloadSingle = (filename: string) => {
        withMultiDownloadWarning(async () => {
            logUserAction('DOWNLOAD_ARCHITECTURE_SINGLE', { filename, sessionId });
            const image = generatedImages.find(img => img.filename === filename);
            if (!image) {
                addToast("Could not find image to download.", "error");
                return;
            }

            const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));

            try {
                await downloadImageWithMetadata({
                    imageBase64: image.src,
                    filename: `${baseName}.jpg`,
                    prompt: image.imageGenerationPrompt,
                    metadata: {
                        type: "generated_architecture",
                        style: image.style,
                        time: image.time,
                        theme: image.theme,
                        image_generation_prompt: image.imageGenerationPrompt,
                        video_prompt: image.videoPrompt,
                        session_id: sessionId,
                        timestamp: getTimestamp(),
                    },
                    videoUrl: image.videoSrc,
                    videoFilename: `${baseName}.mp4`,
                    depthMapUrl: image.depthMapSrc,
                    depthMapFilename: `depth_map_${baseName}.png`,
                    embedInImage: false,
                    includeMetadataFile: downloadSettings.includeMetadataFiles,
                });
                addToast("Download complete!", "success");
            } catch (err) {
                addToast(err instanceof Error ? err.message : "Error downloading files.", "error");
            }
        });
    };

    const handleDownloadAll = () => {
        withMultiDownloadWarning(async () => {
            if (generatedImages.length === 0 && !originalImage.croppedSrc) {
                addToast("No images to download.", "info");
                return;
            }
            const totalCount = generatedImages.length + (originalImage.croppedSrc ? 1 : 0);
            logUserAction('DOWNLOAD_ARCHITECTURE_ALL', { count: totalCount, sessionId });

            try {
                const images: any[] = [];

                // Add original image if available
                if (originalImage.croppedSrc && originalImage.filename) {
                    const baseName = originalImage.filename.substring(0, originalImage.filename.lastIndexOf('.'));
                    images.push({
                        imageBase64: originalImage.croppedSrc,
                        filename: `${baseName}.jpg`,
                        prompt: 'Original uploaded image before any transformations',
                        metadata: {
                            type: "original_architecture_image",
                            video_prompt: originalImage.videoPrompt,
                        },
                        videoUrl: originalImage.videoSrc,
                        videoFilename: `${baseName}.mp4`,
                        depthMapUrl: originalImage.depthMapSrc,
                        depthMapFilename: `${baseName}.png`,
                    });
                }

                // Add generated images
                generatedImages.forEach(image => {
                    const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));
                    images.push({
                        imageBase64: image.src,
                        filename: `${baseName}.jpg`,
                        prompt: image.imageGenerationPrompt,
                        metadata: {
                            type: "generated_architecture",
                            style: image.style,
                            time: image.time,
                            theme: image.theme,
                            image_generation_prompt: image.imageGenerationPrompt,
                            video_prompt: image.videoPrompt,
                        },
                        videoUrl: image.videoSrc,
                        videoFilename: `${baseName}.mp4`,
                        depthMapUrl: image.depthMapSrc,
                        depthMapFilename: `${baseName}.png`,
                    });
                });

                await downloadBulkImages({
                    images,
                    zipFilename: `AI_Studio_Architecture_${sessionId}_${getTimestamp()}.zip`,
                    progressCallback: setDownloadProgress,
                    embedPrompts: false, // Architecture Studio uses metadata files
                    includeMetadataFiles: downloadSettings.includeMetadataFiles,
                });
            } catch (err) {
                addToast("Error creating ZIP file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    };

    return {
        originalFile,
        setOriginalFile,
        croppedImage,
        setCroppedImage,
        croppedImageAspectRatio,
        setCroppedImageAspectRatio,
        originalImage,
        options,
        setOptions,
        generatedImages,
        pendingImageCount,
        sessionId,
        isPreparing,
        isGeneratingVideos,
        isGeneratingDepthMaps,
        isBusy,
        isGenerateDisabled,
        onCropConfirm,
        handleClearImageAndResults,
        handleGenerate,
        handleGenerateUnstyled,
        handleStartOver,
        handleRegenerateSingle,
        handlePrepareSingleImage,
        handleGenerateSingleVideo,
        handleRemoveGeneratedImage,
        handlePrepareAll,
        handleGenerateAllVideos,
        handleGenerateSingleDepthMap,
        handleGenerateAllDepthMaps,
        handlePrepareOriginal,
        handleGenerateOriginalVideo,
        handleGenerateOriginalDepthMap,
        handleDownloadSingle,
        handleDownloadAll,
    };
};
