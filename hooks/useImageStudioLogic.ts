/// <reference lib="dom" />
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { generateFigureImage, translateToEnglish, generatePromptList, generatePromptVariation, enhancePrompt } from '../services/geminiService';
import { ImageStudioRunResult, ImageStudioGenerationResult, AppFile, Toast } from '../types';
import { fileToBase64, blobToDataUrl, generateSetId, generateShortId, sanitizeFilename, getTimestamp } from '../services/imageUtils';
import { uploadImageFromDataUrl } from '../services/imageUploadService';
import { runConcurrentTasks } from '../services/apiUtils';
import { logUserAction } from '../services/loggingService';
import { downloadImageWithMetadata, downloadBulkImages } from '../services/downloadService';
import { NANO_BANANA_RATIOS, FLUX_KONTEXT_PRO_RATIOS, ASPECT_RATIO_PRESETS_2K, ASPECT_RATIO_PRESETS_4K } from '../constants';

declare const JSZip: any;

export const useImageStudioLogic = (
    addToast: (message: string, type: Toast['type']) => void,
    setConfirmAction: React.Dispatch<React.SetStateAction<any>>,
    setDownloadProgress: React.Dispatch<React.SetStateAction<{ visible: boolean; message: string; progress: number }>>,
    withMultiDownloadWarning: (action: () => void) => void,
    useNanoBananaWebhook: boolean
) => {
    const [numberOfVersions, setNumberOfVersions] = useState<number>(1);
    const [promptContents, setPromptContents] = useState<string[]>(['']);
    const [imageFiles, setImageFiles] = useState<AppFile[]>([]);
    const [generationResults, setGenerationResults] = useState<ImageStudioGenerationResult[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [includeOriginals, setIncludeOriginals] = useState<boolean>(true);
    const [batchTimestamp, setBatchTimestamp] = useState<number | null>(null);
    const [progress, setProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
    const [translatingIndices, setTranslatingIndices] = useState<Set<number>>(new Set());
    const [generatingVariationIndices, setGeneratingVariationIndices] = useState<Set<number>>(new Set());
    const [enhancingIndices, setEnhancingIndices] = useState<Set<number>>(new Set());

    const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
    const [setId, setSetId] = useState<string>('');
    
    const [showCropChoiceModal, setShowCropChoiceModal] = useState<boolean>(false);
    const [filesAwaitingCropChoice, setFilesAwaitingCropChoice] = useState<File[] | null>(null);
    const [croppingFiles, setCroppingFiles] = useState<File[] | null>(null);

    const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
    const [model, setModel] = useState<string>('nano-banana');
    const [aspectRatio, setAspectRatio] = useState<string | null>(null);
    const [imageSizePreset, setImageSizePreset] = useState<string>('auto_4K');
    const [customWidth, setCustomWidth] = useState<number>(1024);
    const [customHeight, setCustomHeight] = useState<number>(1024);
    const [prependPrompt, setPrependPrompt] = useState<string>('');
    const [appendPrompt, setAppendPrompt] = useState<string>('');
    const [jsonPrompts, setJsonPrompts] = useState<string>('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [filenameTemplate, setFilenameTemplate] = useState<string>('{set_id}_{original_filename}_{short_id}_after_{timestamp}_{version_index}');
    const [promptGenerationInstructions, setPromptGenerationInstructions] = useState<string>('');
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState<boolean>(false);
    const [isTranslatingInstructions, setIsTranslatingInstructions] = useState<boolean>(false);
    const [inputImageWarnings, setInputImageWarnings] = useState<Record<string, string>>({});


    // Helper function to get resolution for a given aspect ratio and quality level
    const getResolutionForAspectRatio = useCallback((aspectRatio: string | null, quality: '2K' | '4K'): { width: number; height: number } => {
        if (!aspectRatio || aspectRatio === 'auto') {
            return quality === '4K' ? { width: 4576, height: 4576 } : { width: 2048, height: 2048 };
        }

        const presets = quality === '4K' ? ASPECT_RATIO_PRESETS_4K : ASPECT_RATIO_PRESETS_2K;
        const preset = presets.find(p => p.label === aspectRatio);

        if (preset) {
            return { width: preset.width, height: preset.height };
        }

        // Fallback: calculate from aspect ratio string (longest edge approach)
        const [w, h] = aspectRatio.split(':').map(Number);
        const ratio = w / h;
        const longestEdge = quality === '4K' ? 4096 : 2048;

        if (ratio >= 1) {
            // Landscape or square - width is longest
            return { width: longestEdge, height: Math.round(longestEdge / ratio) };
        } else {
            // Portrait - height is longest
            return { width: Math.round(longestEdge * ratio), height: longestEdge };
        }
    }, []);

    const imageSizePresets: { [key: string]: { name: string; width?: number; height?: number } } = useMemo(() => {
        const custom2K = getResolutionForAspectRatio(aspectRatio, '2K');
        const custom4K = getResolutionForAspectRatio(aspectRatio, '4K');

        return {
            'auto_4K': { name: 'Auto (up to 4K)' },
            'auto_2K': { name: 'Auto (up to 2K)' },
            'auto': { name: 'Auto' },
            'custom_4K': { name: 'Custom 4K', width: custom4K.width, height: custom4K.height },
            'custom_2K': { name: 'Custom 2K', width: custom2K.width, height: custom2K.height },
            'custom': { name: 'Custom', width: customWidth, height: customHeight },
        };
    }, [customWidth, customHeight, aspectRatio, getResolutionForAspectRatio]);

    // Helper function to convert aspect ratio string to numeric value
    const aspectRatioToNumber = (ratio: string): number => {
        if (ratio === 'auto') return 0; // Special case for auto
        const [w, h] = ratio.split(':').map(Number);
        return w / h;
    };

    // Helper function to find the nearest supported aspect ratio
    const findNearestAspectRatio = (currentRatio: string, supportedRatios: readonly string[]): string => {
        if (!currentRatio || currentRatio === 'auto') return 'auto';

        // If the current ratio is already supported, return it
        if (supportedRatios.includes(currentRatio)) {
            return currentRatio;
        }

        // Find the nearest supported ratio
        const currentValue = aspectRatioToNumber(currentRatio);
        let nearestRatio = supportedRatios[0];
        let smallestDiff = Math.abs(aspectRatioToNumber(supportedRatios[0]) - currentValue);

        for (const ratio of supportedRatios) {
            const diff = Math.abs(aspectRatioToNumber(ratio) - currentValue);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                nearestRatio = ratio;
            }
        }

        return nearestRatio;
    };

    // Auto-adjust aspect ratio when model changes
    useEffect(() => {
        if (!aspectRatio || aspectRatio === 'auto') {
            // If no aspect ratio is set or it's auto, don't change it
            return;
        }

        let supportedRatios: readonly string[];
        if (model === 'flux-kontext-pro') {
            supportedRatios = FLUX_KONTEXT_PRO_RATIOS;
        } else if (model === 'nano-banana') {
            supportedRatios = NANO_BANANA_RATIOS;
        } else {
            // For other models (gemini, seedream), no automatic adjustment needed
            return;
        }

        const nearestRatio = findNearestAspectRatio(aspectRatio, supportedRatios);
        if (nearestRatio !== aspectRatio) {
            setAspectRatio(nearestRatio);
            addToast(`Aspect ratio adjusted to ${nearestRatio} for ${model === 'flux-kontext-pro' ? 'Flux Kontext Pro' : 'Nano Banana'} compatibility`, 'warning');
        }
    }, [model]); // Only run when model changes

    useEffect(() => {
        const preset = imageSizePresets[imageSizePreset];
        if (preset && preset.width && preset.height) {
            // For custom_4K and custom_2K, update customWidth/customHeight so they reflect the calculated values
            if (imageSizePreset === 'custom_4K' || imageSizePreset === 'custom_2K' || imageSizePreset === 'custom') {
                setCustomWidth(preset.width);
                setCustomHeight(preset.height);
            }
        } else if (!imageSizePreset.startsWith('auto') && !imageSizePreset.startsWith('custom')) {
            setImageSizePreset('custom');
        }
    }, [imageSizePreset, imageSizePresets]);

    const { width, height } = useMemo(() => {
        const preset = imageSizePresets[imageSizePreset] || imageSizePresets['custom'];
        return { width: preset.width, height: preset.height };
    }, [imageSizePreset, imageSizePresets]);
    
    useEffect(() => {
        if (!isLoading) {
            const failedCount = generationResults.filter(r => r.status === 'error').length;
            if (failedCount > 0) {
                addToast(`${failedCount} image(s) failed. Check individual images for details.`, 'error');
            }
        }
    }, [generationResults, isLoading, addToast]);

    useEffect(() => {
        if (model !== 'seedream') {
            setInputImageWarnings({});
            return;
        }

        const validateImages = async () => {
            const newWarnings: Record<string, string> = {};
            for (const appFile of imageFiles) {
                try {
                    const url = URL.createObjectURL(appFile.file);
                    const img = new Image();
                    // Using a promise to handle async load
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => {
                            URL.revokeObjectURL(url);
                            resolve();
                        };
                        img.onerror = (err) => {
                            URL.revokeObjectURL(url);
                            reject(err);
                        };
                        img.src = url;
                    });
                    const ratio = img.naturalWidth / img.naturalHeight;
                    if (ratio < 0.333 || ratio > 3) {
                        newWarnings[appFile.id] = `Ratio ${ratio.toFixed(2)} is outside Seedream's recommended range (0.333-3).`;
                    }
                } catch (error) {
                    console.error("Error validating image aspect ratio:", error);
                    newWarnings[appFile.id] = 'Could not read image dimensions.';
                }
            }
            setInputImageWarnings(newWarnings);
        };

        if (imageFiles.length > 0) {
            validateImages();
        } else {
            setInputImageWarnings({});
        }
    }, [imageFiles, model]);

    const imagePreviewUrls = useMemo(() => {
        return imageFiles.map(appFile => URL.createObjectURL(appFile.file));
    }, [imageFiles]);
    
    useEffect(() => {
      return () => {
        imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      }
    }, [imagePreviewUrls]);

    const handleNumberOfVersionsChange = (newVersionCount: number) => {
        setNumberOfVersions(newVersionCount);
        setPromptContents(currentPrompts => {
            const firstPrompt = currentPrompts[0] || '';
            return Array.from({ length: newVersionCount }, (_, i) => currentPrompts[i] ?? firstPrompt);
        });
    };

    const handlePromptContentChange = (index: number, value: string) => {
        setPromptContents(currentPrompts => {
            const newPrompts = [...currentPrompts];
            newPrompts[index] = value;
            return newPrompts;
        });
    };

    const handleJsonPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setJsonPrompts(newValue);
        if (!newValue.trim()) {
            setJsonError(null);
            return;
        }
        try {
            const parsed = JSON.parse(newValue);
            if (!Array.isArray(parsed) || !parsed.every(item => typeof item === 'string')) {
                setJsonError("Invalid format: Must be a JSON array of strings.");
            } else {
                setJsonError(null);
            }
        } catch (error) {
            setJsonError("Invalid JSON syntax.");
        }
    };

    const getActivePrompts = useCallback((): string[] => {
        if (jsonPrompts.trim() !== '' && !jsonError) {
            try {
                return JSON.parse(jsonPrompts);
            } catch (e) {
                return promptContents.slice(0, numberOfVersions);
            }
        }
        return promptContents.slice(0, numberOfVersions);
    }, [jsonPrompts, jsonError, promptContents, numberOfVersions]);

    const handleTranslatePrompt = async (index: number) => {
        const textToTranslate = promptContents[index];
        if (!textToTranslate.trim()) return;
        setTranslatingIndices(prev => new Set(prev).add(index));
        try {
            const translatedText = await translateToEnglish(textToTranslate);
            handlePromptContentChange(index, translatedText);
        } catch (e) {
            addToast(`Translation failed: ${e instanceof Error ? e.message : "Unknown error"}`, 'error');
        } finally {
            setTranslatingIndices(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        }
    };

    const handleEnhancePrompt = async (index: number) => {
        const textToEnhance = promptContents[index];
        if (!textToEnhance.trim()) return;
        setEnhancingIndices(prev => new Set(prev).add(index));
        try {
            const enhancedText = await enhancePrompt(textToEnhance);
            handlePromptContentChange(index, enhancedText);
        } catch (e) {
            addToast(`Enhancement failed: ${e instanceof Error ? e.message : "Unknown error"}`, 'error');
        } finally {
            setEnhancingIndices(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        }
    };

    const handleGenerateVariation = async (index: number) => {
        const textToVary = promptContents[index];
        if (!textToVary.trim()) return;
        setGeneratingVariationIndices(prev => new Set(prev).add(index));
        try {
            const variedText = await generatePromptVariation(textToVary);
            handlePromptContentChange(index, variedText);
        } catch (e) {
            addToast(`Variation failed: ${e instanceof Error ? e.message : "Unknown error"}`, 'error');
        } finally {
            setGeneratingVariationIndices(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        }
    };
    
    const handleTranslateInstructions = async () => {
        if (!promptGenerationInstructions.trim() || isTranslatingInstructions) return;
        setIsTranslatingInstructions(true);
        try {
            const translated = await translateToEnglish(promptGenerationInstructions);
            setPromptGenerationInstructions(translated);
        } catch (e) {
            addToast(`Translation failed: ${e instanceof Error ? e.message : "Unknown error"}`, 'error');
        } finally {
            setIsTranslatingInstructions(false);
        }
    };

    const handleGeneratePromptList = async () => {
        if (!promptGenerationInstructions.trim() || isGeneratingPrompts) return;
        setIsGeneratingPrompts(true);
        try {
            const jsonString = await generatePromptList(promptGenerationInstructions);
            const prettyJson = JSON.stringify(JSON.parse(jsonString), null, 2);
            setJsonPrompts(prettyJson);
            setJsonError(null); 
        } catch (e) {
            addToast(`Prompt generation failed: ${e instanceof Error ? e.message : "Unknown error"}`, 'error');
        } finally {
            setIsGeneratingPrompts(false);
        }
    };

    const handleClearGallery = useCallback(() => {
        setGenerationResults([]);
        setProgress({ completed: 0, total: 0 });
    }, []);

    const handleRemoveGeneratedImage = useCallback((key: string) => {
        setGenerationResults(currentResults => currentResults.filter(result => result.key !== key));
    }, []);

    const setFinalImageFiles = useCallback((files: File[]) => {
        handleClearGallery();
        const appFiles: AppFile[] = files.map(file => ({
            file,
            id: generateShortId(),
        }));
        setImageFiles(appFiles);
        setSetId(files.length > 0 ? generateSetId() : '');
    }, [handleClearGallery]);

    const proceedToCropChoice = useCallback((files: File[]) => {
        setFilesAwaitingCropChoice(files);
        setShowCropChoiceModal(true);
    }, []);

    const handleConfirmClearAndUpload = useCallback(() => {
        if (pendingFiles) {
            proceedToCropChoice(pendingFiles);
            setPendingFiles(null);
        }
    }, [pendingFiles, proceedToCropChoice]);

    const handleCancelUpload = useCallback(() => {
        setPendingFiles(null);
    }, []);

    const handleNewImageUpload = useCallback((newFiles: File[]) => {
        if (generationResults.length > 0) {
            setPendingFiles(newFiles);
        } else {
            proceedToCropChoice(newFiles);
        }
    }, [generationResults.length, proceedToCropChoice]);
    
    const handleStartCropping = () => {
        if (filesAwaitingCropChoice) {
            setCroppingFiles(filesAwaitingCropChoice);
        }
        setShowCropChoiceModal(false);
        setFilesAwaitingCropChoice(null);
    };

    const handleUseOriginals = () => {
        if (filesAwaitingCropChoice) {
            setFinalImageFiles(filesAwaitingCropChoice);
        }
        setShowCropChoiceModal(false);
        setFilesAwaitingCropChoice(null);
    };

    const handleCancelCropChoice = () => {
        setShowCropChoiceModal(false);
        setFilesAwaitingCropChoice(null);
    };

    const handleCropConfirm = (croppedFiles: File[]) => {
        setFinalImageFiles(croppedFiles);
        setCroppingFiles(null);
    };

    const handleCropCancel = () => setCroppingFiles(null);

    const handleRemoveUploadedImage = useCallback((indexToRemove: number) => {
        setImageFiles(currentFiles => {
            const newFiles = currentFiles.filter((_, index) => index !== indexToRemove);
            if (newFiles.length === 0) setSetId('');
            return newFiles;
        });
    }, []);
    
    const handleRemoveAllUploadedImages = useCallback(() => {
        if (imageFiles.length === 0) return;
        setConfirmAction({
            title: "Clear Uploaded Images?",
            message: 'This will remove all images from the uploader. This action cannot be undone.',
            confirmText: "Clear All",
            onConfirm: () => {
                setImageFiles([]);
                setSetId('');
            }
        });
    }, [imageFiles.length, setConfirmAction]);
    
    const getDownloadFilename = useCallback((result: ImageStudioGenerationResult): string => {
        const { originalImageIndex, originalPromptIndex, batchTimestamp } = result;
        const appFile = imageFiles[originalImageIndex];
        if (!appFile) return `generated-image.png`;

        const originalFile = appFile.file;
        const shortId = appFile.id;
        let baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.'));
        const extension = originalFile.name.substring(originalFile.name.lastIndexOf('.') + 1) || 'png';
        if (baseName.startsWith('cropped_')) baseName = baseName.substring(8);
        const sanitizedBaseName = sanitizeFilename(baseName);

        const filename = filenameTemplate
            .replace('{timestamp}', String(batchTimestamp))
            .replace('{set_id}', setId)
            .replace('{original_filename}', sanitizedBaseName)
            .replace('{version_index}', String(originalPromptIndex + 1))
            .replace('{short_id}', shortId);

        return `${filename}.${extension}`;
    }, [imageFiles, filenameTemplate, setId]);

    const handleDownloadSingle = useCallback((key: string) => {
        withMultiDownloadWarning(async () => {
            const result = generationResults.find(r => r.key === key);
            if (!result || result.status !== 'success' || !result.url || !result.prompt) {
                addToast("Could not find the image data to download.", "error");
                return;
            }

            addToast(`Downloading files for image...`, 'info');

            try {
                const filename = getDownloadFilename(result);
                await downloadImageWithMetadata({
                    imageUrl: result.url,
                    filename,
                    prompt: result.prompt,
                    metadata: {
                        filename,
                        image_generation_prompt: result.prompt
                    },
                    embedInImage: true,
                });
            } catch (err) {
                addToast(err instanceof Error ? err.message : "An error occurred while preparing files.", "error");
            }
        });
    }, [generationResults, withMultiDownloadWarning, addToast, getDownloadFilename]);
    
    const handleDownloadAll = useCallback(async () => {
        withMultiDownloadWarning(async () => {
            const successfulResults = generationResults.filter(r => r.status === 'success');
            if (successfulResults.length === 0) {
                addToast("No images to download.", "info");
                return;
            }

            try {
                // Prepare images array for bulk download
                const images = successfulResults
                    .filter(r => r.url && r.prompt)
                    .map(result => ({
                        imageUrl: result.url!,
                        filename: getDownloadFilename(result),
                        prompt: result.prompt!,
                        metadata: undefined, // No metadata files in Image Studio bulk download
                    }));

                // Add original files if requested
                if (includeOriginals) {
                    const addedOriginals = new Set<number>();
                    for (const result of successfulResults) {
                        if (!addedOriginals.has(result.originalImageIndex)) {
                            const appFile = imageFiles[result.originalImageIndex];
                            if (appFile) {
                                const originalFile = appFile.file;
                                const shortId = appFile.id;
                                let baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.'));
                                const extension = originalFile.name.substring(originalFile.name.lastIndexOf('.') + 1) || 'png';
                                if (baseName.startsWith('cropped_')) baseName = baseName.substring(8);
                                const sanitizedBaseName = sanitizeFilename(baseName);
                                const originalZipFilename = `${setId}_${sanitizedBaseName}_${shortId}_before.${extension}`;

                                // Convert File to base64 data URL
                                const reader = new FileReader();
                                const base64Data = await new Promise<string>((resolve, reject) => {
                                    reader.onload = () => resolve(reader.result as string);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(originalFile);
                                });

                                images.push({
                                    imageUrl: undefined as any,
                                    imageBase64: base64Data,
                                    filename: originalZipFilename,
                                    prompt: undefined,
                                    metadata: undefined,
                                });

                                addedOriginals.add(result.originalImageIndex);
                            }
                        }
                    }
                }

                // Use centralized download service
                await downloadBulkImages({
                    images,
                    zipFilename: `AI_Studio_Image_Batch_${setId}_${getTimestamp()}.zip`,
                    progressCallback: setDownloadProgress,
                    embedPrompts: true,
                    includeMetadataFiles: false, // Image Studio doesn't include metadata files in bulk download
                });

            } catch (err) {
                addToast("An error occurred while creating the zip file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    }, [generationResults, withMultiDownloadWarning, setDownloadProgress, addToast, includeOriginals, imageFiles, getDownloadFilename, setId]);

    const handleSuccess = useCallback((newImage: ImageStudioRunResult) => {
        const key = `${newImage.batchTimestamp}-${newImage.originalImageIndex}-${newImage.originalPromptIndex}`;
        setGenerationResults(prev => prev.map(r => r.key === key ? { ...r, status: 'success', url: newImage.url, prompt: newImage.prompt } : r));
    }, []);
    
    const handleFail = useCallback((error: any) => {
        const { originalImageIndex, originalPromptIndex, batchTimestamp, prompt } = error.context || {};
        if (batchTimestamp !== undefined) {
            const key = `${batchTimestamp}-${originalImageIndex}-${originalPromptIndex}`;
            const modelText = (error as any).modelText;
            const message = error instanceof Error ? error.message : "An unknown error occurred.";

            if (modelText) {
                setGenerationResults(prev => prev.map(r => r.key === key ? { 
                    ...r, 
                    status: 'warning', 
                    error: message,
                    modelResponse: modelText,
                    prompt: prompt,
                } : r));
            } else {
                setGenerationResults(prev => prev.map(r => r.key === key ? { ...r, status: 'error', error: message, prompt: prompt } : r));
            }
        }
    }, []);
    
    const createGenerationTask = useCallback((imageIndex: number, promptIndex: number, prompts: string[], timestamp: number) => {
        return async (): Promise<ImageStudioRunResult> => {
            const file = imageFiles[imageIndex].file;
            const prompt = prompts[promptIndex];
            const finalPrompt = [prependPrompt, prompt, appendPrompt].filter(Boolean).join(' ').trim();
            
            try {
                const base64 = await fileToBase64(file);
                const imageSource = { base64, mimeType: file.type };

                const imageUrl = await generateFigureImage(
                    model, 
                    finalPrompt, 
                    [imageSource],
                    { width, height, imageSizePreset, aspectRatio: aspectRatio || undefined },
                    useNanoBananaWebhook
                );
                return { url: imageUrl, originalImageIndex: imageIndex, originalPromptIndex: promptIndex, prompt: finalPrompt, batchTimestamp: timestamp };
            } catch (error) {
                 const contextualError = error instanceof Error ? error : new Error("Unknown error during generation");
                 (contextualError as any).context = { originalImageIndex: imageIndex, originalPromptIndex: promptIndex, batchTimestamp: timestamp, prompt: finalPrompt };
                 throw contextualError;
            }
        };
    }, [imageFiles, prependPrompt, appendPrompt, model, width, height, imageSizePreset, aspectRatio, useNanoBananaWebhook]);
    
    const runGenerations = useCallback(async (tasks: (() => Promise<ImageStudioRunResult>)[]) => {
        if (tasks.length === 0) return;
        setIsLoading(true);
        await runConcurrentTasks(tasks, 10, handleSuccess, handleFail, (completed, total) => setProgress({ completed, total }));
        setIsLoading(false);
    }, [handleSuccess, handleFail]);

    const handleGenerate = useCallback(async () => {
        const prompts = getActivePrompts();
        if (jsonPrompts.trim() !== '' && jsonError) {
            addToast(`JSON error: ${jsonError}`, 'error');
            return;
        }
        if (imageFiles.length === 0 || prompts.some(p => !p.trim())) {
            addToast("Please upload images and fill all prompts.", 'error');
            return;
        }
        logUserAction('GENERATE_IMAGES_IMAGESTUDIO', { imageCount: imageFiles.length, promptCount: prompts.length, totalGenerations: imageFiles.length * prompts.length, setId });
        const timestamp = Date.now();
        setBatchTimestamp(timestamp);
        const newResults: ImageStudioGenerationResult[] = imageFiles.flatMap((_, imgIdx) => prompts.map((_, prmptIdx) => ({
            key: `${timestamp}-${imgIdx}-${prmptIdx}`, status: 'pending', originalImageIndex: imgIdx, originalPromptIndex: prmptIdx, batchTimestamp: timestamp
        })));
        setGenerationResults(prev => [...newResults, ...prev]);
        const tasks = imageFiles.flatMap((_, imgIdx) => prompts.map((_, prmptIdx) => createGenerationTask(imgIdx, prmptIdx, prompts, timestamp)));
        await runGenerations(tasks);
    }, [imageFiles, getActivePrompts, jsonPrompts, jsonError, createGenerationTask, runGenerations, addToast, setId]);

    const handleRetryAll = useCallback(async () => {
        if (isLoading) return;
        const failed = generationResults.filter(r => r.status === 'error' || r.status === 'warning');
        if (failed.length === 0) return;
        logUserAction('RETRY_ALL_IMAGES_IMAGESTUDIO', { failedCount: failed.length, setId });
        setGenerationResults(prev => prev.map(r => (r.status === 'error' || r.status === 'warning') ? { ...r, status: 'pending', error: undefined, modelResponse: undefined } : r));
        const prompts = getActivePrompts();
        const tasks = failed.map(r => createGenerationTask(r.originalImageIndex, r.originalPromptIndex, prompts, r.batchTimestamp));
        await runGenerations(tasks);
    }, [isLoading, generationResults, getActivePrompts, createGenerationTask, runGenerations, setId]);
    
    const handleRetryOne = useCallback(async (key: string) => {
        const toRetry = generationResults.find(r => r.key === key);
        if (!toRetry || toRetry.status === 'pending') return;
    
        logUserAction('RETRY_ONE_IMAGE_IMAGESTUDIO', { key, setId });
        setGenerationResults(prev => prev.map(r => r.key === key ? { ...r, status: 'pending', error: undefined, modelResponse: undefined } : r));
        
        const prompts = getActivePrompts();
        const task = createGenerationTask(toRetry.originalImageIndex, toRetry.originalPromptIndex, prompts, toRetry.batchTimestamp);
        
        try {
            const result = await task();
            handleSuccess(result);
        } catch (error) {
            handleFail(error);
        }
    }, [generationResults, getActivePrompts, createGenerationTask, handleSuccess, handleFail, setId]);


    const isSeedreamAspectRatioInvalid = useMemo(() => {
        if (model !== 'seedream' || imageSizePreset !== 'custom') {
            return false;
        }
        if (!customWidth || !customHeight) return false;
        const ratio = customWidth / customHeight;
        return ratio < 0.333 || ratio > 3;
    }, [model, imageSizePreset, customWidth, customHeight]);

    const isGenerateDisabled = imageFiles.length === 0 || (jsonPrompts.trim() === '' && promptContents.slice(0, numberOfVersions).some(p => p.trim() === '')) || (jsonPrompts.trim() !== '' && !!jsonError) || isSeedreamAspectRatioInvalid;

    return {
        numberOfVersions, setNumberOfVersions, promptContents, setPromptContents, imageFiles, setImageFiles, generationResults, setGenerationResults, isLoading, setIsLoading,
        includeOriginals, setIncludeOriginals, batchTimestamp, setBatchTimestamp,
        progress, setProgress, translatingIndices, setTranslatingIndices, generatingVariationIndices, setGeneratingVariationIndices, enhancingIndices, setEnhancingIndices, 
        pendingFiles, setPendingFiles, setId, setSetId, showCropChoiceModal, setShowCropChoiceModal, filesAwaitingCropChoice, setFilesAwaitingCropChoice, croppingFiles, setCroppingFiles,
        isAdvancedOpen, setIsAdvancedOpen, model, setModel, imageSizePreset, setImageSizePreset, customWidth, setCustomWidth, customHeight, setCustomHeight, prependPrompt, setPrependPrompt,
        appendPrompt, setAppendPrompt, jsonPrompts, setJsonPrompts, jsonError, setJsonError, filenameTemplate, setFilenameTemplate, promptGenerationInstructions, setPromptGenerationInstructions,
        isGeneratingPrompts, setIsGeneratingPrompts, isTranslatingInstructions, setIsTranslatingInstructions, imageSizePresets,
        imagePreviewUrls,
        handleNumberOfVersionsChange, handlePromptContentChange, handleJsonPromptChange, getActivePrompts, handleTranslatePrompt,
        handleGenerateVariation, handleEnhancePrompt, handleTranslateInstructions, handleGeneratePromptList, handleClearGallery, handleRemoveGeneratedImage, handleNewImageUpload, handleStartCropping,
        handleUseOriginals, handleCancelCropChoice, handleCropConfirm, handleCropCancel, handleRemoveUploadedImage, handleDownloadAll, handleConfirmClearAndUpload,
        handleCancelUpload, handleSuccess, handleFail, createGenerationTask, runGenerations, handleGenerate, handleRetryAll, handleRetryOne, isGenerateDisabled, handleDownloadSingle,
        aspectRatio, setAspectRatio, getDownloadFilename, handleRemoveAllUploadedImages,
        isSeedreamAspectRatioInvalid,
        inputImageWarnings
    };
};