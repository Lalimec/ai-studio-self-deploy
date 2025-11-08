/// <reference lib="dom" />
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ai } from "./geminiClient";
import { VideoAnalysis, AdIdea, AnalysisModel, ImageModel, AspectRatio, JsonParseError, VideoAnalyzerSettings } from "../types";
import { systemInstructionForAnalysis, getSystemInstructionForConcept } from "../prompts/videoAnalyzerPrompts";
import { generateFigureImage } from "./geminiService";
import { Constance } from "./endpoints";
import { uploadVideoToGCS } from "./videoUploadService";

export const parseTimestamp = (timestamp: string): number => {
    const parts = timestamp.split(/[:.]/);
    if (parts.length < 2) return 0;
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    const milliseconds = parts.length > 2 ? parseInt(parts[2], 10) || 0 : 0;
    return minutes * 60 + seconds + milliseconds / 1000;
};

export const formatTimeWithMS = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00.000";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds - Math.floor(timeInSeconds)) * 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

export const aspectRatioToClass = (ratio: AspectRatio): string => {
    const mapping: Record<AspectRatio, string> = {
      'auto': 'aspect-video',
      '1:1': 'aspect-square',
      '3:4': 'aspect-[3/4]',
      '4:3': 'aspect-[4/3]',
      '9:16': 'aspect-[9/16]',
      '16:9': 'aspect-[16/9]',
      '2:3': 'aspect-[2/3]',
      '3:2': 'aspect-[3/2]',
      '4:5': 'aspect-[4/5]',
      '5:4': 'aspect-[5/4]',
      '21:9': 'aspect-[21/9]',
    };
    return mapping[ratio] || 'aspect-video';
};

// FIX: Export 'parseAnalysisResponse' to make it accessible for the analysis retry logic.
export const parseAnalysisResponse = (responseText: string): VideoAnalysis => {
    try {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
        if (!jsonMatch) throw new Error("Could not find a JSON object in the response.");
        
        const jsonString = jsonMatch[1] || jsonMatch[2];
        const parsed = JSON.parse(jsonString);

        if (!parsed.analysis || !parsed.concept_approaches || !parsed.storyboard || !parsed.overall_video_style_prompt) {
            throw new Error("Missing required keys in response.");
        }
        return parsed as VideoAnalysis;
    } catch (parseError: any) {
        console.error("Failed to parse JSON response:", parseError);
        throw new JsonParseError(`Failed to parse the AI's response: ${parseError.message}`, responseText);
    }
};

export const fixMalformedJson = async (malformedJson: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AI assistant that corrects malformed JSON responses from another AI. The following text is supposed to be a valid JSON object matching a specific schema, but it has errors (syntax errors, missing keys, wrong structure, etc.). Your task is to fix it and return ONLY the corrected, valid JSON object that adheres to the required structure. The required structure has top-level keys: "analysis", "concept_approaches", "overall_video_style_prompt", and "storyboard". The "storyboard" key must be an array of objects. Here is the malformed text:\n\n${malformedJson}`,
    });
    return response.text;
};

export const generateAnalysis = async (
    processedFile: { uri: string; mimeType: string },
    model: AnalysisModel,
    onProgress: (message: string) => void
): Promise<VideoAnalysis> => {
    onProgress('Starting video analysis with Gemini...');

    const videoPart = {
        fileData: {
            mimeType: processedFile.mimeType,
            fileUri: processedFile.uri,
        },
    };

    const response = await ai.models.generateContent({
        model: model,
        contents: [{
            parts: [
                videoPart,
                { text: "Analyze this video ad based on your instructions and provide the complete JSON output." }
            ]
        }],
        config: {
            systemInstruction: systemInstructionForAnalysis,
            tools: [{ googleSearch: {} }],
        },
    });

    onProgress('Analysis complete. Parsing results.');
    return parseAnalysisResponse(response.text);
};

// New function for inline data (small videos)
export const generateAnalysisWithInlineData = async (
    videoFile: File,
    model: AnalysisModel,
    onProgress: (message: string) => void
): Promise<VideoAnalysis> => {
    onProgress('Converting video to base64...');

    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(videoFile);
    });

    onProgress('Analyzing video with Gemini (inline mode)...');

    const videoPart = {
        inlineData: {
            mimeType: videoFile.type,
            data: base64Data,
        },
    };

    const response = await ai.models.generateContent({
        model: model,
        contents: [{
            parts: [
                videoPart,
                { text: "Analyze this video ad based on your instructions and provide the complete JSON output." }
            ]
        }],
        config: {
            systemInstruction: systemInstructionForAnalysis,
            tools: [{ googleSearch: {} }],
        },
    });

    onProgress('Analysis complete. Parsing results.');
    return parseAnalysisResponse(response.text);
};


export const analyzeVideo = async (
  videoFile: File,
  model: AnalysisModel,
  onProgress: (message: string) => void
): Promise<{ analysis: VideoAnalysis, processedFile: { uri: string, mimeType: string } }> => {
    // For small videos (< 20MB), use inline data to bypass File API issues
    const MAX_INLINE_SIZE = 20 * 1024 * 1024; // 20MB

    if (videoFile.size < MAX_INLINE_SIZE) {
        onProgress("Processing video inline (small file)...");
        const analysis = await generateAnalysisWithInlineData(videoFile, model, onProgress);
        return {
            analysis,
            processedFile: {
                uri: 'inline-data',
                mimeType: videoFile.type
            }
        };
    }

    // For larger videos, use Gemini File API
    onProgress("Uploading video to Gemini File API...");
    try {
        const uploadResult = await ai.files.upload({
            file: videoFile,
            videoProcessingOptions: {
                frameRateCaptureConfig: {
                    frameRate: 15,
                },
            },
        });
        onProgress(`Video uploaded: ${uploadResult.name}. Waiting for processing...`);

        const fileName = uploadResult.name;
        let file = await ai.files.get({ name: fileName });

        const maxRetries = 20;
        let retries = 0;

        while (file.state === 'PROCESSING' && retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            file = await ai.files.get({ name: fileName });
            retries++;
            onProgress(`Processing video, attempt ${retries}/${maxRetries}...`);
        }

        if (file.state !== 'ACTIVE') {
            throw new Error(`File processing failed. Final state: ${file.state}`);
        }

        const processedFileInfo = {
            uri: file.uri,
            mimeType: file.mimeType,
        };

        const analysis = await generateAnalysis(processedFileInfo, model, onProgress);

        return { analysis, processedFile: processedFileInfo };
    } catch (error: any) {
        if (error.message?.includes('upload url') || error.message?.includes('x-google-upload-url')) {
            throw new Error('File API upload failed due to SDK bug. Try using a smaller video (< 20MB) or wait for SDK fix. Error: ' + error.message);
        }
        throw error;
    }
};


export const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type }
    };
};

const parseJsonResponse = <T>(responseText: string, expectedKey: 'ideas'): T => {
    try {
        const trimmedText = responseText.trim();
        const parsedObject = JSON.parse(trimmedText);

        if (!parsedObject[expectedKey]) {
            throw new Error(`Missing required '${expectedKey}' key in AI response.`);
        }
        return parsedObject[expectedKey];
    } catch (parseError: any) {
        console.error("Failed to parse JSON response:", parseError);
        throw new Error("Failed to parse the AI's response for ad concepts.");
    }
};


export const generateAdConcept = async (
    videoAnalysis: VideoAnalysis,
    subjectImages: File[],
    settings: VideoAnalyzerSettings,
    existingConcepts: AdIdea[] = [],
    selectedApproach?: string,
): Promise<AdIdea[]> => {
    const { analysisModel: model, additionalInstructions } = settings;
    const imageParts = await Promise.all(subjectImages.map(fileToGenerativePart));
    const analysisContext = `Here is the high-level strategic analysis of the original video ad:\n---\n${videoAnalysis.analysis}\n---\nHere are the recommended creative approaches:\n---\n${videoAnalysis.concept_approaches}\n---\nHere is the overall visual style prompt which you should also consider for stylistic consistency:\n---\n${videoAnalysis.overall_video_style_prompt}\n---`;
    
    let systemInstruction = getSystemInstructionForConcept(
        selectedApproach || '', 
        additionalInstructions,
        existingConcepts.map(({ title, description }) => ({ title, description }))
    );

    if(subjectImages.length > 0) {
        systemInstruction = `CRITICAL INSTRUCTION: The user has provided new subject images. You MUST use these images to replace the subject described in the storyboard. The 'subjects' and 'generation_prompt' fields in your output must describe the new subject from the provided images, not the original one.\n\n${systemInstruction}`;
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [...imageParts, { text: analysisContext }] }],
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT, properties: {
                    ideas: {
                        type: Type.ARRAY, items: {
                            type: Type.OBJECT, properties: {
                                title: { type: Type.STRING }, description: { type: Type.STRING }, layout: { type: Type.STRING }, cta: { type: Type.STRING },
                                text: { type: Type.OBJECT, properties: { headline: { type: Type.STRING }, body: { type: Type.STRING }, disclaimer: { type: Type.STRING }, }, required: ["headline", "body", "disclaimer"] },
                                subjects: { type: Type.STRING }, environment: { type: Type.STRING }, vibe: { type: Type.STRING }, creatives: { type: Type.STRING }, generation_prompt: { type: Type.STRING },
                            },
                            required: ["title", "description", "layout", "cta", "text", "subjects", "environment", "vibe", "creatives", "generation_prompt"]
                        },
                    },
                }, required: ["ideas"],
            },
        },
    });

    return parseJsonResponse<AdIdea[]>(response.text, 'ideas');
};

// Helper to convert File to base64
const fileToBase64 = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve({ base64, mimeType: file.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Map Video Analyzer model IDs to main repo model IDs
const mapModelId = (modelId: ImageModel): string => {
    switch (modelId) {
        case 'gemini-2.5-flash-image':
            return Constance.models.image.flash; // Use native Gemini
        case 'nano-banana':
            return Constance.models.image.nanoBanana;
        case 'seedream':
            return Constance.models.image.seedream;
        case 'flux-kontext-pro':
            return Constance.models.image.flux;
        default:
            // Imagen models use native generation
            return modelId;
    }
};

export const generateImage = async (
    prompt: string,
    aspectRatio: AspectRatio,
    modelId: ImageModel,
    baseImageFiles?: File[],
    useNanoBananaWebhook?: boolean
): Promise<string> => {
    // For Imagen models (native generation without base images)
    const isImagenModel = modelId.startsWith('imagen-');

    if (isImagenModel) {
        const response = await ai.models.generateImages({
            model: modelId,
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio === 'auto' ? '1:1' : aspectRatio,
            },
        });
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("No images returned from Imagen model.");
    }

    // For edit models (gemini-2.5-flash-image and external webhooks)
    // These require at least one base image
    if (!baseImageFiles || baseImageFiles.length === 0) {
        throw new Error(`Model ${modelId} requires at least one base image.`);
    }

    // Convert files to base64 format
    const imageSources = await Promise.all(baseImageFiles.map(fileToBase64));

    // Map the model ID to the main repo's model naming
    const mappedModel = mapModelId(modelId);

    // Use the main repo's unified generation function
    const resultDataUrl = await generateFigureImage(
        mappedModel,
        prompt,
        imageSources,
        { aspectRatio },
        useNanoBananaWebhook
    );

    // Extract base64 from data URL
    const base64Match = resultDataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
    if (base64Match) {
        return base64Match[1];
    }

    throw new Error("Invalid data URL format returned from generateFigureImage");
};