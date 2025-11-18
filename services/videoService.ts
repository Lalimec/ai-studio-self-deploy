import { ImageForVideoProcessing, GeneratedImage, StudioImage, GeneratedBabyImage } from '../types';
import { processWithConcurrency } from './apiUtils';
import { ai, dataUrlToBlob as dataUrlToBlobUtil } from './geminiClient';
import { GenerateContentResponse } from '@google/genai';
import { Constance } from './endpoints';

const POLLING_INTERVAL_MS = 5000;
const MAX_POLLING_ATTEMPTS = 60; // 5 minutes timeout (60 attempts * 5 seconds)

// FIX: Export the text model name so other services can use it consistently.
export const textModel = Constance.models.text.flash;

// FIX: Export the dataUrlToBlob utility for use in other hooks.
export const dataUrlToBlob = dataUrlToBlobUtil;


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const parseGenerationError = (error: Error, task: { filename: string }): string => {
  const prefix = `Failed on ${task.filename}`;
  if (error.message.includes('SAFETY')) {
      return `${prefix}: Generation failed due to safety filters.`;
  }
  return `${prefix}. The model could not complete this request.`;
};


const pollForResult = async (requestId: string): Promise<string> => {
    for (let attempt = 0; attempt < MAX_POLLING_ATTEMPTS; attempt++) {
        await delay(POLLING_INTERVAL_MS);

        try {
            const response = await fetch(Constance.endpoints.videoStatus, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: requestId }),
            });

            const result = await response.json();

            if (!response.ok) {
                if (result && (result.Error || result.error)) {
                    throw new Error(result.Error || result.error); // Definitive failure with specific message
                }
                console.warn(`Polling attempt ${attempt + 1} failed with status ${response.status}. Retrying...`);
                continue; // Generic server error, retry
            }

            if (result.videos && Array.isArray(result.videos) && result.videos.length > 0) {
                return result.videos[0]; // Success
            }

            if (result.Error) {
                throw new Error(result.Error); // Definitive failure with specific message
            }

            if (result.status !== 'generating') {
                throw new Error(`Video generation failed with status: ${result.status || 'unknown'}`); // Definitive failure
            }

            // If status is 'generating', loop continues...

        } catch (error) {
            // Distinguish between transient errors (network, parsing) and definitive failures.
            if (error instanceof SyntaxError || error instanceof TypeError) {
                console.warn(`Polling attempt ${attempt + 1} encountered a transient error. Retrying...`, error);
                if (attempt === MAX_POLLING_ATTEMPTS - 1) throw error; // Fail on last attempt
                continue; // Retry on transient errors
            }
            // Re-throw definitive errors (the ones we created with `new Error`).
            throw error;
        }
    }
    throw new Error(`Video generation timed out after ${MAX_POLLING_ATTEMPTS * POLLING_INTERVAL_MS / 1000 / 60} minutes.`);
};

type VideoGenerationParams = {
    startImageUrl: string;
    endImageUrl?: string;
    videoPrompt: string;
    resolution?: string;
    duration?: number;
    aspectRatio?: string;
};

const generateSingleVideo = async (params: VideoGenerationParams): Promise<string> => {
    if (!params.videoPrompt) {
        throw new Error(`Video prompt is missing.`);
    }

    const payload: { [key: string]: any } = {
        prompt: params.videoPrompt,
        image_url: params.startImageUrl,
        aspect_ratio: params.aspectRatio || 'auto',
        resolution: params.resolution || '720p',
        duration: params.duration ? params.duration.toString() : '5'
    };

    if (params.endImageUrl) {
        payload.end_image_url = params.endImageUrl;
    }

    // Step 1: Initiate video generation and get a request ID
    const initialResponse = await fetch(Constance.endpoints.videoGeneration, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    // We assume error responses are also JSON, so we parse the body first.
    const initialResult = await initialResponse.json();

    // Check for an error payload OR a non-200 status code
    if (!initialResponse.ok || (initialResult && initialResult.Error)) {
        const errorMessage = initialResult.Error || `Video generation initiation failed with status ${initialResponse.status}`;
        throw new Error(errorMessage);
    }

    if (!initialResult.request_id) {
        throw new Error('API response did not contain a request_id.');
    }

    // Step 2: Poll for the video URL using the request ID
    return pollForResult(initialResult.request_id);
};

export type VideoTask = VideoGenerationParams & { filename: string };

export const generateAllVideos = async (
    videoTasks: VideoTask[],
    onVideoGenerated: (filename: string, videoSrc: string) => void,
    onError: (errorMessage: string) => void
): Promise<void> => {
    const processTask = async (task: VideoTask) => {
        try {
            const videoSrc = await generateSingleVideo(task);
            onVideoGenerated(task.filename, videoSrc);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            onError(`Failed on ${task.filename}: ${message}`);
        }
    };
    
    await processWithConcurrency(videoTasks, processTask, 8);
};

export const generateSingleVideoForImage = async (params: VideoTask): Promise<string> => {
    return generateSingleVideo(params);
}

// --- FIX: Added missing functions that were being imported in various hooks ---

export const generateVideoPromptForImage = async (
    imageBlob: { base64: string, mimeType: string },
    guidance?: string
): Promise<string> => {
  let prompt = `Analyze the person, their clothing, and the setting in this image. Create a short, descriptive video prompt (around 25-35 words) for an AI video generator. The camera should be 'stationary' or 'static'. Focus on subtle, natural movements, like a gentle smile, a shift in gaze, or a slight head turn. The style should be natural and engaging.`;

  if (guidance && guidance.trim()) {
      prompt += ` IMPORTANT: The prompt must also adhere to this high-level instruction: "${guidance}".`;
  }

  prompt += ` Example: 'A person with brown hair smiles gently while looking at the camera, with soft light on their face, camera remains stationary.'`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: Constance.models.text.flash,
    contents: {
      parts: [
        { inlineData: { data: imageBlob.base64, mimeType: imageBlob.mimeType } },
        { text: prompt },
      ]
    },
  });

  return response.text;
};

export const enhanceVideoPromptForImage = async (
    imageBlob: { base64: string, mimeType: string },
    currentPrompt: string
): Promise<string> => {
  const prompt = `Analyze the image and the user's video prompt. Rewrite the prompt to be more descriptive, cinematic, and clear for an AI video generator, while keeping the core idea. The length should be around 25-35 words. User's prompt: "${currentPrompt}"`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: Constance.models.text.flash,
    contents: {
      parts: [
        { inlineData: { data: imageBlob.base64, mimeType: imageBlob.mimeType } },
        { text: prompt },
      ]
    },
  });

  return response.text;
};

// FIX: Added missing enhancePrompt function for use in Video Studio general prompt enhancement.
export const enhancePrompt = async (prompt: string): Promise<string> => {
    const userPrompt = `Enhance the following high-level instruction to be more evocative and clear for guiding an AI video generator that animates static images. The instruction should describe a mood, style, or type of subtle motion. Example: "a slow, happy expression" becomes "The person's expression slowly blossoms into a warm, gentle smile, conveying a sense of serene happiness." Return ONLY the enhanced instruction. The instruction to enhance is: "${prompt}"`;
    const response: GenerateContentResponse = await ai.models.generateContent({ model: Constance.models.text.flash, contents: userPrompt });
    return response.text;
};

// FIX: Added missing rewriteVideoPromptForImage function for use in Timeline Studio prompt rewriting.
export const rewriteVideoPromptForImage = async (
    imageBlob: { base64: string, mimeType: string },
    currentPrompt: string,
    guidance: string
): Promise<string> => {
  const prompt = `Analyze the image and the existing video prompt. Rewrite the video prompt to incorporate the following high-level instruction, while keeping the core subject and action from the original prompt. The new prompt should be more descriptive and cinematic.
  
  High-level instruction: "${guidance}"
  Existing prompt to rewrite: "${currentPrompt}"
  
  Generate ONLY the new, rewritten video prompt.`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: Constance.models.text.flash,
    contents: {
      parts: [
        { inlineData: { data: imageBlob.base64, mimeType: imageBlob.mimeType } },
        { text: prompt },
      ]
    },
  });

  return response.text;
};

export const translateTextToEnglish = async (text: string): Promise<string> => {
    const systemInstruction = `You are an AI prompt assistant. Your task is to translate the given text into English and refine it into a clear and effective prompt for an AI video generator that animates a static image. The prompt should describe a short, subtle animation. Return ONLY the final, refined prompt string, with no additional commentary, explanations, or introductory phrases.`;
    const response: GenerateContentResponse = await ai.models.generateContent({ 
        model: Constance.models.text.flash, 
        contents: `Text to translate: "${text}"`,
        config: {
            systemInstruction
        }
    });
    return response.text;
};

export const prepareVideoPrompts = async (
  images: (GeneratedImage | StudioImage | GeneratedBabyImage)[],
  onProgress: (filename: string, prompt: string) => void,
  onError: (errorMessage: string) => void,
  guidance?: string
): Promise<void> => {
  const processSingleTask = async (task: (GeneratedImage | StudioImage | GeneratedBabyImage)) => {
    const filename = 'id' in task ? task.id : task.filename;
    try {
      const imageBlob = dataUrlToBlob(task.src);
      const videoPrompt = await generateVideoPromptForImage(imageBlob, guidance);
      onProgress(filename, videoPrompt);
    } catch (error) {
      console.error(`Failed to generate video prompt for "${filename}":`, error);
      onError(parseGenerationError(error as Error, { filename }));
    }
  };

  await processWithConcurrency(images, processSingleTask, 6);
};