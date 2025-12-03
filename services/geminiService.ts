/// <reference lib="dom" />
// This file was populated with functionality that was missing from the project.
// It includes several helper functions for interacting with the Gemini API
// for tasks required by the Image Studio, such as generating/enhancing prompts
// and generating images.

import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { ai } from './geminiClient';
import { Constance } from './endpoints';
import { uploadImageFromDataUrl } from './imageUploadService';
import { fetchViaWebhookProxy } from './apiUtils';

// ============================================================================
// Nano Banana Pro Async Generation (similar to Video generation pattern)
// ============================================================================

const NANO_BANANA_POLLING_INTERVAL_MS = 10000; // 10 seconds between polls
const NANO_BANANA_MAX_POLLING_ATTEMPTS = 30; // 5 minutes timeout (30 attempts × 10 seconds = 300s)

// Custom error classes for Nano Banana Pro generation
export class NanoBananaProTimeoutError extends Error {
    requestId: string;
    attemptsMade: number;

    constructor(requestId: string, attemptsMade: number) {
        const minutes = (attemptsMade * NANO_BANANA_POLLING_INTERVAL_MS) / 1000 / 60;
        super(`Image generation polling timed out after ${minutes.toFixed(1)} minutes. The image may still be processing.`);
        this.name = 'NanoBananaProTimeoutError';
        this.requestId = requestId;
        this.attemptsMade = attemptsMade;
    }
}

export class NanoBananaProGenerationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NanoBananaProGenerationError';
    }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Polls the Nano Banana status endpoint until images are ready or timeout.
 * @param requestId - The request ID from the initial generation call
 * @param startAttempt - Starting attempt number (for resume capability)
 * @param statusEndpoint - The status endpoint to poll (defaults to nanoBananaProStatus)
 * @returns Array of image URLs
 */
const pollForNanoBananaResult = async (
    requestId: string,
    startAttempt: number = 0,
    statusEndpoint: string = Constance.endpoints.nanoBananaProStatus
): Promise<string[]> => {
    for (let attempt = startAttempt; attempt < NANO_BANANA_MAX_POLLING_ATTEMPTS; attempt++) {
        // Wait AFTER the first attempt, not before (so we check immediately first)
        if (attempt > startAttempt) {
            await delay(NANO_BANANA_POLLING_INTERVAL_MS);
        }

        try {
            const result = await fetchViaWebhookProxy<{
                images?: string[];
                image?: string | string[];
                url?: string;
                urls?: string[];
                Error?: string;
                error?: string;
                status?: string;
            }>(
                statusEndpoint,
                { id: requestId },
                { maxRetries: 1 } // Don't retry much within polling since we already have polling retries
            );

            // Handle multiple possible field names for images
            const images = result.images || result.image || result.url || result.urls;

            // Convert to array if single string
            const imageArray = images
                ? (Array.isArray(images) ? images : [images])
                : null;

            if (imageArray && imageArray.length > 0 && imageArray[0]) {
                console.log(`Nano Banana: Successfully received ${imageArray.length} image(s)`);
                return imageArray; // Success - return all images
            }

            if (result.Error || result.error) {
                throw new NanoBananaProGenerationError(result.Error || result.error || 'Unknown error');
            }

            // Check for failure status
            const failureStatuses = ['failed', 'error', 'failed_permanently', 'cancelled'];
            if (result.status && failureStatuses.includes(result.status.toLowerCase())) {
                throw new NanoBananaProGenerationError(`Image generation failed with status: ${result.status}`);
            }

            // If status is 'generating', 'pending', 'processing', or undefined, continue polling...
            console.log(`Nano Banana: Polling attempt ${attempt + 1}/${NANO_BANANA_MAX_POLLING_ATTEMPTS}, status: ${result.status || 'pending'}, response keys: ${Object.keys(result).join(', ')}`);

        } catch (error) {
            // Don't wrap our custom errors
            if (error instanceof NanoBananaProGenerationError || error instanceof NanoBananaProTimeoutError) {
                throw error;
            }

            // Distinguish between transient errors and definitive failures
            if (error instanceof SyntaxError || error instanceof TypeError) {
                console.warn(`Polling attempt ${attempt + 1} encountered a transient error. Retrying...`, error);
                if (attempt === NANO_BANANA_MAX_POLLING_ATTEMPTS - 1) {
                    throw new NanoBananaProTimeoutError(requestId, attempt + 1);
                }
                continue; // Retry on transient errors
            }
            // Re-throw other errors
            throw new NanoBananaProGenerationError(error instanceof Error ? error.message : String(error));
        }
    }
    throw new NanoBananaProTimeoutError(requestId, NANO_BANANA_MAX_POLLING_ATTEMPTS);
};

/**
 * Resume polling for a timed-out Nano Banana request.
 * @param requestId - The request ID to resume polling for
 * @param attemptsMade - Number of attempts already made (optional)
 * @param statusEndpoint - The status endpoint to use (defaults to nanoBananaProStatus)
 */
export const resumeNanoBananaPolling = async (
    requestId: string,
    attemptsMade: number = 0,
    statusEndpoint: string = Constance.endpoints.nanoBananaProStatus
): Promise<string[]> => {
    return pollForNanoBananaResult(requestId, attemptsMade, statusEndpoint);
};

// ============================================================================

/**
 * Detects the image format from base64-encoded data by examining the magic bytes.
 * @param base64 - Pure base64 string (without data URL prefix)
 * @returns The detected MIME type ('image/jpeg', 'image/png', or 'image/jpeg' as fallback)
 */
const detectImageFormat = (base64: string): string => {
    try {
        // Decode first few bytes to check magic bytes
        const binaryString = atob(base64.substring(0, 20));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
        if (bytes.length >= 8 &&
            bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            return 'image/png';
        }

        // Check JPEG signature: FF D8 FF
        if (bytes.length >= 3 &&
            bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            return 'image/jpeg';
        }

        // Default to JPEG if unable to detect
        console.warn('Unable to detect image format from magic bytes, defaulting to JPEG');
        return 'image/jpeg';
    } catch (error) {
        console.error('Error detecting image format:', error);
        return 'image/jpeg';
    }
};

/**
 * Validates that a base64 string contains a valid image header.
 * @param base64 - Pure base64 string (without data URL prefix)
 * @returns true if the header is valid, false otherwise
 */
const validateImageHeader = (base64: string): boolean => {
    try {
        const binaryString = atob(base64.substring(0, 20));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Valid PNG: 89 50 4E 47
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;

        // Valid JPEG: FF D8 FF
        const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;

        return isPng || isJpeg;
    } catch (error) {
        console.error('Error validating image header:', error);
        return false;
    }
};

/**
 * Fetches an image from a URL and converts it to a data URL
 * @param url - The URL to fetch the image from
 * @param mimeType - Optional mime type (defaults to 'image/jpeg')
 * @returns Data URL string
 */
const fetchImageAsDataUrl = async (url: string, mimeType: string = 'image/jpeg'): Promise<string> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image from URL: ${response.status}`);
        }

        const blob = await response.blob();

        // Use provided mime type or detect from blob
        const finalMimeType = blob.type || mimeType;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                resolve(dataUrl);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error fetching image from URL:', error);
        throw new Error(`Failed to fetch image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Normalizes the base64 response from external APIs.
 * Handles cases where the API might return a data URL or pure base64.
 * @param imageString - The image string from the API (could be data URL or pure base64)
 * @returns An object with pure base64 and detected MIME type
 */
const normalizeBase64Response = (imageString: string): { base64: string; mimeType: string } => {
    let base64: string;
    let mimeType: string;

    // Check if it's already a data URL
    if (imageString.startsWith('data:')) {
        const match = imageString.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
            base64 = match[2];
            mimeType = match[1];
        } else {
            // Malformed data URL - try to extract base64 part
            const parts = imageString.split(',');
            if (parts.length === 2) {
                const mimeMatch = parts[0].match(/data:([^;]+)/);
                base64 = parts[1];
                mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            } else {
                // Fallback
                base64 = imageString;
                mimeType = 'image/jpeg';
            }
        }
    } else {
        // It's pure base64 - detect the format
        base64 = imageString;
        mimeType = detectImageFormat(imageString);
    }

    // CRITICAL: Remove any whitespace from base64 string
    // Some APIs may return base64 with newlines or spaces which corrupt the decode
    base64 = base64.replace(/\s/g, '');

    return { base64, mimeType };
};

// A generic image generation function for models like gemini-2.5-flash-image
export const generateFigureImage = async (
    model: string,
    prompt: string,
    imageSources: Array<{ base64: string; mimeType: string; publicUrl?: string }>,
    options: {
        width?: number;
        height?: number;
        imageSizePreset?: string;
        aspectRatio?: string;
        num_images?: number;
        output_format?: string;
        resolution?: string;
    },
    useNanoBananaWebhook?: boolean
): Promise<string | string[]> => {

    if (imageSources.length === 0) {
        throw new Error("At least one image source must be provided.");
    }

    const requiresUpload = (model === Constance.models.image.nanoBanana && useNanoBananaWebhook) ||
        model === Constance.models.image.nanoBananaPro ||
        model === Constance.models.image.seedream ||
        model === Constance.models.image.flux ||
        model === Constance.models.image.qwen;

    if (requiresUpload) {
        // Use cached publicUrls if available, otherwise upload
        const publicUrls = await Promise.all(
            imageSources.map(async (source, index) => {
                if (source.publicUrl) {
                    return source.publicUrl; // Use cached URL
                }
                const dataUrl = `data:${source.mimeType};base64,${source.base64}`;
                return uploadImageFromDataUrl(dataUrl, `upload-${Date.now()}-${index}.jpg`);
            })
        );

        let endpoint: string;
        let payload: any;
        let returnsMultipleImages = false;

        if (model === Constance.models.image.nanoBananaPro) {
            // Nano Banana Pro uses async generation with polling (like video)
            payload = {
                prompt,
                num_images: options.num_images || 1,
                aspect_ratio: options.aspectRatio || 'auto',
                output_format: options.output_format || 'jpeg',
                resolution: options.resolution || '1K',
                image_urls: publicUrls,
            };
            endpoint = Constance.endpoints.image.nanoBananaPro;

            // Step 1: Initiate generation and get request_id
            const initialResult = await fetchViaWebhookProxy<{
                request_id?: string;
                Error?: string;
            }>(endpoint, payload);

            if (initialResult.Error) {
                throw new NanoBananaProGenerationError(initialResult.Error);
            }

            if (!initialResult.request_id) {
                throw new NanoBananaProGenerationError('API response did not contain a request_id.');
            }

            console.log(`Nano Banana Pro: Generation initiated, request_id: ${initialResult.request_id}`);

            // Step 2: Poll for results
            const imageUrls = await pollForNanoBananaResult(initialResult.request_id);

            // Return the image URLs directly (they're already public URLs)
            return imageUrls.length === 1 ? imageUrls[0] : imageUrls;
        }

        if (model === Constance.models.image.seedream) {
            if (publicUrls.length > 1) throw new Error(`${model} only supports one input image.`);

            // Determine image_size format based on preset
            let imageSize: string | { width: number; height: number };

            if (options.imageSizePreset && options.imageSizePreset.startsWith('auto')) {
                // For auto presets, send the specific preset value (auto, auto_2K, auto_4K)
                imageSize = options.imageSizePreset;
            } else if (options.width && options.height) {
                // For custom sizes (custom, custom_2K, custom_4K), send as object
                imageSize = {
                    width: options.width,
                    height: options.height
                };
            } else {
                // Fallback to auto
                imageSize = 'auto';
            }

            payload = {
                prompt,
                image_url: publicUrls[0],
                image_size: imageSize,
            };
            endpoint = Constance.endpoints.image.seedream;
        } else if (model === Constance.models.image.flux) {
            if (publicUrls.length > 1) throw new Error(`${model} only supports one input image.`);
            payload = {
                prompt,
                image_url: publicUrls[0],
            };
            // Only include aspect_ratio if it's not 'auto' (Flux doesn't support 'auto')
            if (options.aspectRatio && options.aspectRatio !== 'auto') {
                payload.aspect_ratio = options.aspectRatio;
            }
            endpoint = Constance.endpoints.image.flux;
        } else if (model === Constance.models.image.nanoBanana && useNanoBananaWebhook) {
            // Nano Banana webhook uses async generation with polling (like video)
            payload = {
                prompt,
                image_urls: publicUrls,
                aspect_ratio: options.aspectRatio || 'auto',
            };
            endpoint = Constance.endpoints.image.nanoBanana;

            // Step 1: Initiate generation and get request_id
            const initialResult = await fetchViaWebhookProxy<{
                request_id?: string;
                Error?: string;
            }>(endpoint, payload);

            if (initialResult.Error) {
                throw new NanoBananaProGenerationError(initialResult.Error);
            }

            if (!initialResult.request_id) {
                throw new NanoBananaProGenerationError('API response did not contain a request_id.');
            }

            console.log(`Nano Banana: Generation initiated, request_id: ${initialResult.request_id}`);

            // Step 2: Poll for results using the nanoBananaStatus endpoint
            const imageUrls = await pollForNanoBananaResult(initialResult.request_id, 0, Constance.endpoints.nanoBananaStatus);

            // Return the first image URL (nano-banana returns single image)
            return imageUrls[0];
        }

        if (model === Constance.models.image.qwen) {
            if (publicUrls.length > 1) throw new Error(`${model} only supports one input image.`);
            payload = {
                prompt,
                image_url: publicUrls[0],
                num_inference_steps: 30,
                guidance_scale: 4,
                num_images: 1,
                enable_safety_checker: false,
                output_format: 'png',
                negative_prompt: 'blurry, ugly',
                acceleration: 'regular',
            };
            endpoint = Constance.endpoints.image.qwen;
        } else {
            throw new Error(`Model ${model} requires an external API call, but no handler is implemented.`);
        }

        // Use webhook proxy to avoid CORS issues
        const result = await fetchViaWebhookProxy(endpoint, payload);

        // All external models are expected to return an 'images' array
        if (result && Array.isArray(result.images) && result.images.length > 0) {
            // Process all images (for nano-banana-pro) or just the first one (for other models)
            const imagesToProcess = returnsMultipleImages ? result.images : [result.images[0]];

            const processedImages = await Promise.all(imagesToProcess.map(async (imageString: string) => {
                if (typeof imageString !== 'string') {
                    throw new Error(`External API for ${model} returned invalid image data.`);
                }

                // Check if response is a URL (all external models now return URLs instead of base64)
                if (imageString.startsWith('http://') || imageString.startsWith('https://')) {
                    // Return the URL directly - no need to convert to base64
                    // This is more efficient (smaller memory footprint, faster) and the download service
                    // already handles URLs correctly, including MIME type detection
                    return imageString;
                }

                // Otherwise, handle as base64 (legacy support for base64 responses)
                const { base64, mimeType } = normalizeBase64Response(imageString);

                // Validate the image header to ensure it's not corrupted
                if (!validateImageHeader(base64)) {
                    console.error('Invalid image header detected from external API response');
                    throw new Error(`External API for ${model} returned an image with invalid or corrupted header. The file may be damaged.`);
                }

                // Return properly formatted data URL with correct MIME type
                return `data:${mimeType};base64,${base64}`;
            }));

            // Return array for nano-banana-pro, single image for others
            return returnsMultipleImages ? processedImages : processedImages[0];
        }

        throw new Error(`External API for ${model} did not return a valid 'images' array in the response.`);
    }

    // If we're here, it's a native Gemini call
    const imageModel = Constance.models.image.flash;

    const config: any = { responseModalities: [Modality.IMAGE, Modality.TEXT] };
    if (options.aspectRatio && options.aspectRatio !== 'auto') {
        config.imageConfig = { aspectRatio: options.aspectRatio };
    }

    const parts: any[] = [];
    imageSources.forEach(source => {
        parts.push({ inlineData: { data: source.base64, mimeType: source.mimeType } });
    });
    parts.push({ text: prompt });

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: imageModel,
        contents: { parts },
        config,
    });

    for (const part of response.candidates?.[0]?.content.parts ?? []) {
        if (part.inlineData) {
            const base64 = part.inlineData.data;
            const mimeType = part.inlineData.mimeType;

            // Validate the image header to ensure it's not corrupted
            if (!validateImageHeader(base64)) {
                console.error('Invalid image header detected from Gemini API response');
                throw new Error('Gemini API returned an image with invalid or corrupted header. Please try again.');
            }

            return `data:${mimeType};base64,${base64}`;
        }
    }

    // Handle cases where the model returns text instead of an image (e.g., safety rejection)
    if (response.text) {
        const error = new Error("The model returned a text response instead of an image. This may be due to a safety policy violation or an unclear prompt.");
        (error as any).modelText = response.text;
        throw error;
    }

    throw new Error('Image generation failed. The model did not return an image.');
};

// Function to translate text to English using Gemini
export const translateToEnglish = async (text: string): Promise<string> => {
    const systemInstruction = `You are an AI prompt assistant. Your task is to translate and refine the given text into a clear, effective prompt for an AI image generator. Return ONLY the final, refined prompt string, with no additional commentary, explanations, or introductory phrases.`;
    const response = await ai.models.generateContent({
        model: Constance.models.text.flash,
        contents: `The text to process is: "${text}"`,
        config: {
            systemInstruction
        }
    });
    return response.text;
};

// Function to enhance a single prompt
export const enhancePrompt = async (prompt: string): Promise<string> => {
    const userPrompt = `Enhance the following image prompt to be more vivid, descriptive, and effective for an AI image generator: "${prompt}"`;
    const response = await ai.models.generateContent({ model: Constance.models.text.flash, contents: userPrompt });
    return response.text;
};

// Function to generate a list of prompts based on an instruction
export const generatePromptList = async (instruction: string): Promise<string> => {
    const prompt = `Based on the instruction "${instruction}", generate a JSON array of strings, where each string is a unique, creative prompt for an AI image generator. The array should be valid JSON and contain a reasonable number of prompts (e.g., 5-10) unless specified otherwise.`;
    const response = await ai.models.generateContent({ model: Constance.models.text.flash, contents: prompt });
    // Extract JSON from markdown code block if present
    const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
    return jsonMatch ? jsonMatch[1] : response.text;
};

// Function to generate a variation of a given prompt
export const generatePromptVariation = async (prompt: string): Promise<string> => {
    const userPrompt = `Generate a single, creative variation of the following image prompt: "${prompt}"`;
    const response = await ai.models.generateContent({ model: Constance.models.text.flash, contents: userPrompt });
    return response.text;
};