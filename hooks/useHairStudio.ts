import { useState, useCallback } from 'react';
import {
    GenerationOptions, Gender, PoseStyle, ColorOption, GeneratedImage, Toast as ToastType, AdornmentOption, DownloadSettings, OriginalImageState, NanoBananaModel, NanoBananaResolution
} from '../types';
import {
    generateHairstyles, regenerateSingleHairstyle
} from '../services/hairStudioService';
import {
    prepareVideoPrompts,
    generateVideoPromptForImage, enhanceVideoPromptForImage, VideoTask
} from '../services/videoService';
import { dataUrlToBlob, imageUrlToBase64 } from '../services/geminiClient';
import { generateAllVideos, generateSingleVideoForImage } from '../services/videoService';
import { getTimestamp, generateSetId, getExtensionFromDataUrl } from '../services/imageUtils';
import { logUserAction } from '../services/loggingService';
import { uploadImageFromDataUrl } from '../services/imageUploadService';
import { downloadBulkImages, downloadImageWithMetadata } from '../services/downloadService';

declare const JSZip: any;

type HairStudioHookProps = {
    addToast: (message: string, type: ToastType['type']) => void;
    setConfirmAction: (action: any) => void;
    withMultiDownloadWarning: (action: () => void) => void;
    setDownloadProgress: (progress: { visible: boolean; message: string; progress: number }) => void;
    useNanoBananaWebhook: boolean;
    downloadSettings: DownloadSettings;
};

export const useHairStudio = ({ addToast, setConfirmAction, withMultiDownloadWarning, setDownloadProgress, useNanoBananaWebhook, downloadSettings }: HairStudioHookProps) => {
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);
    const [croppedImageAspectRatio, setCroppedImageAspectRatio] = useState<number>(4 / 5);
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
    });
    const [options, setOptions] = useState<GenerationOptions>({
        gender: Gender.Female,
        hairstyleCategories: [],
        keepOriginalHairstyle: false,
        customHairstyles: '',
        useCustomHairstyles: false,
        colorOptions: [ColorOption.Original],
        customHairColors: '',
        useCustomHairColors: false,
        poseOptions: [PoseStyle.Static],
        customPoses: '',
        useCustomPoses: false,
        adornmentOptions: [AdornmentOption.Original],
        customAdornments: '',
        useCustomAdornments: false,
        imageCount: 12,
        aspectRatio: 'auto',
    });
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [pendingImageCount, setPendingImageCount] = useState(0);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [generationTimestamp, setGenerationTimestamp] = useState<string>('');
    const [isPreparing, setIsPreparing] = useState(false);
    const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
    const [model, setModel] = useState<NanoBananaModel>('nano-banana');
    const [resolution, setResolution] = useState<NanoBananaResolution>('1K');

    const [errors, setErrors] = useState<{ id: string; error: string; prompt?: string; modelResponse?: string }[]>([]);

    const isBusy = isPreparing || isGeneratingVideos || pendingImageCount > 0 || originalImage.isPreparing || originalImage.isGeneratingVideo;
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
                const ext = getExtensionFromDataUrl(croppedImageDataUrl);
                const filename = `${newSessionId}_${sanitizedFilename}_original_${timestamp}.${ext}`;

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
                });
                logUserAction('UPLOAD_HAIR_IMAGE', { sessionId: newSessionId });
            }
        };

        if (!isNewUpload && generatedImages.length > 0) {
            setConfirmAction({
                title: "Recrop Confirmation",
                message: "Recropping works best with new results. Would you like to clear previous results?",
                confirmText: "Clear & Continue", cancelText: "Keep Results",
                onConfirm: () => {
                    const newSessionId = generateSetId();
                    applyCrop();
                    setGeneratedImages([]);
                    setSessionId(newSessionId);
                    logUserAction('RECROP_HAIR_IMAGE', { action: 'clear_and_continue', newSessionId });
                },
                onCancel: () => {
                    applyCrop();
                    logUserAction('RECROP_HAIR_IMAGE', { action: 'keep_results' });
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
                logUserAction('CLEAR_HAIR_IMAGE_AND_RESULTS', { sessionId });
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
                });
            }
        });
    };

    const handleGenerate = () => {
        if (!croppedImage || !originalFile || !sessionId) return;

        const currentOptions = { ...options };
        logUserAction('GENERATE_HAIRSTYLES', { options: currentOptions, sessionId, model, resolution });
        const batchSize = currentOptions.imageCount;
        setPendingImageCount(prev => prev + batchSize);
        const timestamp = getTimestamp();
        setGenerationTimestamp(timestamp);

        generateHairstyles(
            croppedImage, currentOptions, originalFile.name, timestamp, sessionId, useNanoBananaWebhook, model, resolution,
            (newImage) => {
                setGeneratedImages((prev) => [{
                    src: newImage.imageUrl,
                    hairstyle: newImage.hairstyle,
                    color: newImage.color,
                    filename: newImage.filename,
                    imageGenerationPrompt: newImage.imageGenerationPrompt
                }, ...prev]);
            },
            (errorMessage) => {
                // addToast(errorMessage, 'error'); // Don't toast, show card
                setErrors(prev => [...prev, { id: `err-${Date.now()}-${Math.random()}`, error: errorMessage }]);
            },
            () => { // onTaskComplete
                setPendingImageCount(prev => Math.max(0, prev - 1));
            }
        ).catch(err => {
            addToast(err instanceof Error ? err.message : 'A top-level generation error occurred.', 'error');
            setPendingImageCount(prev => Math.max(0, prev - batchSize));
        });
    };

    const handleRemoveError = (id: string) => {
        setErrors(prev => prev.filter(e => e.id !== id));
    };

    const handleStartOver = () => {
        setConfirmAction({
            title: "Start Over?",
            message: 'This will clear everything. Are you sure?',
            onConfirm: () => {
                logUserAction('START_OVER_HAIR', { sessionId });
                setOriginalFile(null); setCroppedImage(null); setGeneratedImages([]);
                setErrors([]);
                setIsPreparing(false); setIsGeneratingVideos(false);
                setGenerationTimestamp(''); setPendingImageCount(0);
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
                });
            },
        });
    };

    const handleRegenerateSingle = async (filename: string) => {
        if (!croppedImage || !originalFile || !sessionId) {
            addToast("Cannot regenerate without a base image and session.", "error");
            return;
        }
        logUserAction('REGENERATE_HAIRSTYLE', { filename, sessionId });
        setGeneratedImages(prev => prev.map(img =>
            img.filename === filename ? { ...img, isRegenerating: true } : img
        ));

        try {
            const newTimestamp = getTimestamp();
            const newImage = await regenerateSingleHairstyle(croppedImage, options, originalFile.name, newTimestamp, sessionId, useNanoBananaWebhook, model, resolution);
            setGeneratedImages(prev => prev.map(img =>
                img.filename === filename ? {
                    src: newImage.imageUrl,
                    hairstyle: newImage.hairstyle,
                    color: newImage.color,
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
        logUserAction('PREPARE_HAIR_VIDEO_SINGLE', { filename, sessionId });
        setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, isPreparing: true } : img));
        addToast(`Preparing video prompt...`, 'info');
        try {
            // Use imageUrlToBase64 to handle both data URLs and HTTPS URLs
            const imageBlob = await imageUrlToBase64(image.src);
            const prompt = await generateVideoPromptForImage(imageBlob);
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
        logUserAction('GENERATE_HAIR_VIDEO_SINGLE', { filename, sessionId });
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
        logUserAction('REMOVE_HAIR_IMAGE', { filename: filenameToRemove, sessionId });
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
        logUserAction('PREPARE_HAIR_VIDEO_ALL', { count: totalCount, sessionId });
        setIsPreparing(true);
        setGeneratedImages(prev => prev.map(img => unpreparedImages.some(unprepared => unprepared.filename === img.filename) ? { ...img, isPreparing: true } : img));
        if (needsOriginalPrep) {
            setOriginalImage(prev => ({ ...prev, isPreparing: true }));
        }
        addToast(`Preparing ${totalCount} video prompts...`, "info");
        try {
            // Prepare original image if needed
            if (needsOriginalPrep) {
                try {
                    // Use imageUrlToBase64 to handle both data URLs and HTTPS URLs
                    const imageBlob = await imageUrlToBase64(originalImage.croppedSrc!);
                    const prompt = await generateVideoPromptForImage(imageBlob);
                    setOriginalImage(prev => ({ ...prev, videoPrompt: prompt, isPreparing: false }));
                } catch (error) {
                    console.error('Failed to generate video prompt for original image:', error);
                    addToast(`Failed on original image: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                    setOriginalImage(prev => ({ ...prev, isPreparing: false }));
                }
            }

            await prepareVideoPrompts(unpreparedImages,
                (filename, prompt) => setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, videoPrompt: prompt, isPreparing: false } : img)),
                (errorMessage) => addToast(errorMessage, 'error')
            );
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
        logUserAction('GENERATE_HAIR_VIDEO_ALL', { count: totalCount, sessionId });
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

    // --- ORIGINAL IMAGE HANDLERS ---

    const handlePrepareOriginal = async () => {
        if (!originalImage.croppedSrc || originalImage.isPreparing || originalImage.isGeneratingVideo) return;
        logUserAction('PREPARE_ORIGINAL_VIDEO_HAIR', { sessionId });
        setOriginalImage(prev => ({ ...prev, isPreparing: true }));
        addToast(`Preparing video prompt for original image...`, 'info');
        try {
            // Use imageUrlToBase64 to handle both data URLs and HTTPS URLs
            const imageBlob = await imageUrlToBase64(originalImage.croppedSrc);
            const prompt = await generateVideoPromptForImage(imageBlob);
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
        logUserAction('GENERATE_ORIGINAL_VIDEO_HAIR', { sessionId });
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

    // --- DOWNLOAD HANDLERS ---

    const handleDownloadOriginal = () => {
        withMultiDownloadWarning(async () => {
            if (!originalImage.croppedSrc || !originalImage.filename) {
                addToast("No original image to download.", "error");
                return;
            }

            logUserAction('DOWNLOAD_HAIR_ORIGINAL', { filename: originalImage.filename, sessionId });

            const baseName = originalImage.filename.substring(0, originalImage.filename.lastIndexOf('.'));
            const ext = getExtensionFromDataUrl(originalImage.croppedSrc);

            try {
                await downloadImageWithMetadata({
                    imageUrl: originalImage.croppedSrc,
                    filename: `${baseName}.${ext}`,
                    prompt: 'Original uploaded image before any transformations',
                    metadata: {
                        type: "original_hair_image",
                        video_prompt: originalImage.videoPrompt,
                        session_id: sessionId,
                        timestamp: getTimestamp(),
                    },
                    videoUrl: originalImage.videoSrc,
                    videoFilename: `${baseName}.mp4`,
                    embedInImage: false,
                    includeMetadataFile: downloadSettings.includeMetadataFiles,
                });
                addToast("Download complete!", "success");
            } catch (err) {
                addToast(err instanceof Error ? err.message : "Error downloading files.", "error");
            }
        });
    };

    const handleDownloadSingle = (filename: string) => {
        withMultiDownloadWarning(async () => {
            logUserAction('DOWNLOAD_HAIR_SINGLE', { filename, sessionId });
            const image = generatedImages.find(img => img.filename === filename);
            if (!image) {
                addToast("Could not find image to download.", "error");
                return;
            }

            const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));
            const ext = getExtensionFromDataUrl(image.src);

            try {
                await downloadImageWithMetadata({
                    imageUrl: image.src,
                    filename: `${baseName}.${ext}`,
                    prompt: image.imageGenerationPrompt,
                    metadata: {
                        type: "generated_hairstyle",
                        hairstyle: image.hairstyle.name,
                        color: image.color,
                        image_generation_prompt: image.imageGenerationPrompt,
                        video_prompt: image.videoPrompt,
                        session_id: sessionId,
                        timestamp: getTimestamp(),
                    },
                    videoUrl: image.videoSrc,
                    videoFilename: `${baseName}.mp4`,
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
            logUserAction('DOWNLOAD_HAIR_ALL', { count: totalCount, sessionId });

            try {
                const images: any[] = [];

                // Add original image if available
                if (originalImage.croppedSrc && originalImage.filename) {
                    const baseName = originalImage.filename.substring(0, originalImage.filename.lastIndexOf('.'));
                    const origExt = getExtensionFromDataUrl(originalImage.croppedSrc);
                    images.push({
                        imageUrl: originalImage.croppedSrc,
                        filename: `${baseName}.${origExt}`,
                        prompt: 'Original uploaded image before any transformations',
                        metadata: {
                            type: "original_hair_image",
                            video_prompt: originalImage.videoPrompt,
                        },
                        videoUrl: originalImage.videoSrc,
                        videoFilename: `${baseName}.mp4`,
                    });
                }

                // Add generated images
                generatedImages.forEach(image => {
                    const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));
                    const imgExt = getExtensionFromDataUrl(image.src);
                    images.push({
                        imageUrl: image.src,
                        filename: `${baseName}.${imgExt}`,
                        prompt: image.imageGenerationPrompt,
                        metadata: {
                            type: "generated_hairstyle",
                            hairstyle: image.hairstyle.name,
                            color: image.color,
                            image_generation_prompt: image.imageGenerationPrompt,
                            video_prompt: image.videoPrompt,
                        },
                        videoUrl: image.videoSrc,
                        videoFilename: `${baseName}.mp4`,
                    });
                });

                await downloadBulkImages({
                    images,
                    zipFilename: `AI_Studio_Hair_${sessionId}_${getTimestamp()}.zip`,
                    progressCallback: setDownloadProgress,
                    embedPrompts: false, // Hair Studio uses metadata files instead
                    includeMetadataFiles: downloadSettings.includeMetadataFiles,
                });
            } catch (err) {
                addToast("Error creating ZIP file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    };

    return {
        originalFile, setOriginalFile,
        croppedImage, setCroppedImage,
        croppedImageAspectRatio, setCroppedImageAspectRatio,
        originalImage,
        options, setOptions,
        generatedImages,
        pendingImageCount,
        sessionId,
        isPreparing,
        isGeneratingVideos,
        isBusy,
        isGenerateDisabled,
        model, setModel,
        resolution, setResolution,
        onCropConfirm,
        handleClearImageAndResults,
        handleGenerate,
        handleStartOver,
        handleRegenerateSingle,
        handlePrepareSingleImage,
        handleGenerateSingleVideo,
        handleRemoveGeneratedImage,
        handlePrepareAll,
        handleGenerateAllVideos,
        handlePrepareOriginal,
        handleGenerateOriginalVideo,
        handleDownloadOriginal,
        handleDownloadSingle,
        handleDownloadAll,
        errors,
        handleRemoveError,
    };
};