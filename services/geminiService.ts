// This file was populated with functionality that was missing from the project.
// It includes several helper functions for interacting with the Gemini API
// for tasks required by the Image Studio, such as generating/enhancing prompts
// and generating images.

import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { ai } from './geminiClient';

// A generic image generation function for models like gemini-2.5-flash-image
export const generateFigureImage = async (
    model: string,
    prompt: string,
    imageBase64: string,
    mimeType: string,
    options: { width?: number; height?: number; imageSizePreset?: string; aspectRatio?: string }
): Promise<string> => {
    // This is a generalized implementation for models that accept an image and a text prompt.
    // The specific model names used in the Image Studio ('nano-banana', 'seedream', etc.)
    // seem to map to underlying models or fine-tuned versions. We'll use the versatile
    // 'gemini-2.5-flash-image' which is suitable for this kind of image editing task.
    
    const imageModel = 'gemini-2.5-flash-image';

    const config: any = { responseModalities: [Modality.IMAGE, Modality.TEXT] };
    if (options.aspectRatio) {
        // Note: Not all image models may support this. This is an assumption based on common patterns.
        config.imageConfig = { aspectRatio: options.aspectRatio };
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: imageModel,
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType: mimeType } },
                { text: prompt },
            ],
        },
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
        model: 'gemini-2.5-flash', 
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
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: userPrompt });
    return response.text;
};

// Function to generate a list of prompts based on an instruction
export const generatePromptList = async (instruction: string): Promise<string> => {
    const prompt = `Based on the instruction "${instruction}", generate a JSON array of strings, where each string is a unique, creative prompt for an AI image generator. The array should be valid JSON and contain a reasonable number of prompts (e.g., 5-10) unless specified otherwise.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    // Extract JSON from markdown code block if present
    const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
    return jsonMatch ? jsonMatch[1] : response.text;
};

// Function to generate a variation of a given prompt
export const generatePromptVariation = async (prompt: string): Promise<string> => {
    const userPrompt = `Generate a single, creative variation of the following image prompt: "${prompt}"`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: userPrompt });
    return response.text;
};
