/// <reference lib="dom" />
// This file was populated with functionality that was missing from the project.
// It includes several helper functions for interacting with the Gemini API
// for tasks required by the Image Studio, such as generating/enhancing prompts
// and generating images.

import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { ai } from './geminiClient';
import { Constance } from './endpoints';
import { uploadImageFromDataUrl } from './imageUploadService';

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
                           model === Constance.models.image.flux;

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
            payload = {
                prompt,
                image_url: publicUrls[0],
                width: options.width,
                height: options.height,
                image_size: options.imageSizePreset,
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
            const base64String = result.images[0];
            return `data:image/jpeg;base64,${base64String}`;
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
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
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