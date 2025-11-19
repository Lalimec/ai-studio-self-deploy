/// <reference lib="dom" />
import { useState, useCallback } from 'react';
import { StudioImage, Toast as ToastType, ImageForVideoProcessing } from '../types';
// FIX: Consolidate multiple imports from videoService and add the missing 'prepareVideoPrompts' function.
import { 
    generateVideoPromptForImage, 
    enhanceVideoPromptForImage,
    translateTextToEnglish,
    prepareVideoPrompts,
    generateAllVideos,
    generateSingleVideoForImage,
    enhancePrompt,
    rewriteVideoPromptForImage,
    VideoTask,
} from '../services/videoService';
import { dataUrlToBlob } from '../services/geminiClient';
import { uploadImageFromDataUrl } from '../services/imageUploadService';
import { generateSetId, generateShortId, getTimestamp, getExtensionFromDataUrl } from '../services/imageUtils';
import { logUserAction } from '../services/loggingService';
import { processWithConcurrency } from '../services/apiUtils';

declare const JSZip: any;

type VideoStudioHookProps = {
    addToast: (message: string, type: ToastType['type']) => void;
    setConfirmAction: (action: any) => void;
    setDownloadProgress: (progress: { visible: boolean; message: string; progress: number }) => void;
    withMultiDownloadWarning: (action: () => void) => void;
};

export const useVideoStudio = ({ addToast, setConfirmAction, setDownloadProgress, withMultiDownloadWarning }: VideoStudioHookProps) => {
    const [studioImages, setStudioImages] = useState<StudioImage[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
    const [generalPrompt, setGeneralPrompt] = useState<string>('');

    const isBusy = isPreparing || isGeneratingVideos;
    
    const handleImagesUpload = useCallback((files: File[]) => {
        if (files.length === 0) return;
        if (!sessionId) setSessionId(generateSetId());

        const readFileAsDataURL = (file: File): Promise<{file: File, src: string}> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ file, src: reader.result as string });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        Promise.all(files.map(readFileAsDataURL))
          .then(results => {
              const newImages: StudioImage[] = results.map(({ file, src }) => ({
                  id: `vs-${generateShortId()}-${Date.now()}`,
                  src, file,
                  filename: `${file.name.substring(0, file.name.lastIndexOf('.')) || file.name}_${generateShortId()}.${file.name.substring(file.name.lastIndexOf('.') + 1)}`,
              }));
              setStudioImages(prev => [...newImages, ...prev]);
          })
          .catch(error => {
              console.error("Error reading files:", error);
              addToast("There was an error uploading one or more images.", "error");
          });
    }, [sessionId, addToast]);

    const handleRemoveImage = (id: string) => setStudioImages(prev => prev.filter(img => img.id !== id));
    
    const handleClearAll = () => {
        setConfirmAction({
            title: "Clear Video Studio?",
            message: "This will remove all images from the Video Studio. This action cannot be undone.",
            confirmText: "Clear All",
            onConfirm: () => {
                setStudioImages([]);
                setSessionId(null);
            }
        });
    };

    const handleUpdatePrompt = (id: string, newPrompt: string) => {
        setStudioImages(prev => prev.map(img => img.id === id ? { ...img, videoPrompt: newPrompt } : img));
    };

    const ensurePublicUrl = async (imageId: string): Promise<string | null> => {
        const image = studioImages.find(img => img.id === imageId);
        if (!image) return null;
        if (image.publicUrl) return image.publicUrl;

        try {
            const url = await uploadImageFromDataUrl(image.src, image.filename);
            setStudioImages(prev => prev.map(img => img.id === imageId ? { ...img, publicUrl: url } : img));
            return url;
        } catch (error) {
            addToast(`Failed to upload image ${image.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            return null;
        }
    };
    
    const handlePrepareSingleImage = async (id: string) => {
        const image = studioImages.find(img => img.id === id);
        if (!image || image.isPreparing || image.isGeneratingVideo) return;
        logUserAction('PREPARE_VIDEO_SINGLE_VIDEOSTUDIO', { id, sessionId });
        setStudioImages(prev => prev.map(img => img.id === id ? { ...img, isPreparing: true } : img));
        addToast("Generating new prompt...", "info");
        try {
            const imageBlob = dataUrlToBlob(image.src);
            const prompt = await generateVideoPromptForImage(imageBlob, generalPrompt);
            setStudioImages(prev => prev.map(img => img.id === id ? { ...img, videoPrompt: prompt, isPreparing: false } : img));
            addToast("New prompt generated!", "success");
        } catch(err) {
            addToast(err instanceof Error ? err.message : 'Error preparing prompt.', 'error');
            setStudioImages(prev => prev.map(img => img.id === id ? { ...img, isPreparing: false } : img));
        }
    };
    
    const handleEnhancePrompt = async (id: string, currentPrompt: string) => {
        const image = studioImages.find(img => img.id === id);
        if (!image || image.isPreparing || image.isGeneratingVideo || !currentPrompt) return;
        setStudioImages(prev => prev.map(img => img.id === id ? { ...img, isPreparing: true } : img));
        addToast("Enhancing prompt...", "info");
        try {
            const imageBlob = dataUrlToBlob(image.src);
            const newPrompt = await enhanceVideoPromptForImage(imageBlob, currentPrompt);
            setStudioImages(prev => prev.map(img => img.id === id ? { ...img, videoPrompt: newPrompt, isPreparing: false } : img));
            addToast("Prompt enhanced!", "success");
        } catch(err) {
            addToast(err instanceof Error ? err.message : 'Error enhancing prompt.', 'error');
            setStudioImages(prev => prev.map(img => img.id === id ? { ...img, isPreparing: false } : img));
        }
    };

    const handlePrepareAll = async () => {
        const unpreparedImages = studioImages.filter(img => !img.videoPrompt && !img.isPreparing);
        if (unpreparedImages.length === 0) return addToast("All images are already prepared or being prepared.", "info");
        logUserAction('PREPARE_VIDEO_ALL_VIDEOSTUDIO', { count: unpreparedImages.length, sessionId });
        setIsPreparing(true);
        setStudioImages(prev => prev.map(img => unpreparedImages.some(unprepared => unprepared.id === img.id) ? { ...img, isPreparing: true } : img));
        addToast(`Preparing ${unpreparedImages.length} video prompts...`, "info");
        try {
          // FIX: The `map` created an object that didn't match the required type.
          // Passing `unpreparedImages` directly works because `StudioImage[]` is assignable to the function's parameter type.
          await prepareVideoPrompts(unpreparedImages,
            (returnedId, prompt) => setStudioImages(prev => prev.map(img => img.id === returnedId ? { ...img, videoPrompt: prompt, isPreparing: false } : img)),
            (errorMessage) => addToast(errorMessage, 'error'),
            generalPrompt
          );
          addToast("Video prompt preparation complete!", "success");
        } catch (err) {
          addToast(err instanceof Error ? err.message : 'An unknown error occurred during preparation.', 'error');
        } finally {
            setIsPreparing(false);
            setStudioImages(prev => prev.map(img => img.isPreparing ? { ...img, isPreparing: false } : img));
        }
    };

    const handleGenerateSingleVideo = async (id: string) => {
        const image = studioImages.find(img => img.id === id);
        if (!image || !image.videoPrompt || image.isGeneratingVideo || image.isPreparing) return;
        
        logUserAction('GENERATE_VIDEO_SINGLE_VIDEOSTUDIO', { id, sessionId });
        setStudioImages(prev => prev.map(img => img.id === id ? { ...img, isGeneratingVideo: true, videoGenerationFailed: false } : img));
        
        try {
            const publicUrl = await ensurePublicUrl(id);
            if (!publicUrl) {
                throw new Error("Failed to get public URL for the image.");
            }

            const videoSrc = await generateSingleVideoForImage({
                startImageUrl: publicUrl,
                videoPrompt: image.videoPrompt,
                filename: image.id,
            });
            setStudioImages(prev => prev.map(img => img.id === id ? { ...img, videoSrc, isGeneratingVideo: false, videoGenerationFailed: false } : img));
            addToast("Video generated!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Error generating video.', 'error');
            setStudioImages(prev => prev.map(img => img.id === id ? { ...img, isGeneratingVideo: false, videoGenerationFailed: true } : img));
        }
    };
    
    const handleGenerateAllVideos = async () => {
        // Find images ready to generate (have prompts, not currently generating)
        const imagesWithPrompts = studioImages.filter(i => !!i.videoPrompt && !i.isGeneratingVideo);
        const imagesWithoutVideos = imagesWithPrompts.filter(i => !i.videoSrc);
        const imagesWithExistingVideos = imagesWithPrompts.filter(i => i.videoSrc);

        if (imagesWithPrompts.length === 0) {
            return addToast("No images ready to generate videos.", "info");
        }

        // If there are images with existing videos, warn the user
        if (imagesWithExistingVideos.length > 0) {
            setConfirmAction({
                title: "Regenerate Videos?",
                message: `${imagesWithExistingVideos.length} image(s) already have generated videos. Regenerating will replace the existing videos. Do you want to continue?`,
                confirmText: "Regenerate All",
                confirmVariant: 'primary',
                onConfirm: () => {
                    executeGenerateAllVideos(imagesWithPrompts);
                },
            });
            return;
        }

        // No existing videos, proceed directly
        executeGenerateAllVideos(imagesWithoutVideos);
    };

    const executeGenerateAllVideos = async (toProcess: typeof studioImages) => {
        logUserAction('GENERATE_VIDEO_ALL_VIDEOSTUDIO', { count: toProcess.length, sessionId });
        setIsGeneratingVideos(true);
        setStudioImages(p => p.map(i => toProcess.some(pr => pr.id === i.id) ? {...i, isGeneratingVideo: true, videoGenerationFailed: false} : i));
        addToast(`Generating ${toProcess.length} videos...`, "info");

        try {
            const videoTasks: VideoTask[] = [];
            for (const image of toProcess) {
                const publicUrl = await ensurePublicUrl(image.id);
                if (publicUrl && image.videoPrompt) {
                    videoTasks.push({
                        startImageUrl: publicUrl,
                        videoPrompt: image.videoPrompt,
                        filename: image.id,
                    });
                }
            }

            if(videoTasks.length !== toProcess.length) {
                addToast("Some images failed to upload and were skipped.", "warning");
            }

            if(videoTasks.length > 0) {
                await generateAllVideos(videoTasks,
                    (returnedId, videoSrc) => {
                        setStudioImages(p => p.map(i => i.id === returnedId ? {...i, videoSrc, isGeneratingVideo: false, videoGenerationFailed: false } : i))
                    },
                    (error) => {
                        const idMatch = error.match(/Failed on (.*?):/);
                        if (idMatch && idMatch[1]) {
                            const failedId = idMatch[1];
                            setStudioImages(p => p.map(i => i.id === failedId ? {...i, isGeneratingVideo: false, videoGenerationFailed: true} : i));
                        }
                        addToast(error, 'error');
                    }
                );
            }
        } catch(e) {
            addToast(e instanceof Error ? e.message : 'Error generating all videos.', 'error');
        } finally {
            setIsGeneratingVideos(false);
            setStudioImages(p => p.map(i => ({...i, isGeneratingVideo: false})));
        }
    };

    const handleReorder = useCallback((dragIndex: number, hoverIndex: number) => {
        setStudioImages(prevImages => {
            const newImages = [...prevImages];
            const [draggedItem] = newImages.splice(dragIndex, 1);
            newImages.splice(hoverIndex, 0, draggedItem);
            return newImages;
        });
    }, []);

    const handleTranslatePrompt = async (id: string, prompt: string) => {
        const image = studioImages.find(img => img.id === id);
        if (!image || image.isPreparing || image.isGeneratingVideo) return;
        setStudioImages(prev => prev.map(img => img.id === id ? { ...img, isPreparing: true } : img));
        addToast('Translating prompt...', 'info');
        try {
            const translatedPrompt = await translateTextToEnglish(prompt);
            setStudioImages(prev => prev.map(img => img.id === id ? { ...img, videoPrompt: translatedPrompt, isPreparing: false } : img));
            addToast('Prompt translated and refined!', 'success');
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Translation failed.', 'error');
            setStudioImages(prev => prev.map(img => img.id === id ? { ...img, isPreparing: false } : img));
        }
    };

    const handleEnhanceGeneralPrompt = async () => {
        if (!generalPrompt.trim() || isBusy) return;
        setIsPreparing(true);
        try {
            const newPrompt = await enhancePrompt(generalPrompt);
            setGeneralPrompt(newPrompt);
            addToast("General instruction enhanced!", "success");
        } catch (e) {
            addToast(e instanceof Error ? e.message : 'Enhancement failed', 'error');
        } finally {
            setIsPreparing(false);
        }
    };

    const handleTranslateGeneralPrompt = async () => {
        if (!generalPrompt.trim() || isBusy) return;
        setIsPreparing(true);
        try {
            const newPrompt = await translateTextToEnglish(generalPrompt);
            setGeneralPrompt(newPrompt);
            addToast("General instruction translated!", "success");
        } catch (e) {
            addToast(e instanceof Error ? e.message : 'Translation failed', 'error');
        } finally {
            setIsPreparing(false);
        }
    };

    const handleRewriteAllPrompts = () => {
        const toRewrite = studioImages.filter(img => img.videoPrompt);
        if (toRewrite.length === 0) {
            addToast("No prompts to rewrite. Use 'Prepare All' first.", "info");
            return;
        }
        if (!generalPrompt.trim()) {
            addToast("Please provide a general instruction to guide the rewrite.", "info");
            return;
        }

        setConfirmAction({
            title: "Rewrite All Prompts?",
            message: "This will overwrite existing prompts using the general instruction. This cannot be undone.",
            confirmText: "Rewrite Prompts",
            onConfirm: async () => {
                logUserAction('REWRITE_VIDEO_PROMPTS_VIDEOSTUDIO', { count: toRewrite.length, generalPrompt, sessionId });
                setIsPreparing(true);
                setStudioImages(prev => prev.map(img => toRewrite.some(r => r.id === img.id) ? { ...img, isPreparing: true } : img));
                addToast(`Rewriting ${toRewrite.length} prompts...`, 'info');

                const processRewrite = async (image: StudioImage) => {
                    if (!image.videoPrompt) return;
                    try {
                        const imageBlob = dataUrlToBlob(image.src);
                        const newPrompt = await rewriteVideoPromptForImage(imageBlob, image.videoPrompt, generalPrompt);
                        setStudioImages(prev => prev.map(img => img.id === image.id ? { ...img, videoPrompt: newPrompt, isPreparing: false } : img));
                    } catch (err) {
                        addToast(`Failed to rewrite prompt for ${image.filename}: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
                        setStudioImages(prev => prev.map(img => img.id === image.id ? { ...img, isPreparing: false } : img));
                    }
                };

                try {
                    await processWithConcurrency(toRewrite, processRewrite, 6);
                    addToast("All prompts have been rewritten.", "success");
                } finally {
                    setIsPreparing(false);
                    setStudioImages(prev => prev.map(img => img.isPreparing ? { ...img, isPreparing: false } : img));
                }
            }
        });
    };

    const handleDownloadSingle = (id: string) => {
        withMultiDownloadWarning(async () => {
            const image = studioImages.find(img => img.id === id);
            if (!image) {
                addToast("Could not find image to download.", "error");
                return;
            }

            const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));
            const imageExt = getExtensionFromDataUrl(image.src);
            setDownloadProgress({ visible: true, message: `Preparing: ${baseName}.zip`, progress: 0 });

            try {
                const zip = new JSZip();
                zip.file(`${baseName}.${imageExt}`, image.src.split(',')[1], { base64: true });
                setDownloadProgress({ visible: true, message: 'Adding image...', progress: 33 });

                if (image.videoSrc) {
                    const videoBlob = await fetch(image.videoSrc).then(res => res.blob());
                    zip.file(`${baseName}.mp4`, videoBlob);
                    setDownloadProgress({ visible: true, message: 'Adding video...', progress: 66 });
                }

                const info = { type: "video_studio_image", video_prompt: image.videoPrompt };
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
            if (studioImages.length === 0) {
                addToast("No images to download.", "info");
                return;
            }
            setDownloadProgress({ visible: true, message: 'Starting download...', progress: 0 });
            const currentSessionId = sessionId || generateSetId();
            if(!sessionId) setSessionId(currentSessionId);
            
            try {
                const zip = new JSZip();
                let filesProcessed = 0;
                
                for (const image of studioImages) {
                    const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));
                    const imageExt = getExtensionFromDataUrl(image.src);
                    zip.file(`${baseName}.${imageExt}`, image.src.split(',')[1], { base64: true });

                    if (image.videoSrc) {
                        const videoBlob = await fetch(image.videoSrc).then(res => res.blob());
                        zip.file(`${baseName}.mp4`, videoBlob);
                    }

                    const info = { type: "video_studio_image", video_prompt: image.videoPrompt };
                    zip.file(`${baseName}.txt`, JSON.stringify(info, null, 2));
                    
                    filesProcessed++;
                    setDownloadProgress({ 
                        visible: true, 
                        message: `Zipping: ${image.filename}`, 
                        progress: (filesProcessed / studioImages.length) * 100 
                    });
                }
                
                setDownloadProgress({ visible: true, message: 'Compressing ZIP...', progress: 99 });
                const content = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `AI_Studio_Video_${currentSessionId}_${getTimestamp()}.zip`;
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

    return {
        studioImages, setStudioImages,
        sessionId, setSessionId,
        isPreparing,
        isGeneratingVideos,
        isBusy,
        generalPrompt, setGeneralPrompt,
        handleImagesUpload,
        handleRemoveImage,
        handleClearAll,
        handleUpdatePrompt,
        handlePrepareSingleImage,
        handleEnhancePrompt,
        handlePrepareAll,
        handleGenerateSingleVideo,
        handleGenerateAllVideos,
        handleReorder,
        handleTranslatePrompt,
        handleDownloadAll,
        handleDownloadSingle,
        handleEnhanceGeneralPrompt,
        handleTranslateGeneralPrompt,
        handleRewriteAllPrompts,
    };
};