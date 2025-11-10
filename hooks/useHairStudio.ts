import { useState, useCallback } from 'react';
import {
    GenerationOptions, Gender, PoseStyle, ColorOption, GeneratedImage, Toast as ToastType, AdornmentOption
} from '../types';
import {
    generateHairstyles, regenerateSingleHairstyle
} from '../services/hairStudioService';
import {
    prepareVideoPrompts,
    generateVideoPromptForImage, enhanceVideoPromptForImage, VideoTask
} from '../services/videoService';
import { dataUrlToBlob } from '../services/geminiClient';
import { generateAllVideos, generateSingleVideoForImage } from '../services/videoService';
import { getTimestamp, generateSetId } from '../services/imageUtils';
import { logUserAction } from '../services/loggingService';
import { uploadImageFromDataUrl } from '../services/imageUploadService';
import { downloadBulkImages } from '../services/downloadService';

declare const JSZip: any;

type HairStudioHookProps = {
    addToast: (message: string, type: ToastType['type']) => void;
    setConfirmAction: (action: any) => void;
    withMultiDownloadWarning: (action: () => void) => void;
    setDownloadProgress: (progress: { visible: boolean; message: string; progress: number }) => void;
    useNanoBananaWebhook: boolean;
};

export const useHairStudio = ({ addToast, setConfirmAction, withMultiDownloadWarning, setDownloadProgress, useNanoBananaWebhook }: HairStudioHookProps) => {
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);
    const [croppedImageAspectRatio, setCroppedImageAspectRatio] = useState<number>(4 / 5);
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

    const isBusy = isPreparing || isGeneratingVideos || pendingImageCount > 0;
    const isGenerateDisabled = !croppedImage;

    const onCropConfirm = (croppedImageDataUrl: string, aspectRatio: number) => {
        const isNewUpload = !croppedImage;
        const applyCrop = () => {
            setCroppedImage(croppedImageDataUrl);
            setCroppedImageAspectRatio(aspectRatio);
            if (isNewUpload) {
                const newSessionId = generateSetId();
                setSessionId(newSessionId);
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
            }
        });
    };

    const handleGenerate = () => {
        if (!croppedImage || !originalFile || !sessionId) return;
        
        const currentOptions = { ...options };
        logUserAction('GENERATE_HAIRSTYLES', { options: currentOptions, sessionId });
        const batchSize = currentOptions.imageCount;
        setPendingImageCount(prev => prev + batchSize);
        const timestamp = getTimestamp();
        setGenerationTimestamp(timestamp);

        generateHairstyles(
            croppedImage, currentOptions, originalFile.name, timestamp, sessionId, useNanoBananaWebhook,
            (newImage) => {
                setGeneratedImages((prev) => [{
                    src: newImage.imageUrl,
                    hairstyle: newImage.hairstyle,
                    color: newImage.color,
                    filename: newImage.filename,
                    imageGenerationPrompt: newImage.imageGenerationPrompt
                }, ...prev]);
            },
            (errorMessage) => addToast(errorMessage, 'error'),
            () => { // onTaskComplete
                setPendingImageCount(prev => Math.max(0, prev - 1));
            }
        ).catch(err => {
            addToast(err instanceof Error ? err.message : 'A top-level generation error occurred.', 'error');
            setPendingImageCount(prev => Math.max(0, prev - batchSize));
        });
    };

    const handleStartOver = () => {
        setConfirmAction({
            title: "Start Over?",
            message: 'This will clear everything. Are you sure?',
            onConfirm: () => {
                logUserAction('START_OVER_HAIR', { sessionId });
                setOriginalFile(null); setCroppedImage(null); setGeneratedImages([]);
                setIsPreparing(false); setIsGeneratingVideos(false);
                setGenerationTimestamp(''); setPendingImageCount(0); 
                setSessionId(null);
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
            const newImage = await regenerateSingleHairstyle(croppedImage, options, originalFile.name, newTimestamp, sessionId, useNanoBananaWebhook);
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
            const imageBlob = dataUrlToBlob(image.src);
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
        if (unpreparedImages.length === 0) {
            addToast("All images are already prepared or being prepared.", "info");
            return;
        }
        logUserAction('PREPARE_HAIR_VIDEO_ALL', { count: unpreparedImages.length, sessionId });
        setIsPreparing(true);
        setGeneratedImages(prev => prev.map(img => unpreparedImages.some(unprepared => unprepared.filename === img.filename) ? { ...img, isPreparing: true } : img));
        addToast(`Preparing ${unpreparedImages.length} video prompts...`, "info");
        try {
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
        }
    };

    const handleGenerateAllVideos = async () => {
        const imagesToProcess = generatedImages.filter(img => !!img.videoPrompt && !img.videoSrc && !img.isGeneratingVideo);
        if (imagesToProcess.length === 0) {
            addToast("All prepared images already have videos or are currently generating.", "info");
            return;
        }
        logUserAction('GENERATE_HAIR_VIDEO_ALL', { count: imagesToProcess.length, sessionId });
        setIsGeneratingVideos(true);
        setGeneratedImages(prev => prev.map(img => imagesToProcess.some(p => p.filename === img.filename) ? { ...img, isGeneratingVideo: true, videoGenerationFailed: false } : img));
        addToast(`Generating ${imagesToProcess.length} videos... This may take some time.`, "info");
        try {
            const videoTasks: VideoTask[] = [];
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
            if (videoTasks.length !== imagesToProcess.length) {
                addToast("Some images failed to upload and were skipped.", "warning");
            }

            if (videoTasks.length > 0) {
                await generateAllVideos(videoTasks,
                    (filename, videoSrc) => setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, videoSrc, isGeneratingVideo: false, videoGenerationFailed: false } : img)),
                    (errorMessage) => {
                        const filenameMatch = errorMessage.match(/Failed on (.*?):/);
                        if (filenameMatch && filenameMatch[1]) {
                            const failedFilename = filenameMatch[1];
                            setGeneratedImages(prev => prev.map(img => img.filename === failedFilename ? { ...img, isGeneratingVideo: false, videoGenerationFailed: true } : img));
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
        }
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

            try {
                await downloadBulkImages({
                    images: [{
                        imageBase64: image.src,
                        filename: `${baseName}.jpg`,
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
                    }],
                    zipFilename: `${baseName}.zip`,
                    progressCallback: setDownloadProgress,
                    embedPrompts: false, // Hair Studio uses metadata files instead
                    includeMetadataFiles: true,
                });
            } catch (err) {
                addToast("Error creating ZIP file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    };

    const handleDownloadAll = () => {
        withMultiDownloadWarning(async () => {
            if (generatedImages.length === 0) {
                addToast("No images to download.", "info");
                return;
            }
            logUserAction('DOWNLOAD_HAIR_ALL', { count: generatedImages.length, sessionId });

            try {
                const images = generatedImages.map(image => {
                    const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));
                    return {
                        imageBase64: image.src,
                        filename: `${baseName}.jpg`,
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
                    };
                });

                await downloadBulkImages({
                    images,
                    zipFilename: `AI_Studio_Hair_${sessionId}_${getTimestamp()}.zip`,
                    progressCallback: setDownloadProgress,
                    embedPrompts: false, // Hair Studio uses metadata files instead
                    includeMetadataFiles: true,
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
        options, setOptions,
        generatedImages,
        pendingImageCount,
        sessionId,
        isPreparing,
        isGeneratingVideos,
        isBusy,
        isGenerateDisabled,
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
        handleDownloadSingle,
        handleDownloadAll,
    };
};