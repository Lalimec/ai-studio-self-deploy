import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
    VideoAnalysis, AdIdea, Toast, AnalysisModel, ImageModel, 
    AspectRatio, JsonParseError, 
    VideoAnalyzerSettings,
    StoryboardScene
} from '../types';
import { 
    analyzeVideo, generateAnalysis, generateAdConcept, generateImage, 
    fileToGenerativePart, parseTimestamp, fixMalformedJson, 
    parseAnalysisResponse,
    formatTimeWithMS
} from '../services/videoAnalyzerService';
import { imageModels, analysisModels } from '../constants';
import { logUserAction } from '../services/loggingService';
import { mockVideoAnalysisData, mockExtractedFrames } from '../components/videoAnalyzer/mockData';

declare const JSZip: any;

type VideoAnalyzerHookProps = {
    addToast: (message: string, type: Toast['type']) => void;
    setConfirmAction: (action: any) => void;
    setDownloadProgress: (progress: { visible: boolean; message: string; progress: number }) => void;
    withMultiDownloadWarning: (action: () => void) => void;
    useNanoBananaWebhook?: boolean;
};

const constructReplicationPrompt = (analysis: VideoAnalysis): string => {
    let prompt = "Generate an exact replica of the following video ad. The visual style, content, and pacing must be identical.\n\n";
    prompt += "--- OVERALL STYLE ---\n";
    prompt += analysis.overall_video_style_prompt + "\n\n";
    prompt += "--- STRATEGIC ANALYSIS & CONTENT ---\n";
    prompt += analysis.analysis + "\n\n"; // The analysis markdown itself is a good summary
    prompt += "--- SCENE-BY-SCENE STORYBOARD ---\n";
    analysis.storyboard.forEach((scene, index) => {
        prompt += `Scene ${index + 1} at ${scene.timestamp}:\n`;
        prompt += `- Description: ${scene.description}\n`;
        prompt += `- Visuals: ${scene.visuals}\n`;
        prompt += `- Key Assets: ${scene.assets}\n\n`;
    });
    return prompt;
};

// Helper function to add a label to an image using canvas
const addLabelToImage = (file: File, label: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));

                // Draw the original image
                ctx.drawImage(img, 0, 0);

                // Prepare text styling
                const fontSize = Math.max(24, Math.min(img.width / 15, 60));
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Draw a semi-transparent background for the text for better readability
                const textMetrics = ctx.measureText(label);
                const padding = fontSize * 0.5;
                const rectHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent + padding;
                const rectWidth = textMetrics.width + padding * 2;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect((canvas.width - rectWidth) / 2, (canvas.height - rectHeight) / 2, rectWidth, rectHeight);

                // Draw the text
                ctx.fillStyle = 'white';
                ctx.fillText(label, canvas.width / 2, canvas.height / 2);

                // Convert canvas to blob and then to file
                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], `labeled_${file.name}`, { type: blob.type });
                        resolve(newFile);
                    } else {
                        reject(new Error('Canvas toBlob failed'));
                    }
                }, file.type);
            };
            img.onerror = reject;
            img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const useVideoAnalyzerStudio = ({ addToast, setConfirmAction, setDownloadProgress, withMultiDownloadWarning, useNanoBananaWebhook = true }: VideoAnalyzerHookProps) => {
    // --- State Declarations ---
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [subjectImages, setSubjectImages] = useState<File[]>([]);
    const [sceneSubjectImages, setSceneSubjectImages] = useState<File[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);


    type AppState = 'idle' | 'analyzing' | 'analyzed' | 'generating';
    const [appState, setAppState] = useState<AppState>('idle');
    
    const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
    const [replicationPrompt, setReplicationPrompt] = useState<string | null>(null);
    const [processedVideo, setProcessedVideo] = useState<{ uri: string; mimeType: string; } | null>(null);
    const [extractedFrames, setExtractedFrames] = useState<(string | null)[]>([]);
    const [isExtractingFrames, setIsExtractingFrames] = useState(false);
    const [loadingFrames, setLoadingFrames] = useState<Set<number>>(new Set());
    const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
    const [analysisParseError, setAnalysisParseError] = useState<string | null>(null);
    const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

    const [generatedAds, setGeneratedAds] = useState<AdIdea[]>([]);
    const [generatingApproach, setGeneratingApproach] = useState<string | null>(null);
    const [generatingScene, setGeneratingScene] = useState<number | 'all' | null>(null);

    const [settings, setSettings] = useState<VideoAnalyzerSettings>({
        analysisModel: analysisModels[0].id,
        imageModel: imageModels[0].id,
        aspectRatio: '3:4' as AspectRatio,
        sceneImageModel: 'gemini-2.5-flash-image' as ImageModel,
        sceneAspectRatio: 'auto' as AspectRatio,
        additionalInstructions: '',
        nanoBananaPrompt: `You are an expert image editor. Your task is to seamlessly integrate the subject from the 'subject image' into the 'original frame image'.

1.  **Identify the Subject:** The primary subject to be inserted is in the 'subject image'.
2.  **Identify the Scene:** The background, environment, and style are defined by the 'original frame image' and the 'Original Prompt'.
3.  **Integrate:** Replace the original subject in the 'original frame image' with the new subject. The new subject must match the scene's lighting, shadows, color grading, perspective, and overall art style. Do not change the background or any other elements.
4.  **Follow Prompt:** Use the 'Original Prompt' as the primary guide for the final composition's details, mood, and action.`,
        sceneInstructions: '',
    });
    
    const [sceneInstructions, setSceneInstructions] = useState<Record<number, string>>({});
    const [error, setError] = useState<string | null>(null);
    
    const isCoreAnalysisBusy = appState === 'analyzing' || isExtractingFrames || loadingFrames.size > 0;
    const isConceptGenerationBusy = generatingApproach !== null || generatedAds.some(ad => !ad.generatedImages || ad.generatedImages.length === 0);
    const isSceneGenerationBusy = generatingScene !== null;

    useEffect(() => {
        if (videoFile && !sessionId) {
            setSessionId(`session-${Date.now().toString(36)}`);
        } else if (!videoFile) {
            setSessionId(null);
        }
    }, [videoFile, sessionId]);

    // --- Handlers ---
    const resetState = () => {
        setVideoAnalysis(null);
        setReplicationPrompt(null);
        setProcessedVideo(null);
        setExtractedFrames([]);
        setGeneratedAds([]);
        setError(null);
        setAnalysisLogs([]);
        setAnalysisParseError(null);
        setGeneratingApproach(null);
        setGeneratingScene(null);
        setVideoAspectRatio(null);
    };

    const handleVideoChange = (files: File[]) => {
        const file = files[0];
        if (!file) {
            return;
        }
    
        if (file.size > 100 * 1024 * 1024) { // 100MB size limit
            addToast("Video file is too large (max 100MB). Please choose a smaller file.", "error");
            return;
        }
    
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
    
        videoElement.onloadedmetadata = () => {
            window.URL.revokeObjectURL(videoElement.src);
            const duration = videoElement.duration;
            const MAX_DURATION_SECONDS = 300; // 5 minutes
    
            if (duration > MAX_DURATION_SECONDS) {
                addToast(
                    `Video is too long (max 5 minutes). Your video is ${Math.round(duration / 60)} minutes.`,
                    "error"
                );
                return;
            }
            
            // Duration is acceptable, proceed to set state
            setVideoFile(file);
            resetState();
            logUserAction('UPLOAD_VIDEO_ANALYZER', { filename: file.name, size: file.size, duration: duration });
        };
    
        videoElement.onerror = () => {
            window.URL.revokeObjectURL(videoElement.src);
            addToast("Could not read video metadata. The file might be corrupted or in an unsupported format.", "error");
        };
    
        videoElement.src = URL.createObjectURL(file);
    };

    const handleAnalyze = async () => {
        if (!videoFile) return;

        setAppState('analyzing');
        setError(null);
        setVideoAnalysis(null);
        setAnalysisParseError(null);
        setAnalysisLogs(['Starting analysis...']);

        try {
            const { analysis, processedFile: newProcessedFile } = await analyzeVideo(
                videoFile,
                settings.analysisModel,
                (msg) => setAnalysisLogs(prev => [...prev, msg])
            );
            setVideoAnalysis(analysis);
            setProcessedVideo(newProcessedFile);
            setReplicationPrompt(constructReplicationPrompt(analysis));
            setAppState('analyzed');
            addToast("Video analysis complete!", "success");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            if (err instanceof JsonParseError) {
                setError(`Analysis failed: ${errorMessage}`);
                setAnalysisParseError(err.rawResponse);
            } else {
                setError(`Analysis failed: ${errorMessage}`);
            }
            setAppState('idle');
        }
    };
    
    const handleRetryAnalysis = async () => {
        if (!analysisParseError) {
            addToast('No analysis response to retry.', 'info');
            return;
        }

        setError(null);
        setVideoAnalysis(null);
        setAppState('analyzing');
        setAnalysisLogs(['Attempting to fix malformed JSON response...']);

        try {
            // Step 1: Try to fix the JSON
            const fixedJsonString = await fixMalformedJson(analysisParseError);
            setAnalysisLogs(prev => [...prev, 'AI response fixed. Parsing corrected JSON...']);
            
            // Step 2: Try to parse the fixed JSON
            const analysisResult = parseAnalysisResponse(fixedJsonString);
            
            // Success!
            setVideoAnalysis(analysisResult);
            setReplicationPrompt(constructReplicationPrompt(analysisResult));
            setAppState('analyzed');
            setAnalysisParseError(null); // Clear the error
            addToast("Successfully fixed and parsed the AI response!", "success");

        } catch (fixError) {
            // Step 3: If fixing fails, fall back to the original full re-analysis
            addToast("Failed to automatically fix the JSON. Retrying full analysis...", "info");
            setAnalysisLogs(prev => [...prev, 'Automatic fix failed. Retrying full analysis from video file...']);
            
            if (!processedVideo) {
                setError('Cannot retry full analysis: Processed video data is missing.');
                setAppState('idle');
                return;
            }

            try {
                const result = await generateAnalysis(
                    processedVideo,
                    settings.analysisModel,
                    (msg) => setAnalysisLogs(prev => [...prev, msg])
                );
                setVideoAnalysis(result);
                setReplicationPrompt(constructReplicationPrompt(result));
                setAppState('analyzed');
                setAnalysisParseError(null); // Clear the error on success
            } catch (retryError) {
                const errorMessage = retryError instanceof Error ? retryError.message : "An unknown error occurred.";
                 if (retryError instanceof JsonParseError) {
                    setError(`Full re-analysis also failed to produce valid JSON: ${errorMessage}`);
                    setAnalysisParseError(retryError.rawResponse); // Update with the new malformed response
                } else {
                    setError(`Full re-analysis failed: ${errorMessage}`);
                }
                setAppState('idle');
            }
        }
    };

    const handleGenerateConcept = async (selectedApproach?: string) => {
        if (!videoAnalysis) {
            addToast("Analysis must be complete before generating concepts.", 'error');
            return;
        }
    
        const loadingState = selectedApproach || '__GENERATE_MORE__';
        setGeneratingApproach(loadingState);
        addToast(selectedApproach ? `Generating concept for: ${selectedApproach}` : 'Generating a new distinct concept...', 'info');
        setError(null);
        logUserAction('GENERATE_AD_CONCEPT', { approach: selectedApproach || 'new_concept' });
    
        try {
            const newIdeas = await generateAdConcept(
                videoAnalysis, 
                subjectImages, 
                settings, 
                generatedAds, 
                selectedApproach
            );
            
            const ideasWithIds = newIdeas.map(idea => ({ ...idea, id: `ad-idea-${Date.now()}-${Math.random()}`}));
    
            setGeneratedAds(prev => [...prev, ...ideasWithIds]);
            addToast(`Successfully generated ${newIdeas.length} new ad concept(s)!`, 'success');
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to generate ad concept.";
            setError(message);
            addToast(message, 'error');
        } finally {
            setGeneratingApproach(null);
        }
    };
    
    const handleGenerateAdImage = async (ideaId: string, prompt: string) => {
        const adToUpdate = generatedAds.find(ad => ad.id === ideaId);
        if (!adToUpdate) return;
    
        logUserAction('GENERATE_AD_CONCEPT_IMAGE', { ideaId, model: settings.imageModel });
    
        try {
            const modelInfo = imageModels.find(m => m.id === settings.imageModel);
            const baseImages = modelInfo?.requiresImage ? subjectImages : undefined;
    
            const imageBytes = await generateImage(prompt, settings.aspectRatio, settings.imageModel, baseImages, useNanoBananaWebhook);
            const imageUrl = `data:image/jpeg;base64,${imageBytes}`;
    
            setGeneratedAds(prev => prev.map(ad => 
                ad.id === ideaId ? { ...ad, generatedImages: [imageUrl] } : ad
            ));
        } catch (err) {
            const message = err instanceof Error ? err.message : "Image generation failed.";
            addToast(message, 'error');
            throw err;
        }
    };
    
    const handleAddSubjectImage = (file: File) => {
        if (subjectImages.length < 6) {
            setSubjectImages(prev => [...prev, file]);
        } else {
            addToast("Maximum of 6 subject images allowed.", "info");
        }
    };

    const handleRemoveSubjectImage = (index: number) => {
        setSubjectImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleApplyGlobalInstructions = () => {
        if (!videoAnalysis || !settings.sceneInstructions.trim()) return;
        const newInstructions: Record<number, string> = {};
        videoAnalysis.storyboard.forEach((_, index) => {
            newInstructions[index] = settings.sceneInstructions;
        });
        setSceneInstructions(newInstructions);
        addToast("Global instructions applied to all scenes.", "success");
    };
    
    const handleGenerateSceneVariation = async (index: 'all' | number) => {
        if (!videoAnalysis) return;
        const scenesToProcess = index === 'all'
            ? videoAnalysis.storyboard.map((_, i) => i)
            : [index];
    
        setGeneratingScene(index);
        addToast(index === 'all' ? `Generating variations for all ${scenesToProcess.length} scenes...` : `Generating variation for scene ${index + 1}...`, 'info');
    
        if (index === 'all' && settings.sceneInstructions.trim()) {
            handleApplyGlobalInstructions();
        }

        const modelToUse = settings.sceneImageModel;
        
        try {
            const processScene = async (sceneIndex: number) => {
                const scene = videoAnalysis.storyboard[sceneIndex];
                const frameDataUrl = extractedFrames[sceneIndex];
                if (!frameDataUrl) {
                    throw new Error(`Frame for scene ${sceneIndex + 1} is not available.`);
                }
                
                const response = await fetch(frameDataUrl);
                const blob = await response.blob();
                const mimeType = frameDataUrl.match(/:(.*?);/)?.[1] ?? blob.type ?? 'image/jpeg';
                const frameFile = new File([blob], `frame_${sceneIndex}.jpg`, { type: mimeType });
    
                let baseImages: File[] = [frameFile];
                if (sceneSubjectImages.length > 0) {
                    const labeledSubject = await addLabelToImage(sceneSubjectImages[0], "SUBJECT IMAGE");
                    baseImages = [labeledSubject, frameFile];
                }
    
                let prompt = scene.still_prompt;
                const specificInstructions = sceneInstructions[sceneIndex] || (index === 'all' ? settings.sceneInstructions : '');
    
                if (modelToUse === 'gemini-2.5-flash-image') {
                     prompt = `${settings.nanoBananaPrompt}\n\nOriginal Prompt: "${scene.still_prompt}"\n\nAdditional Instructions: "${specificInstructions}"`;
                } else if (specificInstructions) {
                    prompt += `\n\nFollow these instructions: ${specificInstructions}`;
                }
                
                const imageBytes = await generateImage(prompt, settings.sceneAspectRatio, modelToUse, baseImages, useNanoBananaWebhook);
                const imageUrl = `data:image/jpeg;base64,${imageBytes}`;
                
                setVideoAnalysis(prev => {
                    if (!prev) return null;
                    const newStoryboard = [...prev.storyboard];
                    const newScene = { ...newStoryboard[sceneIndex] };
                    newScene.generated_images = [imageUrl, ...(newScene.generated_images || [])];
                    newStoryboard[sceneIndex] = newScene;
                    return { ...prev, storyboard: newStoryboard };
                });
            };
            
            const scenePromises = scenesToProcess.map(i => processScene(i));
            const results = await Promise.allSettled(scenePromises);

            results.forEach((result, i) => {
                if (result.status === 'rejected') {
                    const sceneIndex = scenesToProcess[i];
                    const message = result.reason instanceof Error ? result.reason.message : `Scene variation generation failed for scene ${sceneIndex + 1}.`;
                    addToast(message, 'error');
                }
            });
    
            addToast("Scene variation generation complete!", "success");
    
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred during scene variation generation.";
            addToast(message, 'error');
        } finally {
            setGeneratingScene(null);
        }
    };
    
    const handleSceneSubjectImagesChange = (files: File[]) => setSceneSubjectImages(files);

    const handleUpdateScenePrompt = (sceneIndex: number, promptType: 'still_prompt' | 'video_prompt', newText: string) => {
        setVideoAnalysis(prev => {
            if (!prev) return null;
            const newStoryboard = [...prev.storyboard];
            if (newStoryboard[sceneIndex]) {
                newStoryboard[sceneIndex] = { ...newStoryboard[sceneIndex], [promptType]: newText };
            }
            return { ...prev, storyboard: newStoryboard };
        });
    };

    const handleUpdateSceneInstruction = (sceneIndex: number, instruction: string) => {
        setSceneInstructions(prev => ({...prev, [sceneIndex]: instruction}));
    };

    const handleDownloadScene = useCallback((sceneIndex: number) => {
        withMultiDownloadWarning(async () => {
            if (!videoAnalysis) return;
            const scene = videoAnalysis.storyboard[sceneIndex];
            const frame = extractedFrames[sceneIndex];
            const timestampId = scene.timestamp.replace(/[:.]/g, '_');
            const sceneFilenameBase = `${sessionId}_scene-${sceneIndex + 1}_${timestampId}`;
        
            setDownloadProgress({ visible: true, message: `Zipping scene ${sceneIndex + 1}...`, progress: 0 });
            try {
                const zip = new JSZip();
                const folder = zip.folder(sceneFilenameBase);
                if (!folder) throw new Error("Could not create folder in zip.");
    
                const frameFilename = `frame_${timestampId}.jpg`;
                if (frame) {
                    folder.file(frameFilename, frame.split(',')[1], { base64: true });
                }
                
                const modelToUse = settings.sceneImageModel;
                let compositePrompt = scene.still_prompt;
                if (modelToUse === 'gemini-2.5-flash-image') {
                     compositePrompt = `${settings.nanoBananaPrompt}\n\nOriginal Prompt: "${scene.still_prompt}"\n\nAdditional Instructions: "${sceneInstructions[sceneIndex] || settings.sceneInstructions}"`;
                }

                const generationPayload = {
                    composite_prompt: compositePrompt,
                    user_instructions: sceneInstructions[sceneIndex] || settings.sceneInstructions,
                    input_images: [
                        ...sceneSubjectImages.map(f => f.name),
                        frameFilename
                    ]
                };
    
                const info = { 
                    ...scene, 
                    scene_index: sceneIndex + 1,
                    generation_payload: generationPayload,
                    generated_images: scene.generated_images?.map((_, i) => `variations/variation_${i + 1}.jpg`) || []
                };
                folder.file('info.json', JSON.stringify(info, null, 2));
    
                if (scene.generated_images) {
                    const variationsFolder = folder.folder('variations');
                    const imagePromises = scene.generated_images.map(async (imgUrl, i) => {
                        const response = await fetch(imgUrl);
                        const blob = await response.blob();
                        variationsFolder?.file(`variation_${i + 1}.jpg`, blob);
                    });
                    await Promise.all(imagePromises);
                }
    
                setDownloadProgress({ visible: true, message: 'Compressing...', progress: 90 });
    
                const content = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `${sceneFilenameBase}.zip`;
                link.click();
                URL.revokeObjectURL(link.href);
                setDownloadProgress({ visible: false, message: '', progress: 0 });
    
            } catch (err) {
                addToast("Failed to create scene ZIP.", 'error');
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    }, [videoAnalysis, extractedFrames, addToast, setDownloadProgress, withMultiDownloadWarning, sessionId, settings, sceneInstructions, sceneSubjectImages]);
    
    const handleDownloadAllAssets = useCallback(() => {
        withMultiDownloadWarning(async () => {
            if (!videoFile || !videoAnalysis) {
                addToast("No analysis to download.", "error");
                return;
            }
        
            setDownloadProgress({ visible: true, message: 'Starting asset export...', progress: 0 });
            try {
                const zip = new JSZip();
                const parsedTimestamps = videoAnalysis.storyboard.map(s => parseTimestamp(s.timestamp));
        
                zip.file(videoFile.name, videoFile);
                setDownloadProgress({ visible: true, message: 'Adding video...', progress: 10 });
        
                const summaryJson = {
                    metadata: {
                        session_id: sessionId,
                        created_at: new Date().toISOString(),
                        video_filename: videoFile?.name,
                        analysis_model: settings.analysisModel,
                        total_scenes: videoAnalysis.storyboard.length
                    },
                    overall_video_style_prompt: videoAnalysis.overall_video_style_prompt,
                    analysis: videoAnalysis.analysis,
                    concept_approaches: videoAnalysis.concept_approaches,
                    storyboard: videoAnalysis.storyboard.map((scene, index) => {
                        const originalTime = parsedTimestamps[index];
                        const offsetMs = scene.manual_offset_ms || 0;
                        let calculatedBuffer = 0;
                        if (index > 0 && index < videoAnalysis.storyboard.length - 1) {
                            const nextTime = parsedTimestamps[index + 1];
                            const duration = nextTime - originalTime;
                            if (duration > 0) calculatedBuffer = duration / 3;
                        }
                        const finalTime = originalTime + calculatedBuffer + (offsetMs / 1000);
                        const timestampId = scene.timestamp.replace(/[:.]/g, '_');
                        
                        return {
                            ...scene,
                            index: index,
                            timestamps: {
                                original_time_seconds: originalTime,
                                calculated_buffer_seconds: calculatedBuffer,
                                manual_offset_seconds: offsetMs / 1000,
                                final_time_seconds: finalTime,
                                formatted_final_time: formatTimeWithMS(finalTime),
                            },
                            frame_filename: extractedFrames[index] ? `scenes/scene_${index + 1}/frame_${timestampId}.jpg` : null,
                            generated_images: scene.generated_images?.map((_, i) => `scenes/scene_${index + 1}/variations/variation_${i + 1}.jpg`) || []
                        };
                    })
                };
                zip.file('analysis_summary.json', JSON.stringify(summaryJson, null, 2));
                setDownloadProgress({ visible: true, message: 'Adding analysis JSON...', progress: 20 });
        
                const scenesFolder = zip.folder('scenes');
                if (scenesFolder) {
                    const scenePromises = videoAnalysis.storyboard.map(async (scene, i) => {
                        const timestampId = scene.timestamp.replace(/[:.]/g, '_');
                        const sceneFolder = scenesFolder.folder(`scene_${i + 1}`);
                        if (sceneFolder) {
                            const frame = extractedFrames[i];
                            if (frame) sceneFolder.file(`frame_${timestampId}.jpg`, frame.split(',')[1], { base64: true });
                            sceneFolder.file('info.json', JSON.stringify(summaryJson.storyboard[i], null, 2));
    
                            if (scene.generated_images) {
                                const variationsFolder = sceneFolder.folder('variations');
                                const variationPromises = scene.generated_images.map(async (imgUrl, j) => {
                                    const response = await fetch(imgUrl);
                                    const blob = await response.blob();
                                    variationsFolder?.file(`variation_${j + 1}.jpg`, blob);
                                });
                                await Promise.all(variationPromises);
                            }
                        }
                    });
                    await Promise.all(scenePromises);
                }
                setDownloadProgress({ visible: true, message: 'Adding scenes and frames...', progress: 60 });
        
                if (generatedAds.length > 0) {
                    const conceptsFolder = zip.folder('concepts');
                    if (conceptsFolder) {
                        const conceptPromises = generatedAds.map(async (ad, i) => {
                            const conceptFolder = conceptsFolder.folder(`concept_${i + 1}`);
                            if (conceptFolder) {
                                conceptFolder.file('info.json', JSON.stringify(ad, null, 2));
                                if (ad.generatedImages && ad.generatedImages[0]) {
                                    const response = await fetch(ad.generatedImages[0]);
                                    const blob = await response.blob();
                                    conceptFolder.file('image.jpg', blob);
                                }
                            }
                        });
                        await Promise.all(conceptPromises);
                    }
                }
                setDownloadProgress({ visible: true, message: 'Adding concepts...', progress: 80 });
                
                setDownloadProgress({ visible: true, message: 'Compressing all assets...', progress: 95 });
        
                const content = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `VideoAnalyzer_${sessionId}_FullExport.zip`;
                link.click();
                URL.revokeObjectURL(link.href);
                setDownloadProgress({ visible: false, message: '', progress: 0 });
                
            } catch (err) {
                console.error("Download all assets error:", err);
                addToast("Failed to create full asset ZIP.", 'error');
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    }, [videoFile, videoAnalysis, extractedFrames, generatedAds, addToast, setDownloadProgress, withMultiDownloadWarning, sessionId, settings.analysisModel]);
    
    const extractFrame = useCallback(async (videoFile: File, timeInSeconds: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
    
            const videoUrl = URL.createObjectURL(videoFile);
            video.src = videoUrl;
    
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
    
            if (!context) {
                URL.revokeObjectURL(videoUrl);
                return reject(new Error("Could not get 2D context from canvas."));
            }
    
            const onLoadedMetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
    
                const onSeeked = () => {
                    video.removeEventListener('seeked', onSeeked);
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg');
                    URL.revokeObjectURL(videoUrl);
                    resolve(dataUrl);
                };
    
                video.addEventListener('seeked', onSeeked);
                video.currentTime = Math.min(timeInSeconds, video.duration);
            };
    
            const onError = (e: Event) => {
                URL.revokeObjectURL(videoUrl);
                reject(new Error(`Error loading or seeking video: ${e}`));
            };
    
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
        });
    }, []);

    const handleUpdateSceneOffset = useCallback(async (sceneIndex: number, offsetMs: number) => {
        if (!videoAnalysis || !videoFile) return;
    
        setLoadingFrames(prev => new Set(prev).add(sceneIndex));
    
        // This state update will NOT trigger the main `useEffect` because its dependency is memoized
        setVideoAnalysis(prev => {
            if (!prev) return null;
            const newStoryboard = [...prev.storyboard];
            const scene = newStoryboard[sceneIndex];
            if (!scene) return prev;
            newStoryboard[sceneIndex] = { ...scene, manual_offset_ms: offsetMs };
            return { ...prev, storyboard: newStoryboard };
        });
    
        const parsedTimestamps = videoAnalysis.storyboard.map(s => parseTimestamp(s.timestamp));
        const originalTime = parsedTimestamps[sceneIndex];
        let calculatedBuffer = 0;
    
        if (sceneIndex > 0 && sceneIndex < videoAnalysis.storyboard.length - 1) {
            const nextTime = parsedTimestamps[sceneIndex + 1];
            const duration = nextTime - originalTime;
            if (duration > 0) calculatedBuffer = duration / 3;
        }
    
        const timeToCapture = originalTime + calculatedBuffer + (offsetMs / 1000);
    
        try {
            const newFrame = await extractFrame(videoFile, timeToCapture);
            setExtractedFrames(prev => {
                const newFrames = [...prev];
                newFrames[sceneIndex] = newFrame;
                return newFrames;
            });
        } catch (err) {
            addToast(`Could not extract frame at new offset for scene ${sceneIndex + 1}.`, 'error');
            // Revert frame to null on error to indicate failure
            setExtractedFrames(prev => {
                const newFrames = [...prev];
                newFrames[sceneIndex] = null;
                return newFrames;
            });
        } finally {
            setLoadingFrames(prev => {
                const next = new Set(prev);
                next.delete(sceneIndex);
                return next;
            });
        }
    }, [videoAnalysis, videoFile, addToast, extractFrame]);

    const handleLoadMockData = useCallback(async () => {
        resetState();
        addToast("Loading mock data...", "info");
        try {
            const response = await fetch('https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4');
            if (!response.ok) throw new Error('Failed to fetch mock video.');
            
            const blob = await response.blob();
            const mockFile = new File([blob], "mock-video.mp4", { type: "video/mp4" });
            
            setVideoFile(mockFile);
            setVideoAnalysis(mockVideoAnalysisData);
            setExtractedFrames(mockExtractedFrames);
            setReplicationPrompt(constructReplicationPrompt(mockVideoAnalysisData));
            setAppState('analyzed');
            setVideoAspectRatio(16 / 9);
            addToast("Mock data loaded successfully.", "success");
            logUserAction('LOAD_MOCK_DATA_VIDEO_ANALYZER');
        } catch (err) {
            const message = err instanceof Error ? err.message : "Could not load mock data.";
            addToast(message, 'error');
            console.error(err);
        }
    }, [addToast]);

    // A memoized, stable dependency for the main frame extraction effect.
    // It only changes if the core timestamps of the storyboard change.
    const storyboardTimestamps = useMemo(() => {
        if (!videoAnalysis) return null;
        return JSON.stringify(videoAnalysis.storyboard.map(s => s.timestamp));
    }, [videoAnalysis]);


    // --- Frame Extraction Effect ---
    useEffect(() => {
        if (!videoFile || !videoAnalysis?.storyboard || videoAnalysis.storyboard.length === 0) {
            setExtractedFrames([]);
            return;
        }

        const extractAllFrames = async () => {
            setIsExtractingFrames(true);
            setExtractedFrames(Array(videoAnalysis.storyboard.length).fill(null));

            const parsedTimestamps = videoAnalysis.storyboard.map(s => parseTimestamp(s.timestamp));
            
            const framePromises = videoAnalysis.storyboard.map(async (scene, i) => {
                const originalTime = parsedTimestamps[i];
                const offsetMs = scene.manual_offset_ms || 0;
                let calculatedBuffer = 0;

                // Apply buffer only to INTERMEDIATE scenes
                if (i > 0 && i < videoAnalysis.storyboard.length - 1) {
                    const nextTime = parsedTimestamps[i + 1];
                    const duration = nextTime - originalTime;
                    if (duration > 0) {
                        calculatedBuffer = duration / 3;
                    }
                }
                
                const timeToCapture = originalTime + calculatedBuffer + (offsetMs / 1000);

                try {
                    return await extractFrame(videoFile, timeToCapture);
                } catch (err) {
                    console.error(`Failed to extract frame for scene ${i + 1}:`, err);
                    return null;
                }
            });

            const capturedFrames = await Promise.all(framePromises);
            
            setExtractedFrames(capturedFrames);
            setIsExtractingFrames(false);
        };

        extractAllFrames().catch(err => {
            setError("An error occurred during frame extraction.");
            setIsExtractingFrames(false);
        });
    }, [videoFile, storyboardTimestamps, extractFrame]);


    return {
        videoFile,
        handleVideoChange,
        appState,
        handleAnalyze,
        analysisLogs,
        error,
        videoAnalysis,
        replicationPrompt,
        extractedFrames,
        isExtractingFrames,
        loadingFrames,
        handleGenerateConcept,
        generatedAds,
        settings,
        setSettings,
        analysisParseError,
        handleRetryAnalysis,
        processedVideo,
        generatingApproach,
        generatingScene,
        handleGenerateSceneVariation,
        sceneSubjectImages,
        handleSceneSubjectImagesChange,
        subjectImages,
        handleAddSubjectImage,
        handleRemoveSubjectImage,
        isBusy: isCoreAnalysisBusy,
        isGeneratingConcepts: isConceptGenerationBusy,
        isGeneratingScenes: isSceneGenerationBusy,
        handleGenerateAdImage,
        handleUpdateScenePrompt,
        handleDownloadScene,
        handleDownloadAllAssets,
        videoAspectRatio,
        setVideoAspectRatio,
        handleUpdateSceneOffset,
        handleLoadMockData,
        sceneInstructions,
        handleUpdateSceneInstruction,
        handleApplyGlobalInstructions,
    };
};
