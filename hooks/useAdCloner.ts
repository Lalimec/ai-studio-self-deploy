import React, { useState, useCallback } from 'react';
import { AdImageState, AdSubjectImageState, AdClonerSettings, AdClonerGenerationResult, Toast, AdClonerVariation, VariationState } from '../types';
import { researchAdContext, generateAdPrompts, generateAdVariationImage, refineAdImage, getNewAdVariations, enhanceAdInstructions } from '../services/adClonerService';
import { dataUrlToBlob } from '../services/geminiClient';
import { enhancePrompt, generatePromptVariation, translateToEnglish } from '../services/geminiService';
import { generateSetId, getTimestamp, sanitizeFilename } from '../services/imageUtils';
import { processWithConcurrency } from '../services/apiUtils';
import { ActiveCropper } from '../App';
import { logUserAction } from '../services/loggingService';

declare const JSZip: any;

const initialAdState: AdImageState = { file: null, originalSrc: null, croppedSrc: null };

type AdClonerHookProps = {
    addToast: (message: string, type: Toast['type']) => void;
    setConfirmAction: (action: any) => void;
    setDownloadProgress: React.Dispatch<React.SetStateAction<{ visible: boolean; message: string; progress: number }>>;
    withMultiDownloadWarning: (action: () => void) => void;
    useNanoBananaWebhook: boolean;
};

export const useAdCloner = ({ addToast, setConfirmAction, withMultiDownloadWarning, setDownloadProgress, useNanoBananaWebhook }: AdClonerHookProps) => {
    const [adImage, setAdImage] = useState<AdImageState>(initialAdState);
    const [subjectImages, setSubjectImages] = useState<AdSubjectImageState[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    
    const [researchContext, setResearchContext] = useState('');
    const [includeResearch, setIncludeResearch] = useState(true);
    const [isResearching, setIsResearching] = useState(false);

    const [userInstructions, setUserInstructions] = useState('');
    const [isEnhancingInstructions, setIsEnhancingInstructions] = useState(false);
    const [isTranslatingInstructions, setIsTranslatingInstructions] = useState(false);
    const [numVariations, setNumVariations] = useState(3);
    const [aspectRatio, setAspectRatio] = useState<string | null>('1:1');

    const [generationResult, setGenerationResult] = useState<AdClonerGenerationResult | null>(null);
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    
    // FIX: Changed state key from number to string to fix TypeScript's type inference with Object.values/entries
    const [variationStates, setVariationStates] = useState<Record<string, VariationState>>({});
    const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);

    const [settings, setSettings] = useState<AdClonerSettings>({
        textModel: 'gemini-2.5-flash',
        imageModel: 'gemini-2.5-flash-image',
    });
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    
    // FIX: `s` is now correctly inferred as `VariationState`, fixing the error on `s.isLoading`.
    const isBusy = isGeneratingPrompts || isResearching || isGeneratingAllImages || isEnhancingInstructions || isTranslatingInstructions || Object.values(variationStates).some(s => (s as VariationState).isLoading);

    const onCropConfirm = (croppedSrc: string, cropper: NonNullable<ActiveCropper>) => {
        if (cropper.type === 'adCloner-ad') {
            setAdImage(prev => ({ ...prev, croppedSrc }));
            if (!sessionId) {
                setSessionId(generateSetId());
            }
        } else if (cropper.type === 'adCloner-subject' && cropper.id) {
            setSubjectImages(prev => prev.map(img => img.id === cropper.id ? { ...img, croppedSrc } : img));
        } else if (cropper.type === 'adCloner-refine' && cropper.id) {
            const index = parseInt(cropper.id, 10);
            // FIX: Use string key `cropper.id` to access variationStates.
            setVariationState(index, { refineImage: { ...variationStates[cropper.id]?.refineImage, src: croppedSrc }});
        }
    };
    
    const onCropCancel = (cropper: NonNullable<ActiveCropper>) => {
        if (cropper.type === 'adCloner-subject' && cropper.id) {
            // If a subject was added but cropping was cancelled, remove it.
            setSubjectImages(prev => prev.filter(img => img.id !== cropper.id || img.croppedSrc !== null));
        }
        // No action needed for ad image or refine image on cancel, they just don't get updated.
    };
    
    const onSubjectUpload = (file: File, originalSrc: string, id: string) => {
        if (subjectImages.length >= 6) {
            addToast("You can upload a maximum of 6 subject images.", "info");
            return;
        }
        setSubjectImages(prev => [...prev, { id, file, originalSrc, croppedSrc: null }]);
    };
    
    const onRefineImageUpload = (file: File, src: string, variationIndex: string) => {
        const index = parseInt(variationIndex, 10);
        setVariationState(index, { refineImage: { file, src: null } });
    };

    const handleRemoveSubjectImage = (id: string) => {
        setSubjectImages(prev => prev.filter(img => img.id !== id));
    };

    const handleResearchAd = async () => {
        if (!adImage.croppedSrc || isResearching) return;
        setIsResearching(true);
        addToast("Researching ad context...", "info");
        try {
            const adImageBlob = dataUrlToBlob(adImage.croppedSrc);
            const context = await researchAdContext(adImageBlob);
            setResearchContext(context);
            addToast("Ad research complete!", "success");
        } catch (e) {
            addToast(e instanceof Error ? e.message : 'Failed to research ad.', 'error');
        } finally {
            setIsResearching(false);
        }
    };

    const performGeneratePrompts = async () => {
        if (!adImage.croppedSrc || !adImage.file) return;
        logUserAction('PREPARE_ADCLONER_PROMPTS', { numVariations, instructions: userInstructions, includeResearch, sessionId });
        setIsGeneratingPrompts(true);
        setGenerationResult(null); // Clear previous results
        setVariationStates({});
        addToast("Generating ad concepts...", "info");
        try {
            const result = await generateAdPrompts({
                adImage,
                subjectImages,
                researchContext: includeResearch ? researchContext : '',
                userInstructions,
                numVariations,
                textModel: settings.textModel
            });
            setGenerationResult(result);
        } catch (e) {
             addToast(e instanceof Error ? e.message : 'Failed to generate prompts.', 'error');
        } finally {
            setIsGeneratingPrompts(false);
        }
    }

    const handleGeneratePrompts = async () => {
        if (generationResult) {
            setConfirmAction({
                title: "Start New Session?",
                message: "This will clear your current ad concepts and generate a new set. Are you sure?",
                confirmText: "Generate New Set",
                onConfirm: performGeneratePrompts
            });
        } else {
            performGeneratePrompts();
        }
    };

    const setVariationState = (index: number, newState: Partial<VariationState> | ((prevState: VariationState) => Partial<VariationState>)) => {
        setVariationStates(prev => {
            // FIX: Use string key for state object
            const indexStr = String(index);
            const existingState: VariationState = prev[indexStr] || {
                isLoading: false,
                imageHistory: [],
                activeImageIndex: -1,
                refineText: '',
                refineImage: { file: null, src: null },
                isEnhancingRefine: false,
                isGeneratingRefineVariation: false,
                isTranslatingRefine: false,
            };
            const update = typeof newState === 'function' ? newState(existingState) : newState;
            return {
                ...prev,
                // FIX: Use string key to set state
                [indexStr]: {
                    ...existingState,
                    ...update,
                },
            };
        });
    };
    
    const handleGenerateAdImage = async (index: number, isBatch: boolean = false) => {
        if (!generationResult || !adImage.file) return;
        logUserAction('GENERATE_ADCLONER_IMAGE', { variationIndex: index, isBatch, sessionId });
        setVariationState(index, { isLoading: true });
        if (!isBatch) addToast(`Generating image for Variation ${index + 1}...`, 'info');
        try {
            const imageSources: { base64: string; mimeType: string; }[] = [];
            if(adImage.croppedSrc) {
                imageSources.push(dataUrlToBlob(adImage.croppedSrc));
            }
            subjectImages.forEach(img => {
                if(img.croppedSrc) {
                    imageSources.push(dataUrlToBlob(img.croppedSrc));
                }
            });
            const imageUrl = await generateAdVariationImage({
                imageSources,
                instructionalPrompt: generationResult.variations[index].prompt,
                imageModel: settings.imageModel,
                aspectRatio,
                useNanoBananaWebhook,
            });
            setVariationState(index, (currentState) => {
                const newHistory = [...currentState.imageHistory, imageUrl];
                return {
                    isLoading: false,
                    imageHistory: newHistory,
                    activeImageIndex: newHistory.length - 1,
                };
            });
            if (!isBatch) addToast(`Image for Variation ${index + 1} generated!`, "success");
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Failed to generate image.';
            if (!isBatch) {
                addToast(errorMessage, 'error');
            } else {
                console.error(`Batch generation failed for Variation ${index + 1}: ${errorMessage}`);
            }
            setVariationState(index, { isLoading: false });
        }
    };
    
    const handleGenerateAllImages = async () => {
        if (!generationResult || isBusy) return;
        const indicesToGenerate = generationResult.variations
            .map((_, index) => index)
            .filter(index => !variationStates[index] || variationStates[index].imageHistory.length === 0);

        if (indicesToGenerate.length === 0) {
            addToast("All variations already have generated images.", "info");
            return;
        }

        logUserAction('GENERATE_ADCLONER_ALL_IMAGES', { count: indicesToGenerate.length, sessionId });
        setIsGeneratingAllImages(true);
        addToast(`Generating ${indicesToGenerate.length} images... This may take a moment.`, "info");

        const processSingle = async (index: number) => {
            await handleGenerateAdImage(index, true);
        };
        
        await processWithConcurrency(indicesToGenerate, processSingle, 4);

        setIsGeneratingAllImages(false);
        addToast("Batch image generation complete.", "success");
    };

    const handleRefineImage = async (index: number) => {
        // FIX: Use string key to access state
        const state = variationStates[String(index)];
        if (!state || state.isLoading || state.activeImageIndex === -1) return;
        logUserAction('REFINE_ADCLONER_IMAGE', { variationIndex: index, refineText: state.refineText, hasRefineImage: !!state.refineImage.src, sessionId });

        const currentImageSrc = state.imageHistory[state.activeImageIndex];
        
        setVariationState(index, { isLoading: true });
        addToast(`Applying edits to Variation ${index + 1}...`, 'info');
        try {
            const imageSources: { base64: string; mimeType: string; }[] = [dataUrlToBlob(currentImageSrc)];
            if (state.refineImage.src) {
                imageSources.push(dataUrlToBlob(state.refineImage.src));
            }
            const imageUrl = await refineAdImage({
                imageSources,
                refineText: state.refineText,
                aspectRatio,
                useNanoBananaWebhook,
            });
            
            setVariationState(index, (currentState) => {
                const newHistory = [...currentState.imageHistory, imageUrl];
                return {
                    isLoading: false,
                    imageHistory: newHistory,
                    activeImageIndex: newHistory.length - 1,
                    refineText: '',
                    refineImage: { file: null, src: null },
                };
            });
            addToast(`Image for Variation ${index + 1} refined!`, "success");
        } catch (e) {
            addToast(e instanceof Error ? e.message : 'Failed to refine image.', 'error');
            setVariationState(index, { isLoading: false });
        }
    };

    const setActiveImage = (index: number, imageIndex: number) => {
        setVariationState(index, { activeImageIndex: imageIndex });
    };

    const handleRemoveImageFromHistory = (variationIndex: number, imageIndex: number) => {
        setVariationState(variationIndex, (currentState) => {
            const newHistory = currentState.imageHistory.filter((_, i) => i !== imageIndex);
            let newActiveIndex = currentState.activeImageIndex;

            if (imageIndex === currentState.activeImageIndex) {
                // If the active image was deleted, move to the previous one, or -1 if it was the only one
                newActiveIndex = Math.max(-1, newHistory.length - 1);
            } else if (imageIndex < currentState.activeImageIndex) {
                // If an image before the active one was deleted, shift the active index down
                newActiveIndex--;
            }
            
            return {
                imageHistory: newHistory,
                activeImageIndex: newActiveIndex,
            };
        });
    };

    const handleGenerateMoreVariations = async () => {
        if (isGeneratingPrompts || !generationResult) return;
        logUserAction('PREPARE_ADCLONER_MORE_PROMPTS', { numVariations, instructions: userInstructions, includeResearch, sessionId });
        setIsGeneratingPrompts(true);
        addToast(`Generating ${numVariations} more variations...`, "info");
        try {
            const newVariations = await getNewAdVariations({
                existingResult: generationResult,
                researchContext: includeResearch ? researchContext : '',
                userInstructions,
                numVariations,
                textModel: settings.textModel
            });

            if (newVariations.length > 0) {
                setGenerationResult(prev => prev ? ({
                    ...prev,
                    variations: [...prev.variations, ...newVariations]
                }) : prev);
                 addToast(`${newVariations.length} new variation(s) added!`, "success");
            } else {
                addToast("The AI couldn't generate new variations from that instruction.", "info");
            }
        } catch(e) {
            addToast(e instanceof Error ? e.message : 'Failed to get more variations.', 'error');
        } finally {
            setIsGeneratingPrompts(false);
        }
    };
    
    const handleStartOver = () => {
        setConfirmAction({
            title: "Clear Session?",
            message: "This will clear all uploaded images, research, and generated results. This action cannot be undone.",
            onConfirm: () => {
                setAdImage(initialAdState);
                setSubjectImages([]);
                setResearchContext('');
                setUserInstructions('');
                setNumVariations(3);
                setGenerationResult(null);
                setVariationStates({});
                setSessionId(null);
            }
        });
    };

    const getDownloadFilename = useCallback((variationIndex: number, imageIndex: number, variationTitle: string): string => {
        const timestamp = getTimestamp();
        const cleanTitle = sanitizeFilename(variationTitle.split('||')[0].trim()).substring(0, 50);
        return `${sessionId}_${cleanTitle}_var${variationIndex + 1}_gen${imageIndex + 1}_${timestamp}.jpg`;
    }, [sessionId]);

    const handleDownloadAll = () => {
        withMultiDownloadWarning(async () => {
            if (!generationResult || !sessionId) {
                addToast("No results to download.", "info");
                return;
            }
            setDownloadProgress({ visible: true, message: 'Starting download...', progress: 0 });

            try {
                const zip = new JSZip();
                const adFolder = zip.folder(`ad_cloner_session_${sessionId}`);
                
                const timestamp = getTimestamp();
                const baseTitle = generationResult.base_prompt.title 
                    ? sanitizeFilename(generationResult.base_prompt.title.split('||')[0].trim()).substring(0, 50) 
                    : 'ad';

                if (adImage.croppedSrc) {
                    adFolder.file(`${sessionId}_original_ad_${baseTitle}_${timestamp}.jpg`, adImage.croppedSrc.split(',')[1], { base64: true });
                }
                subjectImages.forEach((img, i) => {
                    if (img.croppedSrc) {
                        adFolder.file(`subject_${i + 1}.jpg`, img.croppedSrc.split(',')[1], { base64: true });
                    }
                });
                adFolder.file(`${sessionId}_generation_results_${baseTitle}_${timestamp}.json`, JSON.stringify(generationResult, null, 2));

                // FIX: Use a type guard to ensure correct typing of `state` from `Object.entries`.
                const variationsWithImages = Object.entries(variationStates).filter((entry): entry is [string, VariationState] => (entry[1] as VariationState)?.activeImageIndex > -1);
                let processed = 0;

                for (const [indexStr, state] of variationsWithImages) {
                    const index = parseInt(indexStr, 10);
                    const variation = generationResult.variations[index];
                    const activeImageSrc = state.imageHistory[state.activeImageIndex];
                    const filename = getDownloadFilename(index, state.activeImageIndex, variation.title);
                    
                    const response = await fetch(activeImageSrc);
                    const blob = await response.blob();
                    adFolder.file(filename, blob);

                    const info = {
                        variation_title: variation.title,
                        variation_details: variation.details,
                        instructional_prompt: variation.prompt,
                        refinement_history: state.imageHistory.length > 1 ? "Multiple refinements were made." : "Initial generation."
                    };
                    adFolder.file(filename.replace(/\.[^/.]+$/, ".txt"), JSON.stringify(info, null, 2));
                    
                    processed++;
                    setDownloadProgress({ 
                        visible: true, 
                        message: `Zipping variation ${index + 1}...`,
                        progress: (processed / variationsWithImages.length) * 100
                    });
                }

                if (variationsWithImages.length === 0) {
                     addToast("No generated images to download.", "info");
                     setDownloadProgress({ visible: false, message: '', progress: 0 });
                     return;
                }

                setDownloadProgress({ visible: true, message: 'Compressing...', progress: 99 });
                const content = await zip.generateAsync({ type: "blob" });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `AI_Studio_AdCloner_${sessionId}_${getTimestamp()}.zip`;
                link.click();
                URL.revokeObjectURL(link.href);

                setDownloadProgress({ visible: false, message: '', progress: 0 });

            } catch (err) {
                addToast("Error creating ZIP file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    };
    
    const handleDownloadSingleVariation = (index: number) => {
        withMultiDownloadWarning(async () => {
            // FIX: Add type assertion to ensure `state` is correctly typed, preventing property access errors.
            const state = variationStates[String(index)] as VariationState | undefined;
            const variation = generationResult?.variations[index];
            if (!state || !variation || state.imageHistory.length === 0) {
                addToast("No images to download for this variation.", "error");
                return;
            }
            
            setDownloadProgress({ visible: true, message: `Zipping variation ${index + 1}...`, progress: 0 });

            try {
                const zip = new JSZip();
                for (let i = 0; i < state.imageHistory.length; i++) {
                    const imgSrc = state.imageHistory[i];
                    const filename = getDownloadFilename(index, i, variation.title);
                    const response = await fetch(imgSrc);
                    const blob = await response.blob();
                    zip.file(filename, blob);
                    setDownloadProgress({ visible: true, message: `Adding image ${i+1} of ${state.imageHistory.length}...`, progress: (i / state.imageHistory.length) * 80 });
                }

                const info = {
                    variation_title: variation.title,
                    variation_details: variation.details,
                    instructional_prompt: variation.prompt,
                };
                const zipFilename = getDownloadFilename(index, 0, variation.title).replace(/_gen\d+.*\.jpg$/, '.zip');
                zip.file(zipFilename.replace('.zip', '.txt'), JSON.stringify(info, null, 2));
                setDownloadProgress({ visible: true, message: `Compressing...`, progress: 90 });

                const content = await zip.generateAsync({ type: "blob" });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = zipFilename;
                link.click();
                URL.revokeObjectURL(link.href);
                
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            } catch (err) {
                addToast("Error creating single variation ZIP file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    };

    const handleRemoveVariation = (indexToRemove: number) => {
        setConfirmAction({
            title: `Remove Variation ${indexToRemove + 1}?`,
            message: "This will remove this variation and all its generated images. This action cannot be undone.",
            onConfirm: () => {
                setGenerationResult(prev => {
                    if (!prev) return null;
                    const newVariations = prev.variations.filter((_, i) => i !== indexToRemove);
                    return { ...prev, variations: newVariations };
                });
    
                setVariationStates(prev => {
                    // FIX: Type of newStates should be Record<string, VariationState>
                    const newStates: Record<string, VariationState> = {};
                    Object.keys(prev).forEach(key => {
                        const i = parseInt(key, 10);
                        if (i < indexToRemove) {
                            // FIX: Use `prev[key]` instead of `prev[i]` to correctly access properties of a string-keyed object.
                            newStates[key] = prev[key];
                        } else if (i > indexToRemove) {
                            // FIX: Use `prev[key]` instead of `prev[i]` to correctly access properties of a string-keyed object.
                            newStates[String(i - 1)] = prev[key];
                        }
                    });
                    return newStates;
                });
            }
        });
    };

    const handleEnhanceRefinePrompt = async (index: number) => {
        // FIX: Use string key to access state
        const textToEnhance = variationStates[String(index)]?.refineText;
        if (!textToEnhance?.trim()) return;
        setVariationState(index, { isEnhancingRefine: true });
        try {
            const enhancedText = await enhancePrompt(textToEnhance);
            setVariationState(index, { refineText: enhancedText, isEnhancingRefine: false });
            addToast("Refinement prompt enhanced!", "success");
        } catch (e) {
            addToast(`Enhancement failed: ${e instanceof Error ? e.message : "Unknown error"}`, 'error');
            setVariationState(index, { isEnhancingRefine: false });
        }
    };

    const handleGenerateRefineVariation = async (index: number) => {
        // FIX: Use string key to access state
        const textToVary = variationStates[String(index)]?.refineText;
        if (!textToVary?.trim()) return;
        setVariationState(index, { isGeneratingRefineVariation: true });
        try {
            const variedText = await generatePromptVariation(textToVary);
            setVariationState(index, { refineText: variedText, isGeneratingRefineVariation: false });
             addToast("Refinement prompt variation generated!", "success");
        } catch (e) {
            addToast(`Variation failed: ${e instanceof Error ? e.message : "Unknown error"}`, 'error');
            setVariationState(index, { isGeneratingRefineVariation: false });
        }
    };
    
    const handleTranslateRefinePrompt = async (index: number) => {
        // FIX: Use string key to access state
        const textToTranslate = variationStates[String(index)]?.refineText;
        if (!textToTranslate?.trim()) return;
        setVariationState(index, { isTranslatingRefine: true });
        try {
            const translatedText = await translateToEnglish(textToTranslate);
            setVariationState(index, { refineText: translatedText, isTranslatingRefine: false });
            addToast("Refinement prompt translated!", "success");
        } catch (e) {
            addToast(`Translation failed: ${e instanceof Error ? e.message : "Unknown error"}`, 'error');
            setVariationState(index, { isTranslatingRefine: false });
        }
    };

    const handleEnhanceInstructions = async () => {
        if (!userInstructions.trim()) return;
        setIsEnhancingInstructions(true);
        try {
            const enhanced = await enhanceAdInstructions(userInstructions);
            setUserInstructions(enhanced);
            addToast("Instructions enhanced!", "success");
        } catch (e) {
            addToast(`Enhancement failed: ${e instanceof Error ? e.message : "Unknown error"}`, 'error');
        } finally {
            setIsEnhancingInstructions(false);
        }
    };

    const handleTranslateInstructions = async () => {
        if (!userInstructions.trim()) return;
        setIsTranslatingInstructions(true);
        try {
            const translated = await translateToEnglish(userInstructions);
            setUserInstructions(translated);
            addToast("Instructions translated!", "success");
        } catch (e) {
            addToast(`Translation failed: ${e instanceof Error ? e.message : "Unknown error"}`, 'error');
        } finally {
            setIsTranslatingInstructions(false);
        }
    };

    return {
        adImage, setAdImage,
        subjectImages, setSubjectImages,
        sessionId,
        onSubjectUpload,
        onRefineImageUpload,
        handleRemoveSubjectImage,
        onCropConfirm,
        onCropCancel,
        researchContext, setResearchContext,
        includeResearch, setIncludeResearch,
        isResearching,
        handleResearchAd,
        userInstructions, setUserInstructions,
        isEnhancingInstructions,
        isTranslatingInstructions,
        handleEnhanceInstructions,
        handleTranslateInstructions,
        numVariations, setNumVariations,
        aspectRatio, setAspectRatio,
        isGeneratingPrompts,
        isGeneratingAllImages,
        handleGeneratePrompts,
        handleGenerateAllImages,
        generationResult,
        handleStartOver,
        variationStates, setVariationStates,
        setVariationState,
        handleGenerateAdImage,
        handleRefineImage,
        setActiveImage,
        handleRemoveImageFromHistory,
        handleGenerateMoreVariations,
        handleDownloadAll,
        handleDownloadSingleVariation,
        handleRemoveVariation,
        handleEnhanceRefinePrompt,
        handleGenerateRefineVariation,
        handleTranslateRefinePrompt,
        settings, setSettings,
        settingsModalOpen, setSettingsModalOpen,
        isBusy,
    };
};