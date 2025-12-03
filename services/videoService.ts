import { ImageForVideoProcessing, GeneratedImage, StudioImage, GeneratedBabyImage } from '../types';
import { processWithConcurrency, fetchViaWebhookProxy } from './apiUtils';
import { ai, dataUrlToBlob as dataUrlToBlobUtil, imageUrlToBase64 } from './geminiClient';
import { GenerateContentResponse } from '@google/genai';
import { Constance } from './endpoints';

const POLLING_INTERVAL_MS = 10000; // 10 seconds between polls (reduced frequency, less server load)
const MAX_POLLING_ATTEMPTS = 60; // 10 minutes timeout (60 attempts × 10 seconds = 600s)

// FIX: Export the text model name so other services can use it consistently.
export const textModel = Constance.models.text.flash;

// FIX: Export the dataUrlToBlob utility for use in other hooks.
export const dataUrlToBlob = dataUrlToBlobUtil;

// Custom error classes for better error handling
export class VideoTimeoutError extends Error {
    requestId: string;
    attemptsMade: number;

    constructor(requestId: string, attemptsMade: number) {
        const minutes = (attemptsMade * POLLING_INTERVAL_MS) / 1000 / 60;
        super(`Video generation polling timed out after ${minutes.toFixed(1)} minutes. The video may still be processing.`);
        this.name = 'VideoTimeoutError';
        this.requestId = requestId;
        this.attemptsMade = attemptsMade;
    }
}

export class VideoGenerationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'VideoGenerationError';
    }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const parseGenerationError = (error: Error, task: { filename: string }): string => {
  const prefix = `Failed on ${task.filename}`;
  if (error.message.includes('SAFETY')) {
      return `${prefix}: Generation failed due to safety filters.`;
  }
  return `${prefix}. The model could not complete this request.`;
};


const pollForResult = async (requestId: string, startAttempt: number = 0): Promise<string> => {
    for (let attempt = startAttempt; attempt < MAX_POLLING_ATTEMPTS; attempt++) {
        await delay(POLLING_INTERVAL_MS);

        try {
            // Use webhook proxy to avoid CORS issues
            const result = await fetchViaWebhookProxy<{
                videos?: string[];
                Error?: string;
                error?: string;
                status?: string;
            }>(
                Constance.endpoints.videoStatus,
                { id: requestId },
                { maxRetries: 1 } // Don't retry much within polling since we already have polling retries
            );

            if (result.videos && Array.isArray(result.videos) && result.videos.length > 0) {
                return result.videos[0]; // Success
            }

            if (result.Error || result.error) {
                throw new VideoGenerationError(result.Error || result.error || 'Unknown error');
            }

            if (result.status !== 'generating') {
                throw new VideoGenerationError(`Video generation failed with status: ${result.status || 'unknown'}`);
            }

            // If status is 'generating', loop continues...

        } catch (error) {
            // Don't wrap our custom errors
            if (error instanceof VideoGenerationError || error instanceof VideoTimeoutError) {
                throw error;
            }

            // Distinguish between transient errors (network, parsing) and definitive failures.
            if (error instanceof SyntaxError || error instanceof TypeError) {
                console.warn(`Polling attempt ${attempt + 1} encountered a transient error. Retrying...`, error);
                if (attempt === MAX_POLLING_ATTEMPTS - 1) {
                    throw new VideoTimeoutError(requestId, attempt + 1);
                }
                continue; // Retry on transient errors
            }
            // Re-throw other errors as VideoGenerationError
            throw new VideoGenerationError(error instanceof Error ? error.message : String(error));
        }
    }
    throw new VideoTimeoutError(requestId, MAX_POLLING_ATTEMPTS);
};

// Function to resume polling from a timeout
export const resumeVideoPolling = async (requestId: string, attemptsMade: number = 0): Promise<string> => {
    return pollForResult(requestId, attemptsMade);
};

type VideoGenerationParams = {
    startImageUrl: string;
    endImageUrl?: string;
    videoPrompt: string;
};

const generateSingleVideo = async (params: VideoGenerationParams): Promise<string> => {
    if (!params.videoPrompt) {
        throw new VideoGenerationError(`Video prompt is missing.`);
    }

    const payload: { [key: string]: any } = {
        prompt: params.videoPrompt,
        image_url: params.startImageUrl,
        aspect_ratio: 'auto',
        resolution: '720p',
        duration: '5'
    };

    if (params.endImageUrl) {
        payload.end_image_url = params.endImageUrl;
    }

    // Step 1: Initiate video generation and get a request ID (use webhook proxy to avoid CORS)
    const initialResult = await fetchViaWebhookProxy<{
        request_id?: string;
        Error?: string;
    }>(Constance.endpoints.videoGeneration, payload);

    // Check for an error payload
    if (initialResult && initialResult.Error) {
        throw new VideoGenerationError(initialResult.Error);
    }

    if (!initialResult.request_id) {
        throw new VideoGenerationError('API response did not contain a request_id.');
    }

    // Step 2: Poll for the video URL using the request ID
    return pollForResult(initialResult.request_id);
};

export type VideoTask = VideoGenerationParams & { filename: string };

// Non-blocking timeout callback - just notifies, doesn't wait for user response
export type VideoTimeoutCallback = (filename: string, requestId: string, attemptsMade: number) => void;

export const generateAllVideos = async (
    videoTasks: VideoTask[],
    onVideoGenerated: (filename: string, videoSrc: string) => void,
    onError: (errorMessage: string) => void,
    onVideoTimeout?: VideoTimeoutCallback
): Promise<void> => {
    const processTask = async (task: VideoTask) => {
        try {
            const videoSrc = await generateSingleVideo(task);
            onVideoGenerated(task.filename, videoSrc);
        } catch (error) {
            if (error instanceof VideoTimeoutError) {
                // Non-blocking timeout handling - just notify and continue processing other videos
                if (onVideoTimeout) {
                    onVideoTimeout(task.filename, error.requestId, error.attemptsMade);
                } else {
                    // Fallback: treat as regular error if no timeout handler provided
                    onError(`Timeout on ${task.filename}: ${error.message}`);
                }
            } else {
                // Regular error handling
                const message = error instanceof Error ? error.message : 'An unknown error occurred';
                onError(`Failed on ${task.filename}: ${message}`);
            }
        }
    };

    await processWithConcurrency(videoTasks, processTask, 8);
};

export const generateSingleVideoForImage = async (params: VideoTask): Promise<string> => {
    return generateSingleVideo(params);
}

// Retry a specific timed-out video by its requestId
export const retryTimeoutVideo = async (
    requestId: string,
    attemptsMade: number = 0
): Promise<string> => {
    return resumeVideoPolling(requestId, attemptsMade);
};

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
      // Use imageUrlToBase64 to handle both data URLs and HTTPS URLs from webhooks
      const imageBlob = await imageUrlToBase64(task.src);
      const videoPrompt = await generateVideoPromptForImage(imageBlob, guidance);
      onProgress(filename, videoPrompt);
    } catch (error) {
      console.error(`Failed to generate video prompt for "${filename}":`, error);
      onError(parseGenerationError(error as Error, { filename }));
    }
  };

  await processWithConcurrency(images, processSingleTask, 10);
};