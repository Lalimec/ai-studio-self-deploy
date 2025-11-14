import { ImageForVideoProcessing, GeneratedImage, StudioImage, GeneratedBabyImage } from '../types';
import { processWithConcurrency } from './apiUtils';
import { ai, dataUrlToBlob as dataUrlToBlobUtil } from './geminiClient';
import { GenerateContentResponse } from '@google/genai';
import { Constance } from './endpoints';
import {
    adaptVideoInitResponse,
    adaptVideoStatusResponse,
    fetchAndAdapt,
    parseErrorResponse
} from './apiResponseAdapter';

const POLLING_INTERVAL_MS = 5000;
const MAX_POLLING_ATTEMPTS = 60; // 5 minutes timeout (60 attempts * 5 seconds)

// FIX: Export the text model name so other services can use it consistently.
export const textModel = Constance.models.text.flash;

// FIX: Export the dataUrlToBlob utility for use in other hooks.
export const dataUrlToBlob = dataUrlToBlobUtil;


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Use centralized error parser
const parseGenerationError = (error: Error, task: { filename: string }): string => {
  return parseErrorResponse(error, task.filename);
};


const pollForResult = async (requestId: string): Promise<string> => {
    for (let attempt = 0; attempt < MAX_POLLING_ATTEMPTS; attempt++) {
        await delay(POLLING_INTERVAL_MS);

        try {
            // Use centralized adapter for status polling
            const statusResult = await fetchAndAdapt(
                Constance.endpoints.videoStatus,
                { id: requestId },
                adaptVideoStatusResponse
            );

            // Check if completed with video URL
            if (statusResult.status === 'completed' && statusResult.videoUrl) {
                return statusResult.videoUrl;
            }

            // If still generating, continue polling
            if (statusResult.status === 'generating') {
                continue;
            }

            // If status is 'failed', error will be thrown by adapter
            // This line shouldn't be reached but included for completeness
            throw new Error(`Video generation failed with unexpected status: ${statusResult.status}`);

        } catch (error: any) {
            // Distinguish between transient errors (network, parsing) and definitive failures
            if (error instanceof SyntaxError || error instanceof TypeError) {
                console.warn(`Polling attempt ${attempt + 1} encountered a transient error. Retrying...`, error);
                if (attempt === MAX_POLLING_ATTEMPTS - 1) throw error; // Fail on last attempt
                continue; // Retry on transient errors
            }

            // If it's an ApiError (from adapter), re-throw immediately
            if (error.isUserFacing !== undefined) {
                throw error;
            }

            // Re-throw other definitive errors
            throw error;
        }
    }
    throw new Error(`Video generation timed out after ${MAX_POLLING_ATTEMPTS * POLLING_INTERVAL_MS / 1000 / 60} minutes.`);
};

type VideoGenerationParams = {
    startImageUrl: string;
    endImageUrl?: string;
    videoPrompt: string;
};

const generateSingleVideo = async (params: VideoGenerationParams): Promise<string> => {
    if (!params.videoPrompt) {
        throw new Error(`Video prompt is missing.`);
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

    // Step 1: Initiate video generation and get a request ID using centralized adapter
    const initResult = await fetchAndAdapt(
        Constance.endpoints.videoGeneration,
        payload,
        adaptVideoInitResponse
    );

    // Step 2: Poll for the video URL using the request ID
    return pollForResult(initResult.requestId);
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