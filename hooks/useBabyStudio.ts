import { useState, useCallback } from 'react';
import { 
    BabyGenerationOptions, BabyAge, BabyGender, GeneratedBabyImage, Toast as ToastType, ParentImageState, ImageForVideoProcessing 
} from '../types';
import { 
    generateBabyImages, prepareBabyVideoPrompts, generateVideoPromptForBabyImage
} from '../services/babyStudioService';
import { dataUrlToBlob } from '../services/geminiClient';
import { uploadImageFromDataUrl } from '../services/imageUploadService';
import { generateAllVideos, generateSingleVideoForImage, generateVideoPromptForImage, VideoTask } from '../services/videoService';
import { getTimestamp, generateSetId, sanitizeFilename } from '../services/imageUtils';
import { logUserAction } from '../services/loggingService';

declare const JSZip: any;

const initialParentState: Omit<ParentImageState, 'id'> = { file: null, originalSrc: null, croppedSrc: null, videoPrompt: undefined, videoSrc: undefined, isPreparing: false, isGeneratingVideo: false, filename: undefined, publicUrl: undefined };

type BabyStudioHookProps = {
    addToast: (message: string, type: ToastType['type']) => void;
    setConfirmAction: (action: any) => void;
    withMultiDownloadWarning: (action: () => void) => void;
    setDownloadProgress: (progress: { visible: boolean; message: string; progress: number }) => void;
    useNanoBananaWebhook: boolean;
};

export const useBabyStudio = ({ addToast, setConfirmAction, withMultiDownloadWarning, setDownloadProgress, useNanoBananaWebhook }: BabyStudioHookProps) => {
    const [parent1, setParent1] = useState<ParentImageState>({...initialParentState, id: 'parent1'});
    const [parent2, setParent2] = useState<ParentImageState>({...initialParentState, id: 'parent2'});
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
            if (parent === 'parent1') setParent1({...initialParentState, id: 'parent1'});
            else setParent2({...initialParentState, id: 'parent2'});
        };
        if (generatedImages.length > 0) {
            setConfirmAction({
                title: "Remove Parent Photo?",
                message: "Removing a parent's photo will make the current results outdated. Would you like to clear the existing baby photos?",
                confirmText: "Clear & Remove", cancelText: "Cancel",
                onConfirm: () => {
                    clearState();
                    setGeneratedImages([]);
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
            currentOptions, sessionId, timestamp, useNanoBananaWebhook,
            (newImage) => {
                setGeneratedImages(prev => [newImage, ...prev]);
                setPendingImageCount(prev => Math.max(0, prev - 1));
            },
            (errorMsg) => {
                addToast(errorMsg, 'error');
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
                setParent1({...initialParentState, id: 'parent1'}); 
                setParent2({...initialParentState, id: 'parent2'});
                setGeneratedImages([]); 
                setPendingImageCount(0); setSessionId(null);
                setIsPreparing(false); setIsGeneratingVideos(false);
            }
        });
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
            const babyPromises = prepareBabyVideoPrompts(unpreparedBabies,
                (filename, prompt) => setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, videoPrompt: prompt, isPreparing: false } : img)),
                (error) => addToast(error, 'error')
            );
            
            const parentPromises = unpreparedParents.map(async (parent) => {
                try {
                    const imageBlob = dataUrlToBlob(parent.croppedSrc!);
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
            setParent1(p => p.isPreparing ? {...p, isPreparing: false} : p);
            setParent2(p => p.isPreparing ? {...p, isPreparing: false} : p);
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
        const babiesToProcess = generatedImages.filter(img => !!img.videoPrompt && !img.videoSrc && !img.isGeneratingVideo);
        
        const parentsToProcess: ParentImageState[] = [];
        if (parent1.videoPrompt && !parent1.videoSrc && !parent1.isGeneratingVideo) {
            parentsToProcess.push(parent1);
        }
        if (parent2.videoPrompt && !parent2.videoSrc && !parent2.isGeneratingVideo) {
            parentsToProcess.push(parent2);
        }
    
        const allToProcessCount = babiesToProcess.length + parentsToProcess.length;
    
        if (allToProcessCount === 0) {
            return addToast("All prepared items have videos or are currently generating.", "info");
        }
    
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
                
                if(publicUrl && item.videoPrompt) {
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

            if(videoTasks.length > 0) {
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
            setParent1(p => ({...p, isGeneratingVideo: false}));
            setParent2(p => ({...p, isGeneratingVideo: false}));
        }
    };

    const handlePrepareSingle = async (filename: string) => {
        const image = generatedImages.find(img => img.filename === filename);
        if (!image || image.isPreparing || image.isGeneratingVideo) return;
        logUserAction('PREPARE_BABY_VIDEO_SINGLE', { filename, sessionId });
        setGeneratedImages(prev => prev.map(img => img.filename === filename ? { ...img, isPreparing: true } : img));
        addToast(`Preparing video prompt...`, 'info');
        try {
            const imageBlob = dataUrlToBlob(image.src);
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
            const imageBlob = dataUrlToBlob(parent.croppedSrc);
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
            const videoSrc = await generateSingleVideoForImage({
                startImageUrl: publicUrl,
                videoPrompt: parent.videoPrompt,
                filename: parent.filename || `${parentId}.jpg`,
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

            setDownloadProgress({ visible: true, message: `Preparing: ${baseName}.zip`, progress: 0 });

            try {
                const zip = new JSZip();

                zip.file(`${baseName}.jpg`, parentToDownload.croppedSrc.split(',')[1], { base64: true });
                setDownloadProgress({ visible: true, message: 'Adding image...', progress: 33 });

                if (parentToDownload.videoSrc) {
                    const videoBlob = await fetch(parentToDownload.videoSrc).then(res => res.blob());
                    zip.file(`${baseName}.mp4`, videoBlob);
                    setDownloadProgress({ visible: true, message: 'Adding video...', progress: 66 });
                }

                const info = {
                    type: "parent_image",
                    id: parentToDownload.id,
                    video_prompt: parentToDownload.videoPrompt,
                    session_id: sessionId,
                    timestamp: timestamp,
                };
                zip.file(`${baseName}_info.txt`, JSON.stringify(info, null, 2));
                setDownloadProgress({ visible: true, message: 'Compressing...', progress: 90 });

                const content = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `${baseName}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);

                setDownloadProgress({ visible: false, message: '', progress: 0 });
            } catch (err) {
                addToast("Error creating ZIP file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
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

            setDownloadProgress({ visible: true, message: `Preparing: ${baseName}.zip`, progress: 0 });

            try {
                const zip = new JSZip();

                zip.file(`${baseName}.jpg`, image.src.split(',')[1], { base64: true });
                setDownloadProgress({ visible: true, message: 'Adding image...', progress: 33 });

                if (image.videoSrc) {
                    const videoBlob = await fetch(image.videoSrc).then(res => res.blob());
                    zip.file(`${baseName}.mp4`, videoBlob);
                    setDownloadProgress({ visible: true, message: 'Adding video...', progress: 66 });
                }

                const info = {
                    type: "generated_baby_image",
                    description: image.description,
                    image_generation_prompt: image.imageGenerationPrompt,
                    video_prompt: image.videoPrompt,
                    session_id: sessionId,
                    timestamp: getTimestamp(),
                };
                zip.file(`${baseName}_info.txt`, JSON.stringify(info, null, 2));
                setDownloadProgress({ visible: true, message: 'Compressing...', progress: 90 });

                const content = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `${baseName}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);

                setDownloadProgress({ visible: false, message: '', progress: 0 });
            } catch (err) {
                addToast("Error creating ZIP file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    };

    const handleDownloadAll = () => {
        withMultiDownloadWarning(async () => {
            const itemsToDownload = [
                ...(parent1.croppedSrc ? [parent1] : []),
                ...(parent2.croppedSrc ? [parent2] : []),
                ...generatedImages
            ];

            if (itemsToDownload.length === 0) {
                addToast("No images to download.", "info");
                return;
            }

            const timestamp = getTimestamp();
            setDownloadProgress({ visible: true, message: 'Starting download...', progress: 0 });

            try {
                const zip = new JSZip();
                let filesProcessed = 0;
                const totalFiles = itemsToDownload.length;

                const processItem = async (item: GeneratedBabyImage | ParentImageState) => {
                    const isParent = 'id' in item && (item.id === 'parent1' || item.id === 'parent2');
                    let baseName: string;
                    
                    if (isParent) {
                        const parentItem = item as ParentImageState;
                        const parentIdString = parentItem.id === 'parent1' ? 'parent-01' : 'parent-02';
                        const originalFilename = parentItem.filename || parentItem.id;
                        const baseFilename = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
                        const sanitizedBaseFilename = sanitizeFilename(baseFilename);
                        baseName = `${sessionId}_${parentIdString}_${sanitizedBaseFilename}_${timestamp}`;
                    } else {
                        const babyItem = item as GeneratedBabyImage;
                        baseName = babyItem.filename.substring(0, babyItem.filename.lastIndexOf('.'));
                    }

                    const src = 'croppedSrc' in item && item.croppedSrc ? item.croppedSrc : ('src' in item ? item.src : null);

                    if (src) {
                        zip.file(`${baseName}.jpg`, src.split(',')[1], { base64: true });
                    }

                    if (item.videoSrc) {
                        const videoBlob = await fetch(item.videoSrc).then(res => res.blob());
                        zip.file(`${baseName}.mp4`, videoBlob);
                    }

                    const info = isParent ? {
                        type: "parent_image", id: (item as ParentImageState).id, video_prompt: item.videoPrompt,
                    } : {
                        type: "generated_baby_image", description: (item as GeneratedBabyImage).description,
                        image_generation_prompt: (item as GeneratedBabyImage).imageGenerationPrompt,
                        video_prompt: item.videoPrompt,
                    };
                    zip.file(`${baseName}_info.txt`, JSON.stringify({...info, session_id: sessionId, timestamp }, null, 2));
                    
                    filesProcessed++;
                    setDownloadProgress({ 
                        visible: true, 
                        message: `Zipping: ${baseName}`, 
                        progress: (filesProcessed / totalFiles) * 100 
                    });
                };

                await Promise.all(itemsToDownload.map(processItem));
                
                setDownloadProgress({ visible: true, message: 'Compressing ZIP...', progress: 99 });
                const content = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `AI_Studio_Baby_${sessionId}_${timestamp}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);

                setDownloadProgress({ visible: false, message: '', progress: 0 });

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
        initialParentState: {...initialParentState, id: 'parent1'},
        options, setOptions,
        generatedImages,
        pendingImageCount,
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
    };
};