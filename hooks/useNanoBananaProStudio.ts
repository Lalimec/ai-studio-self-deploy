import { useState, useCallback, useMemo } from 'react';
import { generateFigureImage, translateToEnglish, generatePromptList, generatePromptVariation, enhancePrompt } from '../services/geminiService';
import { AppFile, Toast, DownloadSettings } from '../types';
import { fileToBase64, generateShortId, generateSetId, getTimestamp, sanitizeFilename } from '../services/imageUtils';
import { logUserAction } from '../services/loggingService';
import { downloadImageWithMetadata, downloadBulkImages } from '../services/downloadService';
import { Constance } from '../services/endpoints';
import { uploadImageFromDataUrl } from '../services/imageUploadService';
import { runConcurrentTasks } from '../services/apiUtils';

export interface NanoBananaProGenerationResult {
    key: string;
    status: 'success' | 'error' | 'pending' | 'warning';
    url?: string; // Single URL
    prompt?: string;
    error?: string;
    batchTimestamp: number;
    originalPromptIndex: number;
    originalImageIndex: number;
    modelResponse?: string;
}

export const useNanoBananaProStudio = (
    addToast: (message: string, type: Toast['type']) => void,
    setConfirmAction: React.Dispatch<React.SetStateAction<any>>,
    setDownloadProgress: React.Dispatch<React.SetStateAction<{ visible: boolean; message: string; progress: number }>>,
    withMultiDownloadWarning: (action: () => void) => void,
    downloadSettings: DownloadSettings = { includeMetadataFiles: false }
) => {
    // Prompt & Version State
    const [numberOfVersions, setNumberOfVersions] = useState<number>(1);
    const [promptContents, setPromptContents] = useState<string[]>(['']);
    const [prependPrompt, setPrependPrompt] = useState<string>('');
    const [appendPrompt, setAppendPrompt] = useState<string>('');
    const [jsonPrompts, setJsonPrompts] = useState<string>('');
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Advanced Options State
    const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
    const [promptGenerationInstructions, setPromptGenerationInstructions] = useState<string>('');
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState<boolean>(false);
    const [isTranslatingInstructions, setIsTranslatingInstructions] = useState<boolean>(false);
    const [filenameTemplate, setFilenameTemplate] = useState<string>('{set_id}_{original_filename}_{timestamp}_{version_index}');

    // Async Operation States
    const [translatingIndices, setTranslatingIndices] = useState<Set<number>>(new Set());
    const [generatingVariationIndices, setGeneratingVariationIndices] = useState<Set<number>>(new Set());
    const [enhancingIndices, setEnhancingIndices] = useState<Set<number>>(new Set());

    // Cropping State
    const [showCropChoiceModal, setShowCropChoiceModal] = useState<boolean>(false);
    const [filesAwaitingCropChoice, setFilesAwaitingCropChoice] = useState<File[] | null>(null);
    const [croppingFiles, setCroppingFiles] = useState<File[] | null>(null);
    const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
    const [setId, setSetId] = useState<string>('');
    const [batchTimestamp, setBatchTimestamp] = useState<number>(Date.now());

    // Image & Generation State
    const [imageFiles, setImageFiles] = useState<AppFile[]>([]);
    const [generationResults, setGenerationResults] = useState<NanoBananaProGenerationResult[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [progress, setProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });

    // Options
    const numImages = 1; // Fixed to 1 for Pro Studio
    const [aspectRatio, setAspectRatio] = useState<string>('auto');
    const [outputFormat, setOutputFormat] = useState<string>('jpeg');
    const [resolution, setResolution] = useState<string>('2K');
    const [includeOriginals, setIncludeOriginals] = useState<boolean>(true);

    const imagePreviewUrls = useMemo(() => {
        return imageFiles.map(appFile => URL.createObjectURL(appFile.file));
    }, [imageFiles]);

    // --- Image Upload Logic ---
    const proceedToCropChoice = useCallback((files: File[]) => {
        setFilesAwaitingCropChoice(files);
        setShowCropChoiceModal(true);
    }, []);

    const handleImageUpload = useCallback((files: File[]) => {
        if (imageFiles.length + files.length > 6) {
            addToast("You can upload a maximum of 6 images.", "warning");
            return;
        }
        // Instead of directly adding, we might want to offer cropping
        // For now, let's follow ImageStudio pattern: if results exist, confirm clear.
        // If no results, proceed to crop choice.

        if (generationResults.length > 0) {
            setPendingFiles(files);
        } else {
            proceedToCropChoice(files);
        }
    }, [imageFiles.length, generationResults.length, addToast, proceedToCropChoice]);

    // Handle slot-based file selection with distribution logic
    const handleFilesSelected = useCallback((files: File[], startSlot?: number) => {
        // Calculate how many files can be added
        const availableSlots = 6 - imageFiles.length;
        const filesToAdd = files.slice(0, availableSlots);

        if (filesToAdd.length === 0) {
            addToast("All slots are full. Remove some images first.", "warning");
            return;
        }

        if (files.length > availableSlots) {
            addToast(`Only ${availableSlots} slot(s) available. Adding first ${availableSlots} image(s).`, "warning");
        }

        // If results exist, confirm clear
        if (generationResults.length > 0) {
            setPendingFiles(filesToAdd);
        } else {
            proceedToCropChoice(filesToAdd);
        }
    }, [imageFiles.length, generationResults.length, addToast, proceedToCropChoice]);

    const handleStartCropping = () => {
        if (filesAwaitingCropChoice) {
            setCroppingFiles(filesAwaitingCropChoice);
        }
        setShowCropChoiceModal(false);
        setFilesAwaitingCropChoice(null);
    };

    const handleUseOriginals = () => {
        if (filesAwaitingCropChoice) {
            const newFiles = filesAwaitingCropChoice.map(file => ({
                file,
                id: generateShortId(),
            }));
            setImageFiles(prev => {
                const updated = [...prev, ...newFiles];
                // Generate setId when first files are added
                if (prev.length === 0 && updated.length > 0) {
                    setSetId(generateSetId());
                }
                return updated;
            });
        }
        setShowCropChoiceModal(false);
        setFilesAwaitingCropChoice(null);
    };

    const handleCancelCropChoice = () => {
        setShowCropChoiceModal(false);
        setFilesAwaitingCropChoice(null);
    };

    const handleCropConfirm = (croppedFiles: File[]) => {
        const newFiles = croppedFiles.map(file => ({
            file,
            id: generateShortId(),
        }));
        setImageFiles(prev => {
            const updated = [...prev, ...newFiles];
            // Generate setId when first files are added
            if (prev.length === 0 && updated.length > 0) {
                setSetId(generateSetId());
            }
            return updated;
        });
        setCroppingFiles(null);
    };

    const handleCropCancel = () => setCroppingFiles(null);

    const handleConfirmClearAndUpload = useCallback(() => {
        if (pendingFiles) {
            handleClearGallery();
            setImageFiles([]); // Clear existing input images too? ImageStudio does.
            proceedToCropChoice(pendingFiles);
            setPendingFiles(null);
        }
    }, [pendingFiles, proceedToCropChoice]);

    const handleCancelUpload = useCallback(() => {
        setPendingFiles(null);
    }, []);

    const handleRemoveImage = useCallback((id: string) => {
        setImageFiles(prev => {
            const updated = prev.filter(f => f.id !== id);
            // Clear setId when all images are removed
            if (updated.length === 0) {
                setSetId('');
            }
            return updated;
        });
    }, []);

    const handleClearImages = useCallback(() => {
        setImageFiles([]);
        setSetId('');
    }, []);

    // --- Prompt Logic ---
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

    // --- Prompt Helpers (Translate, Enhance, etc.) ---
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

    // --- Generation Logic ---
    const handleSuccess = useCallback((key: string, url: string) => {
        setGenerationResults(prev => prev.map(r => r.key === key ? { ...r, status: 'success', url: url } : r));
    }, []);

    const handleFail = useCallback((key: string, error: any) => {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        setGenerationResults(prev => prev.map(r => r.key === key ? { ...r, status: 'error', error: message } : r));
    }, []);

    // Helper to ensure files have cached publicUrls (called before generation starts)
    const ensurePublicUrls = useCallback(async (): Promise<void> => {
        const filesToUpload = imageFiles.filter(f => !f.publicUrl);
        if (filesToUpload.length === 0) return; // All files already have cached URLs

        await Promise.all(filesToUpload.map(async (appFile) => {
            const base64 = await fileToBase64(appFile.file);
            const dataUrl = `data:${appFile.file.type};base64,${base64}`;
            const publicUrl = await uploadImageFromDataUrl(dataUrl, appFile.file.name);

            // Update state with cached URL
            setImageFiles(prev => prev.map(f =>
                f.id === appFile.id ? { ...f, publicUrl } : f
            ));
        }));
    }, [imageFiles]);

    const createGenerationTask = useCallback((promptIndex: number, promptText: string, timestamp: number, resultKeys: string[]) => {
        return async () => {
            const finalPrompt = [prependPrompt, promptText, appendPrompt].filter(Boolean).join(' ').trim();

            try {
                const imageSources = await Promise.all(imageFiles.map(async (appFile) => {
                    const base64 = await fileToBase64(appFile.file);
                    return { base64, mimeType: appFile.file.type, publicUrl: appFile.publicUrl };
                }));

                const result = await generateFigureImage(
                    Constance.models.image.nanoBananaPro,
                    finalPrompt,
                    imageSources,
                    {
                        num_images: numImages,
                        aspectRatio: aspectRatio,
                        output_format: outputFormat,
                        resolution: resolution
                    }
                );

                // generateFigureImage returns string[] for nano-banana-pro
                const urls = result as string[];

                // Distribute URLs to the pre-created result keys
                urls.forEach((url, idx) => {
                    if (idx < resultKeys.length) {
                        handleSuccess(resultKeys[idx], url);
                    }
                });

                // If we got fewer images than expected, fail the remaining ones
                if (urls.length < resultKeys.length) {
                    for (let i = urls.length; i < resultKeys.length; i++) {
                        handleFail(resultKeys[i], new Error("No image returned for this slot"));
                    }
                }

            } catch (error) {
                resultKeys.forEach(key => handleFail(key, error));
            }
        };
    }, [imageFiles, prependPrompt, appendPrompt, numImages, aspectRatio, outputFormat, resolution, handleSuccess, handleFail]);

    const handleGenerate = useCallback(async () => {
        const prompts = getActivePrompts();
        if (jsonPrompts.trim() !== '' && jsonError) {
            addToast(`JSON error: ${jsonError}`, 'error');
            return;
        }
        if (imageFiles.length === 0) {
            addToast("Please upload at least one image.", "error");
            return;
        }
        if (prompts.some(p => !p.trim())) {
            addToast("Please fill all prompts.", 'error');
            return;
        }

        logUserAction('GENERATE_IMAGES_NANOBANANAPRO', { imageCount: imageFiles.length, promptCount: prompts.length, numImages, resolution });

        const timestamp = Date.now();

        // Create placeholders IMMEDIATELY for instant UI feedback
        const newResults: NanoBananaProGenerationResult[] = [];
        const taskConfigs: { pIndex: number; prompt: string; keys: string[] }[] = [];

        prompts.forEach((prompt, pIndex) => {
            const finalPrompt = [prependPrompt, prompt, appendPrompt].filter(Boolean).join(' ').trim();
            const keysForThisPrompt: string[] = [];

            for (let i = 0; i < numImages; i++) {
                const key = `${timestamp}-${pIndex}-${i}`;
                keysForThisPrompt.push(key);
                newResults.push({
                    key,
                    status: 'pending',
                    batchTimestamp: timestamp,
                    prompt: finalPrompt,
                    originalPromptIndex: pIndex,
                    originalImageIndex: 0,
                });
            }

            taskConfigs.push({ pIndex, prompt, keys: keysForThisPrompt });
        });

        // Show placeholders immediately
        setGenerationResults(prev => [...newResults, ...prev]);
        setProgress({ completed: 0, total: taskConfigs.length });
        setIsLoading(true);

        // Ensure all files have cached publicUrls before generating (runs after placeholders shown)
        try {
            await ensurePublicUrls();
        } catch (error) {
            addToast(`Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            // Mark all placeholders as error
            setGenerationResults(prev => prev.map(r =>
                newResults.some(nr => nr.key === r.key)
                    ? { ...r, status: 'error', error: 'Image upload failed' }
                    : r
            ));
            setIsLoading(false);
            return;
        }

        // Create tasks for parallel execution
        const tasks = taskConfigs.map(config => createGenerationTask(config.pIndex, config.prompt, timestamp, config.keys));

        // Run tasks in parallel with concurrency limit of 5
        await runConcurrentTasks(
            tasks,
            5,
            () => {}, // Success handled inside createGenerationTask
            () => {}, // Failure handled inside createGenerationTask
            (completed, total) => setProgress({ completed, total })
        );

        setIsLoading(false);

    }, [imageFiles, getActivePrompts, jsonPrompts, jsonError, createGenerationTask, addToast, prependPrompt, appendPrompt, numImages, resolution, ensurePublicUrls]);

    // --- Result Management ---
    const handleRemoveResult = useCallback((key: string) => {
        setGenerationResults(prev => prev.filter(r => r.key !== key));
    }, []);

    const handleClearGallery = useCallback(() => {
        setGenerationResults([]);
        setProgress({ completed: 0, total: 0 });
        setImageFiles([]);
        setSetId('');
    }, []);

    const getDownloadFilename = useCallback((result: NanoBananaProGenerationResult): string => {
        const { originalImageIndex, originalPromptIndex, batchTimestamp } = result;
        const appFile = imageFiles[originalImageIndex];
        if (!appFile) return `nano-banana-pro-generated.${outputFormat}`;

        const originalFile = appFile.file;
        const shortId = appFile.id;
        let baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.'));
        if (baseName.startsWith('cropped_')) baseName = baseName.substring(8);
        const sanitizedBaseName = sanitizeFilename(baseName);

        // Conditional source reference: use original_filename for single image, source count for multiple
        const sourceReference = imageFiles.length === 1
            ? sanitizedBaseName
            : `${imageFiles.length}src`;

        const filename = filenameTemplate
            .replace('{timestamp}', String(batchTimestamp))
            .replace('{set_id}', setId)
            .replace('{original_filename}', sourceReference)
            .replace('{source_count}', String(imageFiles.length))
            .replace('{version_index}', String(originalPromptIndex + 1))
            .replace('{short_id}', shortId);

        return `${filename}.${outputFormat}`;
    }, [imageFiles, filenameTemplate, setId, outputFormat]);

    const handleDownloadResult = useCallback((key: string) => {
        const result = generationResults.find(r => r.key === key);
        if (!result || !result.url) return;

        withMultiDownloadWarning(async () => {
            try {
                const filename = getDownloadFilename(result);
                await downloadImageWithMetadata({
                    imageUrl: result.url!,
                    filename,
                    prompt: result.prompt || '',
                    metadata: { image_generation_prompt: result.prompt || '' },
                    embedInImage: true,
                    includeMetadataFile: downloadSettings.includeMetadataFiles
                });
            } catch (e) {
                addToast("Download failed.", "error");
            }
        });
    }, [generationResults, withMultiDownloadWarning, downloadSettings, addToast, getDownloadFilename]);

    const handleDownloadAll = useCallback(async () => {
        withMultiDownloadWarning(async () => {
            const successfulResults = generationResults.filter(r => r.status === 'success' && r.url);
            if (successfulResults.length === 0) {
                addToast("No images to download.", "info");
                return;
            }

            try {
                const images = successfulResults.map((result) => ({
                    imageUrl: result.url!,
                    filename: getDownloadFilename(result),
                    prompt: result.prompt,
                }));

                // Add ALL original files if requested (not just those used in generation)
                if (includeOriginals) {
                    for (let i = 0; i < imageFiles.length; i++) {
                        const appFile = imageFiles[i];
                        if (appFile) {
                            const originalFile = appFile.file;
                            const shortId = appFile.id;
                            let baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.'));
                            const extension = originalFile.name.substring(originalFile.name.lastIndexOf('.') + 1) || outputFormat;
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
                        }
                    }
                }

                await downloadBulkImages({
                    images,
                    zipFilename: `AI_Studio_Image_Batch_${setId}_${getTimestamp()}.zip`,
                    progressCallback: setDownloadProgress,
                    embedPrompts: true,
                    includeMetadataFiles: downloadSettings.includeMetadataFiles,
                });

            } catch (err) {
                addToast("An error occurred while creating the zip file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    }, [generationResults, withMultiDownloadWarning, setDownloadProgress, addToast, downloadSettings, includeOriginals, imageFiles, getDownloadFilename, setId, outputFormat]);

    const handleRetryOne = useCallback(async (key: string) => {
        const result = generationResults.find(r => r.key === key);
        if (!result) return;

        logUserAction('RETRY_ONE_IMAGE_NANOBANANAPRO', { key });
        setGenerationResults(prev => prev.map(r => r.key === key ? { ...r, status: 'pending', error: undefined } : r));

        try {
            // Ensure files have cached publicUrls
            await ensurePublicUrls();

            const imageSources = await Promise.all(imageFiles.map(async (appFile) => {
                const base64 = await fileToBase64(appFile.file);
                return { base64, mimeType: appFile.file.type, publicUrl: appFile.publicUrl };
            }));

            const urlResult = await generateFigureImage(
                Constance.models.image.nanoBananaPro,
                result.prompt || '',
                imageSources,
                {
                    num_images: 1,
                    aspectRatio: aspectRatio,
                    output_format: outputFormat,
                    resolution: resolution
                }
            );
            const urls = urlResult as string[];

            if (urls.length > 0) {
                handleSuccess(key, urls[0]);
            } else {
                handleFail(key, new Error("No image returned"));
            }
        } catch (e) {
            handleFail(key, e);
        }

    }, [generationResults, imageFiles, aspectRatio, outputFormat, resolution, handleSuccess, handleFail]);

    const handleRetryAll = useCallback(async () => {
        // Placeholder
    }, []);

    const inputImageWarnings = {};

    return {
        // Prompt State & Handlers
        numberOfVersions, setNumberOfVersions, promptContents, setPromptContents,
        prependPrompt, setPrependPrompt, appendPrompt, setAppendPrompt,
        jsonPrompts, setJsonPrompts, jsonError, setJsonError,
        handleNumberOfVersionsChange, handlePromptContentChange, handleJsonPromptChange,
        getActivePrompts,

        // Advanced Options State & Handlers
        isAdvancedOpen, setIsAdvancedOpen,
        promptGenerationInstructions, setPromptGenerationInstructions,
        isGeneratingPrompts, setIsGeneratingPrompts,
        isTranslatingInstructions, setIsTranslatingInstructions,
        filenameTemplate, setFilenameTemplate,
        handleTranslateInstructions, handleGeneratePromptList,

        // Async Helpers
        translatingIndices, generatingVariationIndices, enhancingIndices,
        handleTranslatePrompt, handleGenerateVariation, handleEnhancePrompt,

        // Image State & Handlers
        imageFiles, handleImageUpload, handleFilesSelected, handleRemoveImage, handleClearImages, imagePreviewUrls,
        inputImageWarnings,
        handleRemoveAllUploadedImages: handleClearImages,

        // Generation State & Handlers
        generationResults, isLoading, progress, handleGenerate, handleRemoveResult, handleClearGallery,
        handleDownloadResult, handleDownloadAll, handleRetryOne, handleRetryAll,
        handleDownloadSingle: handleDownloadResult,
        handleRemoveGeneratedImage: handleRemoveResult,

        // Options
        numImages,
        aspectRatio, setAspectRatio,
        outputFormat, setOutputFormat,
        resolution, setResolution,
        includeOriginals, setIncludeOriginals,

        // Cropping & Upload Flow
        showCropChoiceModal, setShowCropChoiceModal,
        filesAwaitingCropChoice, setFilesAwaitingCropChoice,
        croppingFiles, setCroppingFiles,
        pendingFiles, setPendingFiles,
        handleStartCropping, handleUseOriginals, handleCancelCropChoice,
        handleCropConfirm, handleCropCancel,
        handleConfirmClearAndUpload, handleCancelUpload,
        setId, setSetId, batchTimestamp, setBatchTimestamp,
        getDownloadFilename
    };
};
