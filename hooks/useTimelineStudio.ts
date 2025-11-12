/// <reference lib="dom" />
import { useState, useCallback, useEffect } from 'react';
import { StudioImage, TimelinePair, Toast as ToastType, TimelinePairWithImages, ImageForVideoProcessing } from '../types';
import { translateTextToEnglish, generateTimelineTransitionPrompt, prepareAllTimelinePrompts, enhanceGeneralPrompt } from '../services/timelineStudioService';
import { dataUrlToBlob } from '../services/geminiClient';
import { uploadImageFromDataUrl } from '../services/imageUploadService';
import { generateAllVideos, generateSingleVideoForImage, VideoTask } from '../services/videoService';
import { generateSetId, generateShortId, getTimestamp } from '../services/imageUtils';
import { stitchVideos } from '../services/videoStitcher';
import { logUserAction } from '../services/loggingService';

declare const JSZip: any;

type TimelineStudioHookProps = {
    addToast: (message: string, type: ToastType['type']) => void;
    setConfirmAction: (action: any) => void;
    setDownloadProgress: (progress: { visible: boolean; message: string; progress: number }) => void;
    withMultiDownloadWarning: (action: () => void) => void;
};

export const useTimelineStudio = ({ addToast, setConfirmAction, setDownloadProgress, withMultiDownloadWarning }: TimelineStudioHookProps) => {
    const [timelineImages, setTimelineImages] = useState<StudioImage[]>([]);
    const [timelinePairs, setTimelinePairs] = useState<TimelinePair[]>([]);
    const [timelineAspectRatio, setTimelineAspectRatio] = useState<number>(4 / 5);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [generalPrompt, setGeneralPrompt] = useState<string>('');
    const [isPreparingAll, setIsPreparingAll] = useState(false);
    const [isGeneratingAllVideos, setIsGeneratingAllVideos] = useState(false);
    
    // State for the cropping workflow
    const [filesForCrop, setFilesForCrop] = useState<File[] | null>(null);
    const [showCropChoice, setShowCropChoice] = useState(false);
    const [isCropping, setIsCropping] = useState(false);
    
    // State for the lightbox
    const [lightboxPairIndex, setLightboxPairIndex] = useState<number | null>(null);
    const isLightboxOpen = lightboxPairIndex !== null;

    // State for the stitched video player and process
    const [isStitching, setIsStitching] = useState(false);
    const [stitchedVideoUrl, setStitchedVideoUrl] = useState<string | null>(null);

    const enabledPairs = timelinePairs.filter(p => !p.isDisabled);
    const allVideosGenerated = enabledPairs.length > 0 && enabledPairs.every(p => !!p.videoSrc);

    const isBusy = isCropping || showCropChoice || isPreparingAll || isGeneratingAllVideos || isLightboxOpen || isStitching;

    useEffect(() => {
        const newPairs: TimelinePair[] = [];
        const oldPairsMap = new Map<string, TimelinePair>(timelinePairs.map(p => [`${p.startImageId}-${p.endImageId}`, p]));

        for (let i = 0; i < timelineImages.length - 1; i++) {
            const startImage = timelineImages[i];
            const endImage = timelineImages[i + 1];
            const pairKey = `${startImage.id}-${endImage.id}`;
            const existingPair = oldPairsMap.get(pairKey);
            
            newPairs.push({
                id: existingPair?.id || `pair-${generateShortId()}-${Date.now()}`,
                startImageId: startImage.id,
                endImageId: endImage.id,
                videoPrompt: existingPair?.videoPrompt || '',
                isPreparing: existingPair?.isPreparing,
                isGeneratingVideo: existingPair?.isGeneratingVideo,
                videoSrc: existingPair?.videoSrc,
                isDisabled: existingPair?.isDisabled || false,
            });
        }
        setTimelinePairs(newPairs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timelineImages]);

    const handleImagesUpload = (files: File[]) => {
        if (files.length === 0) return;
        if (timelineImages.length > 0) {
             setConfirmAction({
                title: "Add to Timeline?",
                message: "This will add the new images to the end of your current sequence.",
                confirmText: "Add Images",
                confirmVariant: 'primary',
                onConfirm: () => {
                    setFilesForCrop(files);
                    setShowCropChoice(true);
                }
            });
        } else {
            setFilesForCrop(files);
            setShowCropChoice(true);
        }
    };

    const addFilesToTimeline = (files: File[]) => {
        const newImages = files.map(file => ({ file, src: URL.createObjectURL(file) }));
        
        Promise.all(newImages.map(img => 
            fetch(img.src).then(res => res.blob()).then(blob => 
                new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                }).finally(() => URL.revokeObjectURL(img.src))
            ).then(dataUrl => ({ ...img, src: dataUrl }))
        )).then(imagesWithDataUrls => {
            if (!sessionId) setSessionId(generateSetId());
            const finalImages: StudioImage[] = imagesWithDataUrls.map(img => {
                const shortId = generateShortId();
                const baseName = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || img.file.name;
                const extension = img.file.name.substring(img.file.name.lastIndexOf('.') + 1);
                const finalFilename = baseName.replace(/^cropped_/, '');
                return {
                    id: `tl-${shortId}-${Date.now()}`,
                    src: img.src,
                    file: img.file,
                    filename: `${finalFilename}_${shortId}.${extension}`,
                };
            });
            setTimelineImages(prev => [...prev, ...finalImages]);
        });
    };

    const handleCropChoice = (choice: 'crop') => {
        if (choice === 'crop') {
            setIsCropping(true);
        }
        setShowCropChoice(false);
    };
    
    const handleCropConfirm = (croppedFiles: File[], aspectRatio: number) => {
        if (timelineImages.length === 0) {
            setTimelineAspectRatio(aspectRatio);
        }
        addFilesToTimeline(croppedFiles);
        setIsCropping(false);
        setFilesForCrop(null);
    };

    const handleCropCancel = () => {
        setIsCropping(false);
        setFilesForCrop(null);
    };
    
    const handleReorderImages = useCallback((newOrder: StudioImage[]) => {
        setTimelineImages(newOrder);
    }, []);

    const handleRemoveImage = (idToRemove: string) => {
        const index = timelineImages.findIndex(img => img.id === idToRemove);
        if (index === -1) return;

        const affectedPairs: (TimelinePair | undefined)[] = [];
        if (index > 0) { // Pair before the image
            affectedPairs.push(timelinePairs.find(p => p.endImageId === idToRemove));
        }
        if (index < timelineImages.length - 1) { // Pair after the image
            affectedPairs.push(timelinePairs.find(p => p.startImageId === idToRemove));
        }

        const pairsWithContent = affectedPairs.filter(p => p && (p.videoPrompt || p.videoSrc));

        const performRemove = () => {
            setTimelineImages(prev => prev.filter(image => image.id !== idToRemove));
            addToast("Image removed.", "success");
        };

        if (pairsWithContent.length > 0) {
            setConfirmAction({
                title: "Remove Image?",
                message: `Removing this image will also delete ${pairsWithContent.length} pair(s) with generated prompts or videos. Are you sure?`,
                confirmText: "Remove",
                onConfirm: performRemove
            });
        } else {
            performRemove();
        }
    };

    const handleSendToStart = (id: string) => {
        const index = timelineImages.findIndex(img => img.id === id);
        if (index <= 0) return;
    
        const imageToMove = timelineImages[index];
    
        const pairBefore = timelinePairs[index - 1];
        const pairAfter = (index < timelineImages.length - 1) ? timelinePairs[index] : undefined;
    
        const affectedPairs = [pairBefore, pairAfter].filter((p): p is TimelinePair => !!p);
        const pairsWithContent = affectedPairs.filter(p => p.videoPrompt || p.videoSrc);
    
        const performMove = () => {
            setTimelineImages(prev => {
                const others = prev.filter(img => img.id !== id);
                return [imageToMove, ...others];
            });
        };
    
        if (pairsWithContent.length > 0) {
            setConfirmAction({
                title: "Reorder Image?",
                message: `Moving this image to the start will delete ${pairsWithContent.length} pair(s) with generated content. Are you sure?`,
                confirmText: "Move to Start",
                onConfirm: performMove,
            });
        } else {
            performMove();
        }
    };
    
    const handleSendToEnd = (id: string) => {
        const index = timelineImages.findIndex(img => img.id === id);
        if (index === -1 || index === timelineImages.length - 1) return;
    
        const imageToMove = timelineImages[index];
    
        const pairBefore = index > 0 ? timelinePairs[index - 1] : undefined;
        const pairAfter = timelinePairs[index];
    
        const affectedPairs = [pairBefore, pairAfter].filter((p): p is TimelinePair => !!p);
        const pairsWithContent = affectedPairs.filter(p => p.videoPrompt || p.videoSrc);
    
        const performMove = () => {
            setTimelineImages(prev => {
                const others = prev.filter(img => img.id !== id);
                return [...others, imageToMove];
            });
        };
        
        if (pairsWithContent.length > 0) {
            setConfirmAction({
                title: "Reorder Image?",
                message: `Moving this image to the end will delete ${pairsWithContent.length} pair(s) with generated content. Are you sure?`,
                confirmText: "Move to End",
                onConfirm: performMove,
            });
        } else {
            performMove();
        }
    };
    
    const handleUpdatePairPrompt = (pairId: string, newPrompt: string) => {
        setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, videoPrompt: newPrompt } : p));
    };

    const findImageById = useCallback((id: string) => timelineImages.find(img => img.id === id), [timelineImages]);

    const handleEnhancePairPrompt = async (pairId: string) => {
        const pair = timelinePairs.find(p => p.id === pairId);
        const startImage = pair ? findImageById(pair.startImageId) : undefined;
        const endImage = pair ? findImageById(pair.endImageId) : undefined;

        if (!pair || !pair.videoPrompt || !startImage || !endImage) return;

        setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, isPreparing: true } : p));
        addToast("Enhancing transition prompt...", "info");
        try {
            const startImageBlob = dataUrlToBlob(startImage.src);
            const endImageBlob = dataUrlToBlob(endImage.src);
            const newPrompt = await generateTimelineTransitionPrompt(startImageBlob, endImageBlob, pair.videoPrompt);
            setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, videoPrompt: newPrompt, isPreparing: false } : p));
            addToast("Prompt enhanced!", "success");
        } catch (e) {
            addToast(e instanceof Error ? e.message : 'Enhancement failed', 'error');
            setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, isPreparing: false } : p));
        }
    };

    const handleTranslatePairPrompt = async (pairId: string) => {
        const pair = timelinePairs.find(p => p.id === pairId);
        if (!pair || !pair.videoPrompt) return;

        setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, isPreparing: true } : p));
        addToast("Translating transition prompt...", "info");
        try {
            const newPrompt = await translateTextToEnglish(pair.videoPrompt);
            setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, videoPrompt: newPrompt, isPreparing: false } : p));
            addToast("Prompt translated!", "success");
        } catch (e) {
            addToast(e instanceof Error ? e.message : 'Translation failed', 'error');
            setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, isPreparing: false } : p));
        }
    };

    const ensurePublicUrlForImage = async (imageId: string): Promise<string | null> => {
        const image = timelineImages.find(img => img.id === imageId);
        if (!image) return null;
        if (image.publicUrl) return image.publicUrl;

        try {
            const url = await uploadImageFromDataUrl(image.src, image.filename);
            setTimelineImages(prev => prev.map(img => img.id === imageId ? { ...img, publicUrl: url } : img));
            return url;
        } catch (error) {
            addToast(`Failed to upload image ${image.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            return null;
        }
    };

    const handleGenerateSingleVideo = async (pairId: string) => {
        const pair = timelinePairs.find(p => p.id === pairId);
        if (!pair || !pair.videoPrompt || pair.isGeneratingVideo || pair.isPreparing) {
            addToast("Pair must have a prompt and not be busy.", "error");
            return;
        }

        logUserAction('GENERATE_TIMELINE_VIDEO_SINGLE', { pairId, sessionId });
        setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, isGeneratingVideo: true, videoGenerationFailed: false } : p));
        addToast(`Generating video... This can take a few minutes.`, 'info');
        try {
            const startImageUrl = await ensurePublicUrlForImage(pair.startImageId);
            const endImageUrl = await ensurePublicUrlForImage(pair.endImageId);

            if (!startImageUrl || !endImageUrl) {
                throw new Error("Failed to get public URLs for start or end images.");
            }

            const videoSrc = await generateSingleVideoForImage({
                startImageUrl,
                endImageUrl,
                videoPrompt: pair.videoPrompt,
                filename: pair.id,
            });

            setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, videoSrc, isGeneratingVideo: false, videoGenerationFailed: false } : p));
            addToast("Video generated!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'An unknown error occurred during video generation.', 'error');
            setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, isGeneratingVideo: false, videoGenerationFailed: true } : p));
        }
    };
    
    const handleEnhanceGeneralPrompt = async () => {
        if (!generalPrompt.trim() || isBusy) return;
        setIsPreparingAll(true);
        addToast("Enhancing general instruction...", "info");
        try {
            const newPrompt = await enhanceGeneralPrompt(generalPrompt);
            setGeneralPrompt(newPrompt);
            addToast("Instruction enhanced!", "success");
        } catch(e) {
            addToast(e instanceof Error ? e.message : 'Enhancement failed', 'error');
        } finally {
            setIsPreparingAll(false);
        }
    };
    
    const handleTranslateGeneralPrompt = async () => {
        if (!generalPrompt.trim() || isBusy) return;
        setIsPreparingAll(true);
        addToast("Translating general instruction...", "info");
        try {
            const newPrompt = await translateTextToEnglish(generalPrompt);
            setGeneralPrompt(newPrompt);
            addToast("Instruction translated!", "success");
        } catch(e) {
            addToast(e instanceof Error ? e.message : 'Translation failed', 'error');
        } finally {
            setIsPreparingAll(false);
        }
    };
    
    const handleClearAll = () => {
        setConfirmAction({
            title: "Clear Timeline Studio?",
            message: "This will remove all images and pairs from the timeline. This action cannot be undone.",
            confirmText: "Clear All",
            onConfirm: () => {
                setTimelineImages([]);
                setTimelinePairs([]);
                setSessionId(null);
                setGeneralPrompt('');
            }
        });
    };

    const runPromptGeneration = async (pairsToProcess: TimelinePair[], isRewrite: boolean) => {
        if (pairsToProcess.length === 0) {
            addToast(isRewrite ? "No enabled pairs to rewrite." : "All enabled pairs already have prompts.", "info");
            return;
        }

        logUserAction(isRewrite ? 'REWRITE_TIMELINE_PROMPTS' : 'PREPARE_TIMELINE_PROMPTS', { count: pairsToProcess.length, generalPrompt, sessionId });
        setIsPreparingAll(true);
        const actionText = isRewrite ? 'Rewriting' : 'Preparing';
        addToast(`${actionText} ${pairsToProcess.length} transition prompts...`, 'info');
        setTimelinePairs(prev => prev.map(p => pairsToProcess.some(proc => proc.id === p.id) ? { ...p, isPreparing: true } : p));

        const pairsWithImageData: TimelinePairWithImages[] = pairsToProcess.map(p => ({
            ...p,
            startImage: findImageById(p.startImageId)!,
            endImage: findImageById(p.endImageId)!,
        })).filter(p => p.startImage && p.endImage);

        try {
            await prepareAllTimelinePrompts(
                pairsWithImageData,
                generalPrompt,
                (pairId, prompt) => {
                    setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, videoPrompt: prompt, isPreparing: false } : p));
                },
                (errorMsg) => addToast(errorMsg, 'error')
            );
            addToast(`${pairsToProcess.length} transition prompts ${isRewrite ? 'rewritten' : 'prepared'}!`, "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'An unknown error occurred during preparation.', 'error');
        } finally {
            setIsPreparingAll(false);
            const processedIds = new Set(pairsToProcess.map(p => p.id));
            setTimelinePairs(prev => prev.map(p => 
                processedIds.has(p.id) ? { ...p, isPreparing: false } : p
            ));
        }
    };

    const handlePrepareAll = async () => {
        const pairsToPrepare = timelinePairs.filter(p => !p.videoPrompt && !p.isDisabled);
        await runPromptGeneration(pairsToPrepare, false);
    };
    
    const handleRewriteAllPrompts = () => {
        const enabledPairs = timelinePairs.filter(p => !p.isDisabled);
        if (enabledPairs.length === 0) return;
        setConfirmAction({
            title: "Rewrite All Prompts?",
            message: "This will overwrite all existing transition prompts for enabled pairs using the current general instruction. This action cannot be undone.",
            confirmText: "Rewrite All",
            confirmVariant: 'destructive',
            onConfirm: () => {
                runPromptGeneration(enabledPairs, true);
            },
        });
    };

    const handleGenerateAllVideos = async () => {
        const pairsToProcess = timelinePairs.filter(p => p.videoPrompt && !p.videoSrc && !p.isGeneratingVideo && !p.isDisabled);
        if (pairsToProcess.length === 0) {
            addToast("No enabled pairs are ready for video generation.", "info");
            return;
        }

        logUserAction('GENERATE_TIMELINE_VIDEO_ALL', { count: pairsToProcess.length, sessionId });
        setIsGeneratingAllVideos(true);
        addToast(`Generating ${pairsToProcess.length} transition videos... This may take some time.`, 'info');
        setTimelinePairs(prev => prev.map(p => pairsToProcess.some(proc => proc.id === p.id) ? { ...p, isGeneratingVideo: true, videoGenerationFailed: false } : p));

        try {
            const videoTasks: VideoTask[] = [];
            for (const pair of pairsToProcess) {
                const startImageUrl = await ensurePublicUrlForImage(pair.startImageId);
                const endImageUrl = await ensurePublicUrlForImage(pair.endImageId);
                if (startImageUrl && endImageUrl && pair.videoPrompt) {
                    videoTasks.push({
                        startImageUrl,
                        endImageUrl,
                        videoPrompt: pair.videoPrompt,
                        filename: pair.id,
                    });
                }
            }

            if(videoTasks.length !== pairsToProcess.length) {
                addToast("Some images failed to upload and were skipped.", "warning");
            }
            
            if(videoTasks.length > 0) {
                await generateAllVideos(
                    videoTasks,
                    (pairId, videoSrc) => {
                        setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, videoSrc, isGeneratingVideo: false, videoGenerationFailed: false } : p));
                    },
                    (errorMsg) => {
                        const pairIdMatch = errorMsg.match(/Failed on (.*?):/);
                        if (pairIdMatch && pairIdMatch[1]) {
                            const failedPairId = pairIdMatch[1];
                            setTimelinePairs(prev => prev.map(p => p.id === failedPairId ? { ...p, isGeneratingVideo: false, videoGenerationFailed: true } : p));
                        }
                        addToast(errorMsg, 'error');
                    }
                );
            }
            addToast("All transition videos generated!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'An unknown error occurred during video generation.', 'error');
        } finally {
            setIsGeneratingAllVideos(false);
            const processedIds = new Set(pairsToProcess.map(p => p.id));
            setTimelinePairs(prev => prev.map(p =>
                processedIds.has(p.id) ? { ...p, isGeneratingVideo: false } : p
            ));
        }
    };
    
    const getShortIdFromFullId = (fullId: string) => fullId.split('-')[1] || 'xxxx';

    const handleDownloadSinglePair = (pairId: string) => {
        withMultiDownloadWarning(async () => {
            const pair = timelinePairs.find(p => p.id === pairId);
            if (!pair || !pair.videoSrc) {
                addToast("Video not generated for this pair yet.", "error");
                return;
            }
            
            const startImage = findImageById(pair.startImageId);
            const endImage = findImageById(pair.endImageId);
            if (!startImage || !endImage) {
                addToast("Could not find source images for the pair.", "error");
                return;
            }

            const index = timelinePairs.findIndex(p => p.id === pair.id);
            const startShortId = getShortIdFromFullId(startImage.id);
            const endShortId = getShortIdFromFullId(endImage.id);
            const timestamp = getTimestamp();
            const baseName = `${sessionId}_Timeline_Transition_${String(index + 1).padStart(2, '0')}_${startShortId}-to-${endShortId}_${timestamp}`;

            setDownloadProgress({ visible: true, message: `Preparing: ${baseName}.zip`, progress: 0 });

            try {
                const zip = new JSZip();
                
                zip.file(`${baseName}_start.jpg`, startImage.src.split(',')[1], { base64: true });
                setDownloadProgress({ visible: true, message: 'Adding start image...', progress: 25 });

                zip.file(`${baseName}_end.jpg`, endImage.src.split(',')[1], { base64: true });
                setDownloadProgress({ visible: true, message: 'Adding end image...', progress: 50 });

                const videoBlob = await fetch(pair.videoSrc).then(res => res.blob());
                zip.file(`${baseName}.mp4`, videoBlob);
                setDownloadProgress({ visible: true, message: 'Adding video...', progress: 75 });
                
                const info = {
                    pair_index: index + 1,
                    start_image_filename: startImage.filename,
                    end_image_filename: endImage.filename,
                    video_prompt: pair.videoPrompt,
                    general_instruction: generalPrompt,
                    session_id: sessionId,
                    timestamp: timestamp,
                };
                zip.file(`${baseName}.txt`, JSON.stringify(info, null, 2));
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
            const pairsWithContent = timelinePairs.filter(p => !p.isDisabled && (p.videoSrc || p.videoPrompt));
            if (pairsWithContent.length === 0) {
                addToast("No content available to download.", "info");
                return;
            }

            setDownloadProgress({ visible: true, message: 'Starting download...', progress: 0 });

            try {
                const zip = new JSZip();
                const timestamp = getTimestamp();
                let filesProcessed = 0;
                const totalFiles = pairsWithContent.length;

                for (const pair of pairsWithContent) {
                    const startImage = findImageById(pair.startImageId);
                    const endImage = findImageById(pair.endImageId);
                    if (!startImage || !endImage) continue;

                    const index = timelinePairs.findIndex(p => p.id === pair.id);
                    const startShortId = getShortIdFromFullId(startImage.id);
                    const endShortId = getShortIdFromFullId(endImage.id);
                    const pairName = `${sessionId}_Timeline_Transition_${String(index + 1).padStart(2, '0')}_${startShortId}-to-${endShortId}_${timestamp}`;
                    
                    filesProcessed++;
                    setDownloadProgress({ visible: true, message: `Zipping: Transition ${index + 1}`, progress: (filesProcessed / totalFiles) * 100 });

                    zip.file(`${pairName}_start.jpg`, startImage.src.split(',')[1], { base64: true });
                    zip.file(`${pairName}_end.jpg`, endImage.src.split(',')[1], { base64: true });
                    
                    if(pair.videoSrc) {
                        const videoBlob = await fetch(pair.videoSrc).then(res => res.blob());
                        zip.file(`${pairName}.mp4`, videoBlob);
                    }

                    const info = {
                        pair_index: index + 1,
                        start_image_filename: startImage.filename,
                        end_image_filename: endImage.filename,
                        video_prompt: pair.videoPrompt,
                        general_instruction: generalPrompt,
                        session_id: sessionId,
                        timestamp: timestamp,
                    };
                    zip.file(`${pairName}.txt`, JSON.stringify(info, null, 2));
                }

                setDownloadProgress({ visible: true, message: 'Compressing ZIP...', progress: 99 });
                const content = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `${sessionId || 'AI_Studio'}_Timeline_${getTimestamp()}.zip`;
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
    
    const handleStitchVideos = async () => {
        if (!allVideosGenerated) {
            addToast("Please generate all videos for enabled pairs before stitching.", "error");
            return;
        }
        const videoUrls = timelinePairs.filter(p => !p.isDisabled && p.videoSrc).map(p => p.videoSrc!);
        logUserAction('GENERATE_TIMELINE_STITCHED_VIDEO', { pairCount: videoUrls.length, sessionId });
        setIsStitching(true);
        setDownloadProgress({ visible: true, message: 'Starting video stitch...', progress: 0 });

        try {
            const stitchedVideoBlob = await stitchVideos(videoUrls, (progress, message) => {
                setDownloadProgress({ visible: true, message, progress });
            });
            const url = URL.createObjectURL(stitchedVideoBlob);
            setStitchedVideoUrl(url);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred during stitching.";
            addToast(`Stitching failed: ${message}`, 'error');
            console.error(err);
        } finally {
            setIsStitching(false);
            setDownloadProgress({ visible: false, message: '', progress: 0 });
        }
    };
    
    const handleCloseStitchedPlayer = () => {
        if (stitchedVideoUrl) {
            URL.revokeObjectURL(stitchedVideoUrl);
        }
        setStitchedVideoUrl(null);
    };

    const handleDownloadStitchedVideo = () => {
        if (!stitchedVideoUrl) return;
        const link = document.createElement('a');
        link.href = stitchedVideoUrl;
        link.download = `${sessionId}_Timeline_Stitched_${getTimestamp()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePairClick = (index: number) => setLightboxPairIndex(index);
    const handleCloseLightbox = () => setLightboxPairIndex(null);

    const handleTogglePairDisabled = (pairId: string) => {
        setTimelinePairs(prev => prev.map(p => p.id === pairId ? { ...p, isDisabled: !p.isDisabled } : p));
    };

    const handleIgnoreOddEvenPairs = (type: 'odd' | 'even') => {
        const isOdd = type === 'odd';
        const relevantPairs = timelinePairs.filter((_, index) => (isOdd ? index % 2 === 0 : index % 2 !== 0));
        const allAreDisabled = relevantPairs.length > 0 && relevantPairs.every(p => p.isDisabled);

        setTimelinePairs(prev =>
            prev.map((p, index) => {
                const isTarget = isOdd ? index % 2 === 0 : index % 2 !== 0;
                if (isTarget) {
                    return { ...p, isDisabled: !allAreDisabled };
                }
                return p;
            })
        );
        addToast(`${allAreDisabled ? 'Enabled' : 'Ignored'} ${type} pairs.`, 'info');
    };

    return {
        timelineImages,
        timelinePairs,
        timelineAspectRatio,
        sessionId,
        generalPrompt, setGeneralPrompt,
        isPreparingAll,
        isGeneratingAllVideos,
        isStitching,
        stitchedVideoUrl,
        isBusy,
        allVideosGenerated,
        isLightboxOpen,
        filesForCrop,
        showCropChoice,
        isCropping,
        lightboxPairIndex, setLightboxPairIndex,
        handleImagesUpload,
        handleCropChoice,
        handleCropConfirm,
        handleCropCancel,
        handleReorderImages,
        handleRemoveImage,
        handleSendToStart,
        handleSendToEnd,
        handleUpdatePairPrompt,
        handleEnhanceGeneralPrompt,
        handleTranslateGeneralPrompt,
        handleEnhancePairPrompt,
        handleTranslatePairPrompt,
        handleGenerateSingleVideo,
        handleClearAll,
        setFilesForCrop,
        setShowCropChoice,
        handlePrepareAll,
        handleRewriteAllPrompts,
        handleGenerateAllVideos,
        handleDownloadAll,
        handleDownloadSinglePair,
        handleStitchVideos,
        handleCloseStitchedPlayer,
        handleDownloadStitchedVideo,
        handlePairClick,
        handleCloseLightbox,
        setConfirmAction,
        handleTogglePairDisabled,
        handleIgnoreOddEvenPairs,
    };
};