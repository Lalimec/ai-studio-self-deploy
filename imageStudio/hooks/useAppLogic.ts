/// <reference lib="dom" />
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { generateFigureImage, translateToEnglish, enhanceAndTranslatePrompt, generatePromptList, generatePromptVariation, enhancePrompt } from '../services/geminiService';
import { GeneratedImage, GenerationResult, AppFile } from '../types';
import { fileToBase64, blobToDataUrl, generateSetId, generateShortId } from '../utils/fileUtils';
import { embedPromptInJpeg, embedPromptInPng } from '../utils/metadata';
import { runConcurrentTasks } from '../utils/taskRunner';

declare const JSZip: any;
declare const piexif: any;

export const useAppLogic = () => {
    const [numberOfVersions, setNumberOfVersions] = useState<number>(1);
    const [promptContents, setPromptContents] = useState<string[]>(['']);
    const [imageFiles, setImageFiles] = useState<AppFile[]>([]);
    const [generationResults, setGenerationResults] = useState<GenerationResult[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [includeOriginals, setIncludeOriginals] = useState<boolean>(true);
    const [batchTimestamp, setBatchTimestamp] = useState<number | null>(null);
    const [progress, setProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
    const [translatingIndices, setTranslatingIndices] = useState<Set<number>>(new Set());
    const [generatingVariationIndices, setGeneratingVariationIndices] = useState<Set<number>>(new Set());
    const [enhancingIndices, setEnhancingIndices] = useState<Set<number>>(new Set());

    const [showUploadConfirm, setShowUploadConfirm] = useState<boolean>(false);
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
    const [filenameTemplate, setFilenameTemplate] = useState<string>('{original_filename}_{short_id}_after_{set_id}_{timestamp}_{version_index}');
    const [promptGenerationInstructions, setPromptGenerationInstructions] = useState<string>('');
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState<boolean>(false);
    const [isTranslatingInstructions, setIsTranslatingInstructions] = useState<boolean>(false);

    const imageSizePresets: { [key: string]: { name: string; width?: number; height?: number } } = useMemo(() => ({
        'auto_4K': { name: 'Auto (up to 4K)' },
        'auto_2K': { name: 'Auto (up to 2K)' },
        'auto': { name: 'Auto' },
        'custom': { name: 'Custom', width: customWidth, height: customHeight },
    }), [customWidth, customHeight]);

    useEffect(() => {
        const preset = imageSizePresets[imageSizePreset];
        if (preset && preset.width && preset.height) {
            setCustomWidth(preset.width);
            setCustomHeight(preset.height);
        } else if (!imageSizePreset.startsWith('auto') && imageSizePreset !== 'custom') {
            setImageSizePreset('custom');
        }
    }, [imageSizePreset, imageSizePresets]);

    const { width, height } = useMemo(() => {
        const preset = imageSizePresets[imageSizePreset] || imageSizePresets['custom'];
        return { width: preset.width, height: preset.height };
    }, [imageSizePreset, imageSizePresets]);

    useEffect(() => {
        // This effect exclusively manages the summary error message for image generation failures.
        // It runs when a generation process completes (isLoading becomes false).
        if (isLoading) {
            return;
        }
    
        const failedCount = generationResults.filter(r => r.status === 'error').length;
    
        // Only update the error state if it's currently null or already a generation error message.
        // This prevents overwriting other types of errors (e.g., validation errors).
        const isGenerationError = error === null || (typeof error === 'string' && error.includes('image(s) failed'));
    
        if (isGenerationError) {
            if (failedCount > 0) {
                setError(`${failedCount} image(s) failed. Check individual images for details.`);
            } else {
                // If there are no failed images and the current error is a generation error, clear it.
                setError(null);
            }
        }
    }, [generationResults, isLoading]); // Note: DO NOT add `error` to dependencies to avoid loops.

    const successfulImageUrls = useMemo(() => 
        generationResults
            .filter(r => r.status === 'success' && r.url)
            .map(r => r.url!),
    [generationResults]);
    
    const handleImageClick = (url: string) => {
        const index = successfulImageUrls.findIndex(u => u === url);
        if (index > -1) {
            setSelectedImageIndex(index);
        }
    };

    const handleNextImage = useCallback(() => {
        if (selectedImageIndex !== null && selectedImageIndex < successfulImageUrls.length - 1) {
            setSelectedImageIndex(prevIndex => prevIndex! + 1);
        }
    }, [selectedImageIndex, successfulImageUrls.length]);

    const handlePrevImage = useCallback(() => {
        if (selectedImageIndex !== null && selectedImageIndex > 0) {
            setSelectedImageIndex(prevIndex => prevIndex! - 1);
        }
    }, [selectedImageIndex]);

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

    const handleEnhanceAndTranslatePrompt = async (index: number) => {
        const textToTranslate = promptContents[index];
        if (!textToTranslate.trim()) return;
        setTranslatingIndices(prev => new Set(prev).add(index));
        setError(null);
        try {
            const translatedText = await enhanceAndTranslatePrompt(textToTranslate);
            handlePromptContentChange(index, translatedText);
        } catch (e) {
            setError(`Translation failed: ${e instanceof Error ? e.message : "Unknown error"}`);
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
        setError(null);
        try {
            const enhancedText = await enhancePrompt(textToEnhance);
            handlePromptContentChange(index, enhancedText);
        } catch (e) {
            setError(`Enhancement failed: ${e instanceof Error ? e.message : "Unknown error"}`);
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
        setError(null);
        try {
            const variedText = await generatePromptVariation(textToVary);
            handlePromptContentChange(index, variedText);
        } catch (e) {
            setError(`Variation failed: ${e instanceof Error ? e.message : "Unknown error"}`);
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
        setError(null);
        try {
            const translated = await translateToEnglish(promptGenerationInstructions);
            setPromptGenerationInstructions(translated);
        } catch (e) {
            setError(`Translation failed: ${e instanceof Error ? e.message : "Unknown error"}`);
        } finally {
            setIsTranslatingInstructions(false);
        }
    };

    const handleGeneratePromptList = async () => {
        if (!promptGenerationInstructions.trim() || isGeneratingPrompts) return;
        setIsGeneratingPrompts(true);
        setError(null);
        try {
            const jsonString = await generatePromptList(promptGenerationInstructions);
            const prettyJson = JSON.stringify(JSON.parse(jsonString), null, 2);
            setJsonPrompts(prettyJson);
            setJsonError(null); 
        } catch (e) {
            setError(`Prompt generation failed: ${e instanceof Error ? e.message : "Unknown error"}`);
        } finally {
            setIsGeneratingPrompts(false);
        }
    };

    const handleClearGallery = useCallback(() => {
        setGenerationResults([]);
        setError(null);
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

    const handleNewImageUpload = useCallback((newFiles: File[]) => {
        if (generationResults.length > 0) {
            setPendingFiles(newFiles);
            setShowUploadConfirm(true);
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

    const handleDownloadAll = useCallback(async () => {
        const successfulResults = generationResults.filter(r => r.status === 'success');
        if (successfulResults.length === 0 || typeof JSZip === 'undefined') {
            alert("No images to download or ZIP library not found.");
            return;
        }
    
        const zip = new JSZip();
        const addedOriginals = new Set<number>();
    
        for (const result of successfulResults) {
            if (!result.url || !result.prompt) continue;
            try {
                let blob = await fetch(result.url).then(res => res.blob());
                if (blob.type === 'image/jpeg' && typeof piexif !== 'undefined') {
                    const dataUrl = await blobToDataUrl(blob);
                    const newDataUrl = embedPromptInJpeg(dataUrl, result.prompt);
                    blob = await fetch(newDataUrl).then(res => res.blob());
                } else if (blob.type === 'image/png') {
                    blob = await embedPromptInPng(blob, result.prompt);
                }
    
                const appFile = imageFiles[result.originalImageIndex];
                if (!appFile) continue;
                const originalFile = appFile.file;
                const shortId = appFile.id;
    
                let baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.'));
                const extension = originalFile.name.substring(originalFile.name.lastIndexOf('.') + 1) || 'png';
                
                // Strip "cropped_" prefix to get the true original filename
                if (baseName.startsWith('cropped_')) {
                    baseName = baseName.substring(8); // "cropped_".length is 8
                }
                const sanitizedBaseName = baseName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-._]/g, '');

                // Use the template for generated files
                const generatedFilename = filenameTemplate
                    .replace('{timestamp}', String(result.batchTimestamp))
                    .replace('{set_id}', setId)
                    .replace('{original_filename}', sanitizedBaseName)
                    .replace('{version_index}', String(result.originalPromptIndex + 1))
                    .replace('{short_id}', shortId)
                    + '.png'; // Hardcoding to png as it's the most likely output after embedding

                zip.file(generatedFilename, blob);
    
                if (includeOriginals && !addedOriginals.has(result.originalImageIndex)) {
                    // Use the new naming convention for original files
                    const originalZipFilename = `${sanitizedBaseName}_${shortId}_before_${setId}.${extension}`;
                    zip.file(originalZipFilename, originalFile);
                    addedOriginals.add(result.originalImageIndex);
                }
            } catch (e) {
                console.error(`Failed to process and zip image:`, e);
            }
        }
    
        if (Object.keys(zip.files).length > 0) {
            zip.generateAsync({ type: "blob" }).then((content: Blob) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `batch_generate_${Date.now()}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            });
        }
    }, [generationResults, imageFiles, includeOriginals, filenameTemplate, setId]);

    const handleConfirmClearAndUpload = useCallback(() => {
        if (pendingFiles) {
            proceedToCropChoice(pendingFiles);
            setPendingFiles(null);
        }
        setShowUploadConfirm(false);
    }, [pendingFiles, proceedToCropChoice]);

    const handleDownloadAndConfirm = useCallback(async () => {
        await handleDownloadAll();
        handleConfirmClearAndUpload();
    }, [handleDownloadAll, handleConfirmClearAndUpload]);

    const handleCancelUpload = useCallback(() => {
        setPendingFiles(null);
        setShowUploadConfirm(false);
    }, []);

    const handleSuccess = useCallback((newImage: GeneratedImage) => {
        const key = `${newImage.batchTimestamp}-${newImage.originalImageIndex}-${newImage.originalPromptIndex}`;
        setGenerationResults(prev => prev.map(r => r.key === key ? { ...r, status: 'success', url: newImage.url, prompt: newImage.prompt } : r));
    }, []);
    
    const handleFail = useCallback((error: any) => {
        const { originalImageIndex, originalPromptIndex, batchTimestamp } = error.context || {};
        if (batchTimestamp !== undefined) {
            const key = `${batchTimestamp}-${originalImageIndex}-${originalPromptIndex}`;
            const modelText = (error as any).modelText;

            if (modelText) { // This is our new warning case
                setGenerationResults(prev => prev.map(r => r.key === key ? { 
                    ...r, 
                    status: 'warning', 
                    error: "The model didn't create an image. Try rephrasing your prompt to be more specific and descriptive.",
                    modelResponse: modelText 
                } : r));
            } else { // This is the existing hard error case
                const message = error instanceof Error ? error.message : "An unknown error occurred.";
                setGenerationResults(prev => prev.map(r => r.key === key ? { ...r, status: 'error', error: message } : r));
            }
        }
    }, []);

    const createGenerationTask = useCallback((imageIndex: number, promptIndex: number, prompts: string[], timestamp: number) => {
        return async (): Promise<GeneratedImage> => {
            const file = imageFiles[imageIndex].file;
            const prompt = prompts[promptIndex];
            const finalPrompt = [prependPrompt, prompt, appendPrompt].filter(Boolean).join(' ').trim();
            try {
                const imageBase64 = await fileToBase64(file);
                const imageUrl = await generateFigureImage(model, finalPrompt, imageBase64, file.type, { width, height, imageSizePreset, aspectRatio: aspectRatio || undefined });
                return { url: imageUrl, originalImageIndex: imageIndex, originalPromptIndex: promptIndex, prompt: finalPrompt, batchTimestamp: timestamp };
            } catch (error) {
                 const contextualError = error instanceof Error ? error : new Error("Unknown error during generation");
                 (contextualError as any).context = { originalImageIndex: imageIndex, originalPromptIndex: promptIndex, batchTimestamp: timestamp };
                 throw contextualError;
            }
        };
    }, [imageFiles, prependPrompt, appendPrompt, model, width, height, imageSizePreset, aspectRatio]);
    
    const runGenerations = useCallback(async (tasks: (() => Promise<GeneratedImage>)[]) => {
        if (tasks.length === 0) return;
        setIsLoading(true);
        await runConcurrentTasks(tasks, 10, handleSuccess, handleFail, (completed, total) => setProgress({ completed, total }));
        setIsLoading(false);
    }, [handleSuccess, handleFail]);

    const handleGenerate = useCallback(async () => {
        const prompts = getActivePrompts();
        if (jsonPrompts.trim() !== '' && jsonError) {
            setError(`JSON error: ${jsonError}`);
            return;
        }
        if (imageFiles.length === 0 || prompts.some(p => !p.trim())) {
            setError("Please upload images and fill all prompts.");
            return;
        }
        setError(null);
        const timestamp = Date.now();
        setBatchTimestamp(timestamp);
        const newResults: GenerationResult[] = imageFiles.flatMap((_, imgIdx) => prompts.map((_, prmptIdx) => ({
            key: `${timestamp}-${imgIdx}-${prmptIdx}`, status: 'pending', originalImageIndex: imgIdx, originalPromptIndex: prmptIdx, batchTimestamp: timestamp
        })));
        setGenerationResults(prev => [...newResults, ...prev]);
        const tasks = imageFiles.flatMap((_, imgIdx) => prompts.map((_, prmptIdx) => createGenerationTask(imgIdx, prmptIdx, prompts, timestamp)));
        await runGenerations(tasks);
    }, [imageFiles, getActivePrompts, jsonPrompts, jsonError, createGenerationTask, runGenerations]);

    const handleRetryAll = useCallback(async () => {
        if (isLoading) return;
        const failed = generationResults.filter(r => r.status === 'error' || r.status === 'warning');
        if (failed.length === 0) return;
        setGenerationResults(prev => prev.map(r => (r.status === 'error' || r.status === 'warning') ? { ...r, status: 'pending', error: undefined, modelResponse: undefined } : r));
        const prompts = getActivePrompts();
        const tasks = failed.map(r => createGenerationTask(r.originalImageIndex, r.originalPromptIndex, prompts, r.batchTimestamp));
        await runGenerations(tasks);
    }, [isLoading, generationResults, getActivePrompts, createGenerationTask, runGenerations]);
    
    const handleRetryOne = useCallback(async (key: string) => {
        if (isLoading) return;
        const toRetry = generationResults.find(r => r.key === key);
        if (!toRetry) return;
        setGenerationResults(prev => prev.map(r => r.key === key ? { ...r, status: 'pending', error: undefined, modelResponse: undefined } : r));
        const prompts = getActivePrompts();
        const task = createGenerationTask(toRetry.originalImageIndex, toRetry.originalPromptIndex, prompts, toRetry.batchTimestamp);
        await runGenerations([task]);
    }, [isLoading, generationResults, getActivePrompts, createGenerationTask, runGenerations]);

    const isGenerateDisabled = imageFiles.length === 0 || isLoading || (jsonPrompts.trim() === '' && promptContents.slice(0, numberOfVersions).some(p => p.trim() === '')) || (jsonPrompts.trim() !== '' && !!jsonError);

    return {
        numberOfVersions, setNumberOfVersions, promptContents, setPromptContents, imageFiles, setImageFiles, generationResults, setGenerationResults, isLoading, setIsLoading,
        error, setError, selectedImageIndex, setSelectedImageIndex, includeOriginals, setIncludeOriginals, batchTimestamp, setBatchTimestamp,
        progress, setProgress, translatingIndices, setTranslatingIndices, generatingVariationIndices, setGeneratingVariationIndices, enhancingIndices, setEnhancingIndices, showUploadConfirm, setShowUploadConfirm,
        pendingFiles, setPendingFiles, setId, setSetId, showCropChoiceModal, setShowCropChoiceModal, filesAwaitingCropChoice, setFilesAwaitingCropChoice, croppingFiles, setCroppingFiles,
        isAdvancedOpen, setIsAdvancedOpen, model, setModel, imageSizePreset, setImageSizePreset, customWidth, setCustomWidth, customHeight, setCustomHeight, prependPrompt, setPrependPrompt,
        appendPrompt, setAppendPrompt, jsonPrompts, setJsonPrompts, jsonError, setJsonError, filenameTemplate, setFilenameTemplate, promptGenerationInstructions, setPromptGenerationInstructions,
        isGeneratingPrompts, setIsGeneratingPrompts, isTranslatingInstructions, setIsTranslatingInstructions, imageSizePresets, successfulImageUrls, handleImageClick, handleNextImage,
        handlePrevImage, imagePreviewUrls, handleNumberOfVersionsChange, handlePromptContentChange, handleJsonPromptChange, getActivePrompts, handleEnhanceAndTranslatePrompt,
        handleGenerateVariation, handleEnhancePrompt, handleTranslateInstructions, handleGeneratePromptList, handleClearGallery, handleRemoveGeneratedImage, handleNewImageUpload, handleStartCropping,
        handleUseOriginals, handleCancelCropChoice, handleCropConfirm, handleCropCancel, handleRemoveUploadedImage, handleDownloadAll, handleConfirmClearAndUpload,
        handleDownloadAndConfirm, handleCancelUpload, handleSuccess, handleFail, createGenerationTask, runGenerations, handleGenerate, handleRetryAll, handleRetryOne, isGenerateDisabled,
        aspectRatio, setAspectRatio
    };
};