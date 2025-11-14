/// <reference lib="dom" />
// This file was populated with functionality that was missing from the project.
// It includes several helper functions for interacting with the Gemini API
// for tasks required by the Image Studio, such as generating/enhancing prompts
// and generating images.

import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { ai } from './geminiClient';
import { Constance } from './endpoints';
import { uploadImageFromDataUrl } from './imageUploadService';

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
    imageSources: Array<{ base64: string; mimeType: string }>,
    options: { width?: number; height?: number; imageSizePreset?: string; aspectRatio?: string },
    useNanoBananaWebhook?: boolean
): Promise<string> => {
    
    if (imageSources.length === 0) {
        throw new Error("At least one image source must be provided.");
    }

    const requiresUpload = (model === Constance.models.image.nanoBanana && useNanoBananaWebhook) ||
                           model === Constance.models.image.seedream ||
                           model === Constance.models.image.flux ||
                           model === Constance.models.image.qwen;

    if (requiresUpload) {
        const publicUrls = await Promise.all(
            imageSources.map(async (source, index) => {
                const dataUrl = `data:${source.mimeType};base64,${source.base64}`;
                return uploadImageFromDataUrl(dataUrl, `upload-${Date.now()}-${index}.jpg`);
            })
        );
        
        let endpoint: string;
        let payload: any;

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
                aspect_ratio: options.aspectRatio,
            };
            endpoint = Constance.endpoints.image.flux;
        } else if (model === Constance.models.image.nanoBanana && useNanoBananaWebhook) {
            payload = {
                prompt,
                image_urls: publicUrls,
                aspect_ratio: options.aspectRatio || 'auto',
            };
            endpoint = Constance.endpoints.image.nanoBanana;
        } else if (model === Constance.models.image.qwen) {
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

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            let errorMsg = `Image generation failed with status ${response.status}.`;
            try {
                const errorBody = await response.json();
                errorMsg = errorBody.error || errorBody.message || errorMsg;
            } catch (e) {
                // response was not json
            }
            throw new Error(errorMsg);
        }

        const result = await response.json();

        // All external models (seedream, flux, nano-banana webhook) are expected to return an 'images' array
        if (result && Array.isArray(result.images) && result.images.length > 0 && typeof result.images[0] === 'string') {
            const imageString = result.images[0];

            // Normalize the response (handles both pure base64 and data URLs)
            const { base64, mimeType } = normalizeBase64Response(imageString);

            // Validate the image header to ensure it's not corrupted
            if (!validateImageHeader(base64)) {
                console.error('Invalid image header detected from external API response');
                throw new Error(`External API for ${model} returned an image with invalid or corrupted header. The file may be damaged.`);
            }

            // Return properly formatted data URL with correct MIME type
            return `data:${mimeType};base64,${base64}`;
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