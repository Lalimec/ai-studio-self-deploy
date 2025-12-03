import { useState, useCallback } from 'react';
import {
    BabyGenerationOptions, BabyAge, BabyGender, GeneratedBabyImage, Toast as ToastType, ParentImageState, ImageForVideoProcessing, DownloadSettings, NanoBananaModel, NanoBananaResolution
} from '../types';
import {
    generateBabyImages, generateVideoPromptForBabyImage
} from '../services/babyStudioService';
import { dataUrlToBlob, imageUrlToBase64 } from '../services/geminiClient';
import { uploadImageFromDataUrl } from '../services/imageUploadService';
import { generateAllVideos, generateSingleVideoForImage, generateVideoPromptForImage, prepareVideoPrompts, VideoTask } from '../services/videoService';
import { getTimestamp, generateSetId, sanitizeFilename, getExtensionFromDataUrl } from '../services/imageUtils';
import { logUserAction } from '../services/loggingService';
import { downloadBulkImages, downloadImageWithMetadata } from '../services/downloadService';

declare const JSZip: any;

const initialParentState: Omit<ParentImageState, 'id'> = { file: null, originalSrc: null, croppedSrc: null, videoPrompt: undefined, videoSrc: undefined, isPreparing: false, isGeneratingVideo: false, filename: undefined, publicUrl: undefined };

type BabyStudioHookProps = {
    addToast: (message: string, type: ToastType['type']) => void;
    setConfirmAction: (action: any) => void;
    withMultiDownloadWarning: (action: () => void) => void;
    setDownloadProgress: (progress: { visible: boolean; message: string; progress: number }) => void;
    useNanoBananaWebhook: boolean;
    downloadSettings: DownloadSettings;
};

export const useBabyStudio = ({ addToast, setConfirmAction, withMultiDownloadWarning, setDownloadProgress, useNanoBananaWebhook, downloadSettings }: BabyStudioHookProps) => {
    const [parent1, setParent1] = useState<ParentImageState>({ ...initialParentState, id: 'parent1' });
    const [parent2, setParent2] = useState<ParentImageState>({ ...initialParentState, id: 'parent2' });
    const [options, setOptions] = useState<BabyGenerationOptions>({
        age: BabyAge.Toddler, gender: BabyGender.SurpriseMe,
        composition: [], customComposition: '', useCustomComposition: false,
        background: [], customBackgrounds: '', useCustomBackgrounds: false,
        clothing: [], customClothing: '', useCustomClothing: false,
        action: [], customAction: '', useCustomAction: false,
        imageCount: 8, aspectRatio: 'auto',
    });
    const [generatedImages, setGeneratedImages] = useState<GeneratedBabyImage[]>([]);
    const [pendingImageCount, setPendingImageCount] = useState(0);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
    const [model, setModel] = useState<NanoBananaModel>('nano-banana');
    const [resolution, setResolution] = useState<NanoBananaResolution>('1K');

    const [errors, setErrors] = useState<{ id: string; error: string; prompt?: string; modelResponse?: string }[]>([]);

    const isBusy = pendingImageCount > 0 || isPreparing || isGeneratingVideos || parent1.isPreparing || parent1.isGeneratingVideo || parent2.isPreparing || parent2.isGeneratingVideo;

    const onCropConfirm = (croppedImageDataUrl: string, activeCropper: 'parent1' | 'parent2') => {
        const isNewUpload = activeCropper === 'parent1' ? !parent1.croppedSrc : !parent2.croppedSrc;
        const bothParentsPresentAfter = activeCropper === 'parent1' ? !!parent2.croppedSrc : !!parent1.croppedSrc;

        const applyCrop = () => {
            const updater = (p: ParentImageState): ParentImageState => {
                const newState: ParentImageState = { ...p, croppedSrc: croppedImageDataUrl, publicUrl: undefined }; // Invalidate public URL on recrop
                if (!newState.filename && newState.file) {
                    newState.filename = `parent_image_${newState.id}_${newState.file.name}`;
                }
                return newState;
            };

            if (activeCropper === 'parent1') {
                setParent1(updater);
            } else {
                setParent2(updater);
            }
            if (isNewUpload && bothParentsPresentAfter && !sessionId) {
                setSessionId(generateSetId());
            }
        };

        if (!isNewUpload && generatedImages.length > 0) {
            setConfirmAction({
                title: "Update Parent Photo?",
                message: "Changing a parent's photo will make the current results outdated. Would you like to clear the existing baby photos?",
                confirmText: "Clear & Continue", cancelText: "Keep Results",
                onConfirm: () => {
                    applyCrop();
                    setGeneratedImages([]);
                    setErrors([]);
                    setSessionId(generateSetId());
                },
                onCancel: applyCrop,
            });
        } else {
            applyCrop();
        }
    };

    const handleClearParent = (parent: 'parent1' | 'parent2') => {
        const clearState = () => {
            if (parent === 'parent1') setParent1({ ...initialParentState, id: 'parent1' });
            else setParent2({ ...initialParentState, id: 'parent2' });
        };
        if (generatedImages.length > 0) {
            setConfirmAction({
                title: "Remove Parent Photo?",
                message: "Removing a parent's photo will make the current results outdated. Would you like to clear the existing baby photos?",
                confirmText: "Clear & Remove", cancelText: "Cancel",
                onConfirm: () => {
                    clearState();
                    setGeneratedImages([]);
                    setErrors([]);
                    setSessionId(null);
                },
            });
        } else {
            clearState();
            if ((parent === 'parent1' && !parent2.croppedSrc) || (parent === 'parent2' && !parent1.croppedSrc)) {
                setSessionId(null);
            }
        }
    };

    const handleGenerate = () => {
        if (!parent1.croppedSrc || !parent1.file || !parent2.croppedSrc || !parent2.file || !sessionId) return;

        const currentOptions = { ...options };
        logUserAction('GENERATE_BABY_IMAGES', { options: currentOptions, sessionId });
        const batchSize = currentOptions.imageCount;
        setPendingImageCount(prev => prev + batchSize);

        const timestamp = getTimestamp();

        generateBabyImages(
            parent1.croppedSrc, parent2.croppedSrc, parent1.file, parent2.file,
            currentOptions, sessionId, timestamp, useNanoBananaWebhook, model, resolution,
            (newImage) => {
                setGeneratedImages(prev => [newImage, ...prev]);
                setPendingImageCount(prev => Math.max(0, prev - 1));
            },
            (errorMsg) => {
                // addToast(errorMsg, 'error'); // Don't toast, show card
                setErrors(prev => [...prev, { id: `err-${Date.now()}-${Math.random()}`, error: errorMsg }]);
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
            message: "This will clear all parent photos and generated results. Are you sure?",
            onConfirm: () => {
                setParent1({ ...initialParentState, id: 'parent1' });
                setParent2({ ...initialParentState, id: 'parent2' });
                setGeneratedImages([]);
                setErrors([]);
                setPendingImageCount(0); setSessionId(null);
                setIsPreparing(false); setIsGeneratingVideos(false);
            }
        });
    };

    const handleRemoveError = (id: string) => {
        setErrors(prev => prev.filter(e => e.id !== id));
    };

    const handlePrepareAll = async () => {
        const unpreparedBabies = generatedImages.filter(img => !img.videoPrompt && !img.isPreparing);
        const unpreparedParents: ParentImageState[] = [];
        if (parent1.croppedSrc && !parent1.videoPrompt && !parent1.isPreparing) {
            unpreparedParents.push(parent1);
        }
        if (parent2.croppedSrc && !parent2.videoPrompt && !parent2.isPreparing) {
            unpreparedParents.push(parent2);
        }

        const totalToPrepare = unpreparedBabies.length + unpreparedParents.length;
        if (totalToPrepare === 0) {
            return addToast("All items are already prepared.", "info");
        }

        logUserAction('PREPARE_BABY_VIDEO_ALL', { babyCount: unpreparedBabies.length, parentCount: unpreparedParents.length, sessionId });
        setIsPreparing(true);
        setGeneratedImages(prev => prev.map(img => unpreparedBabies.some(un => un.filename === img.filename) ? { ...img, isPreparing: true } : img));
        unpreparedParents.forEach(p => {
            const setParent = p.id === 'parent1' ? setParent1 : setParent2;
            setParent(prev => ({ ...prev, isPreparing: true }));
        });
        addToast(`Preparing ${totalToPrepare} video prompts...`, "info");

        try {
            // Use unified prepareVideoPrompts with baby-specific prompt generator
            const babyPromises = prepareVideoPrompts(unpreparedBabies,
                (filename, prompt) => setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, videoPrompt: prompt, isPreparing: false } : img)),
                (error) => addToast(error, 'error'),
                { promptGenerator: generateVideoPromptForBabyImage, concurrency: 6 }
            );

            const parentPromises = unpreparedParents.map(async (parent) => {
                try {
                    // Use imageUrlToBase64 to handle both data URLs and HTTPS URLs
                    const imageBlob = await imageUrlToBase64(parent.croppedSrc!);
                    const prompt = await generateVideoPromptForImage(imageBlob);
                    const setParent = parent.id === 'parent1' ? setParent1 : setParent2;
                    setParent(p => ({ ...p, videoPrompt: prompt, isPreparing: false }));
                } catch (error) {
                    addToast(error instanceof Error ? error.message : `Error preparing ${parent.id}.`, 'error');
                }
            });

            await Promise.all([babyPromises, ...parentPromises]);
            addToast("Video prompt preparation complete!", "success");
        } catch (err) { addToast(err instanceof Error ? err.message : 'Error during preparation.', 'error'); }
        finally {
            setIsPreparing(false);
            setGeneratedImages(prev => prev.map(img => img.isPreparing ? { ...img, isPreparing: false } : img));
            setParent1(p => p.isPreparing ? { ...p, isPreparing: false } : p);
            setParent2(p => p.isPreparing ? { ...p, isPreparing: false } : p);
        }
    };

    const ensurePublicUrlForParent = async (parentId: 'parent1' | 'parent2'): Promise<string | null> => {
        const parent = parentId === 'parent1' ? parent1 : parent2;
        const setParent = parentId === 'parent1' ? setParent1 : setParent2;

        if (parent.publicUrl) return parent.publicUrl;
        if (!parent.croppedSrc) return null;

        try {
            const url = await uploadImageFromDataUrl(parent.croppedSrc, parent.filename);
            setParent(p => ({ ...p, publicUrl: url }));
            return url;
        } catch (error) {
            addToast(`Failed to upload image for ${parentId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            return null;
        }
    };

    const ensurePublicUrlForBaby = async (filename: string): Promise<string | null> => {
        const image = generatedImages.find(img => img.filename === filename);
        if (!image) return null;
        if (image.publicUrl) return image.publicUrl;

        try {
            const url = await uploadImageFromDataUrl(image.src, image.filename);
            setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, publicUrl: url } : img));
            return url;
        } catch (error) {
            addToast(`Failed to upload baby image ${image.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            return null;
        }
    };

    const handleGenerateAllVideos = async () => {
        // Find items ready to generate (have prompts, not currently generating)
        const babiesWithPrompts = generatedImages.filter(img => !!img.videoPrompt && !img.isGeneratingVideo);
        const babiesWithoutVideos = babiesWithPrompts.filter(img => !img.videoSrc);
        const babiesWithExistingVideos = babiesWithPrompts.filter(img => img.videoSrc);

        const parentsWithPrompts: ParentImageState[] = [];
        const parentsWithoutVideos: ParentImageState[] = [];
        const parentsWithExistingVideos: ParentImageState[] = [];

        if (parent1.videoPrompt && !parent1.isGeneratingVideo) {
            parentsWithPrompts.push(parent1);
            if (parent1.videoSrc) {
                parentsWithExistingVideos.push(parent1);
            } else {
                parentsWithoutVideos.push(parent1);
            }
        }
        if (parent2.videoPrompt && !parent2.isGeneratingVideo) {
            parentsWithPrompts.push(parent2);
            if (parent2.videoSrc) {
                parentsWithExistingVideos.push(parent2);
            } else {
                parentsWithoutVideos.push(parent2);
            }
        }

        const allWithPromptsCount = babiesWithPrompts.length + parentsWithPrompts.length;
        const existingVideosCount = babiesWithExistingVideos.length + parentsWithExistingVideos.length;

        if (allWithPromptsCount === 0) {
            return addToast("All prepared items have videos or are currently generating.", "info");
        }

        // If there are items with existing videos, warn the user
        if (existingVideosCount > 0) {
            setConfirmAction({
                title: "Regenerate Videos?",
                message: `${existingVideosCount} item(s) already have generated videos. Regenerating will replace the existing videos. Do you want to continue?`,
                confirmText: "Regenerate All",
                confirmVariant: 'primary',
                onConfirm: () => {
                    executeGenerateAllVideos(babiesWithPrompts, parentsWithPrompts);
                },
            });
            return;
        }

        // No existing videos, proceed directly
        executeGenerateAllVideos(babiesWithoutVideos, parentsWithoutVideos);
    };

    const executeGenerateAllVideos = async (babiesToProcess: typeof generatedImages, parentsToProcess: ParentImageState[]) => {
        const allToProcessCount = babiesToProcess.length + parentsToProcess.length;

        logUserAction('GENERATE_BABY_VIDEO_ALL', { count: allToProcessCount, sessionId });
        setIsGeneratingVideos(true);
        setGeneratedImages(prev => prev.map(img => babiesToProcess.some(p => p.filename === img.filename) ? { ...img, isGeneratingVideo: true, videoGenerationFailed: false } : img));
        parentsToProcess.forEach(p => {
            const setParent = p.id === 'parent1' ? setParent1 : setParent2;
            setParent(prev => ({ ...prev, isGeneratingVideo: true, videoGenerationFailed: false }));
        });
        addToast(`Generating ${allToProcessCount} videos...`, "info");

        try {
            const videoTasks: VideoTask[] = [];
            const allItems: (GeneratedBabyImage | ParentImageState)[] = [...babiesToProcess, ...parentsToProcess];

            for (const item of allItems) {
                const isParent = 'id' in item && (item.id === 'parent1' || item.id === 'parent2');
                const filename = isParent ? (item as ParentImageState).id : (item as GeneratedBabyImage).filename;
                let publicUrl: string | null = null;

                if (isParent) {
                    publicUrl = await ensurePublicUrlForParent((item as ParentImageState).id);
                } else {
                    publicUrl = await ensurePublicUrlForBaby((item as GeneratedBabyImage).filename);
                }

                if (publicUrl && item.videoPrompt) {
                    videoTasks.push({
                        startImageUrl: publicUrl,
                        videoPrompt: item.videoPrompt,
                        filename: filename,
                    });
                }
            }

            if (videoTasks.length !== allToProcessCount) {
                addToast("Some images failed to upload and were skipped.", "warning");
            }

            if (videoTasks.length > 0) {
                await generateAllVideos(videoTasks,
                    (filename, videoSrc) => {
                        if (filename === 'parent1' || filename === 'parent2') {
                            const setParent = filename === 'parent1' ? setParent1 : setParent2;
                            setParent(p => ({ ...p, videoSrc, isGeneratingVideo: false, videoGenerationFailed: false }));
                        } else {
                            setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, videoSrc, isGeneratingVideo: false, videoGenerationFailed: false } : img));
                        }
                    },
                    (error) => {
                        const filenameMatch = error.match(/Failed on (.*?):/);
                        if (filenameMatch && filenameMatch[1]) {
                            const failedFilename = filenameMatch[1];
                            if (failedFilename === 'parent1' || failedFilename === 'parent2') {
                                const setParent = failedFilename === 'parent1' ? setParent1 : setParent2;
                                setParent(p => ({ ...p, isGeneratingVideo: false, videoGenerationFailed: true }));
                            } else {
                                setGeneratedImages(prev => prev.map(img => img.filename === failedFilename ? { ...img, isGeneratingVideo: false, videoGenerationFailed: true } : img));
                            }
                        }
                        addToast(error, 'error');
                    }
                );
            }
            addToast("Video generation complete!", "success");
        } catch (err) { addToast(err instanceof Error ? err.message : 'Error during video generation.', 'error'); }
        finally {
            setIsGeneratingVideos(false);
            setGeneratedImages(prev => prev.map(img => ({ ...img, isGeneratingVideo: false })));
            setParent1(p => ({ ...p, isGeneratingVideo: false }));
            setParent2(p => ({ ...p, isGeneratingVideo: false }));
        }
    };

    const handlePrepareSingle = async (filename: string) => {
        const image = generatedImages.find(img => img.filename === filename);
        if (!image || image.isPreparing || image.isGeneratingVideo) return;
        logUserAction('PREPARE_BABY_VIDEO_SINGLE', { filename, sessionId });
        setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, isPreparing: true } : img));
        addToast(`Preparing video prompt...`, 'info');
        try {
            // Use imageUrlToBase64 to handle both data URLs and HTTPS URLs
            const imageBlob = await imageUrlToBase64(image.src);
            const prompt = await generateVideoPromptForBabyImage(imageBlob);
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
        logUserAction('GENERATE_BABY_VIDEO_SINGLE', { filename, sessionId });
        setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, isGeneratingVideo: true, videoGenerationFailed: false } : img));
        addToast(`Generating video... This can take a few minutes.`, 'info');
        try {
            const publicUrl = await ensurePublicUrlForBaby(filename);
            if (!publicUrl) {
                throw new Error("Failed to get public URL for the baby image.");
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
        setGeneratedImages((prev) => prev.filter(img => img.filename !== filenameToRemove));
    };

    const handlePrepareParent = async (parentId: 'parent1' | 'parent2') => {
        const parent = parentId === 'parent1' ? parent1 : parent2;
        const setParent = parentId === 'parent1' ? setParent1 : setParent2;

        if (!parent.croppedSrc || parent.isPreparing || parent.isGeneratingVideo) return;
        logUserAction('PREPARE_PARENT_VIDEO_SINGLE', { parentId, sessionId });
        setParent(p => ({ ...p, isPreparing: true }));
        addToast(`Preparing video prompt for ${parentId}...`, 'info');
        try {
            // Use imageUrlToBase64 to handle both data URLs and HTTPS URLs
            const imageBlob = await imageUrlToBase64(parent.croppedSrc);
            const prompt = await generateVideoPromptForImage(imageBlob);
            setParent(p => ({ ...p, videoPrompt: prompt, isPreparing: false }));
            addToast(`Video prompt for ${parentId} is ready!`, "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : `Error preparing ${parentId}.`, 'error');
            setParent(p => ({ ...p, isPreparing: false }));
        }
    };

    const handleGenerateVideoForParent = async (parentId: 'parent1' | 'parent2') => {
        const parent = parentId === 'parent1' ? parent1 : parent2;
        const setParent = parentId === 'parent1' ? setParent1 : setParent2;

        if (!parent.croppedSrc || !parent.videoPrompt || parent.isGeneratingVideo || parent.isPreparing) {
            addToast("Parent image must be prepared first.", "error");
            return;
        }

        logUserAction('GENERATE_PARENT_VIDEO_SINGLE', { parentId, sessionId });
        setParent(p => ({ ...p, isGeneratingVideo: true, videoGenerationFailed: false }));
        addToast(`Generating video for ${parentId}... This may take a few minutes.`, 'info');

        try {
            const publicUrl = await ensurePublicUrlForParent(parentId);
            if (!publicUrl) {
                throw new Error("Failed to get public URL for the parent image.");
            }
            const fallbackFilename = parent.croppedSrc ? `${parentId}.${getExtensionFromDataUrl(parent.croppedSrc)}` : `${parentId}.jpg`;
            const videoSrc = await generateSingleVideoForImage({
                startImageUrl: publicUrl,
                videoPrompt: parent.videoPrompt,
                filename: parent.filename || fallbackFilename,
            });
            setParent(p => ({ ...p, videoSrc, isGeneratingVideo: false, videoGenerationFailed: false }));
            addToast(`Video for ${parentId} generated!`, "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : `Error generating video for ${parentId}.`, 'error');
            setParent(p => ({ ...p, isGeneratingVideo: false, videoGenerationFailed: true }));
        }
    };

    const handleDownloadParent = (parentId: 'parent1' | 'parent2') => {
        withMultiDownloadWarning(async () => {
            const parentToDownload = parentId === 'parent1' ? parent1 : parent2;
            if (!parentToDownload.croppedSrc) {
                addToast("No image to download.", "error");
                return;
            }

            const timestamp = getTimestamp();
            const originalFilename = parentToDownload.filename || parentId;
            const baseFilename = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            const sanitizedBaseFilename = sanitizeFilename(baseFilename);
            const parentIdString = parentId === 'parent1' ? 'parent-01' : 'parent-02';
            const baseName = `${sessionId}_${parentIdString}_${sanitizedBaseFilename}_${timestamp}`;

            const ext = getExtensionFromDataUrl(parentToDownload.croppedSrc);
            try {
                await downloadImageWithMetadata({
                    imageUrl: parentToDownload.croppedSrc,
                    filename: `${baseName}.${ext}`,
                    metadata: {
                        type: "parent_image",
                        id: parentToDownload.id,
                        video_prompt: parentToDownload.videoPrompt,
                        session_id: sessionId,
                        timestamp: timestamp,
                    },
                    videoUrl: parentToDownload.videoSrc,
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
                    metadata: {
                        type: "generated_baby_image",
                        description: image.description,
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
            const timestamp = getTimestamp();
            const images: any[] = [];

            // Add parent images if available
            if (parent1.croppedSrc) {
                const originalFilename = parent1.filename || 'parent1';
                const baseFilename = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
                const sanitizedBaseFilename = sanitizeFilename(baseFilename);
                const baseName = `${sessionId}_parent-01_${sanitizedBaseFilename}_${timestamp}`;
                const parent1Ext = getExtensionFromDataUrl(parent1.croppedSrc);

                images.push({
                    imageUrl: parent1.croppedSrc,
                    filename: `${baseName}.${parent1Ext}`,
                    metadata: {
                        type: "parent_image",
                        id: parent1.id,
                        video_prompt: parent1.videoPrompt,
                        session_id: sessionId,
                        timestamp,
                    },
                    videoUrl: parent1.videoSrc,
                    videoFilename: `${baseName}.mp4`,
                });
            }

            if (parent2.croppedSrc) {
                const originalFilename = parent2.filename || 'parent2';
                const baseFilename = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
                const sanitizedBaseFilename = sanitizeFilename(baseFilename);
                const baseName = `${sessionId}_parent-02_${sanitizedBaseFilename}_${timestamp}`;
                const parent2Ext = getExtensionFromDataUrl(parent2.croppedSrc);

                images.push({
                    imageUrl: parent2.croppedSrc,
                    filename: `${baseName}.${parent2Ext}`,
                    metadata: {
                        type: "parent_image",
                        id: parent2.id,
                        video_prompt: parent2.videoPrompt,
                        session_id: sessionId,
                        timestamp,
                    },
                    videoUrl: parent2.videoSrc,
                    videoFilename: `${baseName}.mp4`,
                });
            }

            // Add baby images
            for (const image of generatedImages) {
                const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));
                const babyExt = getExtensionFromDataUrl(image.src);
                images.push({
                    imageUrl: image.src,
                    filename: `${baseName}.${babyExt}`,
                    metadata: {
                        type: "generated_baby_image",
                        description: image.description,
                        image_generation_prompt: image.imageGenerationPrompt,
                        video_prompt: image.videoPrompt,
                        session_id: sessionId,
                        timestamp,
                    },
                    videoUrl: image.videoSrc,
                    videoFilename: `${baseName}.mp4`,
                });
            }

            if (images.length === 0) {
                addToast("No images to download.", "info");
                return;
            }

            try {
                await downloadBulkImages({
                    images,
                    zipFilename: `AI_Studio_Baby_${sessionId}_${timestamp}.zip`,
                    progressCallback: setDownloadProgress,
                    embedPrompts: false, // Baby Studio uses metadata files instead
                    includeMetadataFiles: downloadSettings.includeMetadataFiles,
                });
            } catch (err) {
                console.error("Error creating ZIP file for Baby Studio:", err);
                addToast("Error creating ZIP file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    };

    return {
        parent1, setParent1,
        parent2, setParent2,
        initialParentState: { ...initialParentState, id: 'parent1' },
        options, setOptions,
        generatedImages,
        pendingImageCount,
        errors,
        handleRemoveError,
        sessionId,
        isPreparing,
        isGeneratingVideos,
        isBusy,
        onCropConfirm,
        handleClearParent,
        handleGenerate,
        handleStartOver,
        handlePrepareAll,
        handleGenerateAllVideos,
        handlePrepareSingle,
        handleGenerateSingleVideo,
        handleRemoveGeneratedImage,
        handlePrepareParent,
        handleGenerateVideoForParent,
        handleDownloadParent,
        handleDownloadSingle,
        handleDownloadAll,
        model, setModel,
        resolution, setResolution,
    };
};