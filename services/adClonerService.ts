import { GoogleGenAI, Modality, Type } from '@google/genai';
import { AdImageState, AdSubjectImageState, AdClonerSettings, AdClonerGenerationResult, AdClonerVariation } from '../types';
import { ai, dataUrlToBlob } from './geminiClient';
import { SYSTEM_PROMPT, RESPONSE_SCHEMA, variationPromptSchema } from '../prompts/adClonerSystemPrompt';


export const researchAdContext = async (
  adImageBlob: { base64: string, mimeType: string }
): Promise<string> => {
  const prompt = `Analyze this ad image to understand its context. What is the product, service, or topic being advertised? What is the overall theme and target audience? Provide a concise summary based on your analysis and web search.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: adImageBlob.base64, mimeType: adImageBlob.mimeType } },
        { text: prompt },
      ]
    },
    config: {
      tools: [{googleSearch: {}}],
    },
  });

  return response.text;
};

export const enhanceAdInstructions = async (instruction: string): Promise<string> => {
    const userPrompt = `You are an expert AI Ad concept writer. Enhance the following user instruction to be more creative, specific, and effective for generating a diverse set of ad variations. Focus on target audience, mood, and actionable changes. Example: "make it for young people" becomes "Adapt the ad for a Gen Z audience by incorporating vibrant, trendy colors, a more casual and authentic subject pose, and dynamic, social-media-style text overlays." Return ONLY the enhanced instruction. The instruction to enhance is: "${instruction}"`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: userPrompt });
    return response.text;
};

export const generateAdPrompts = async (
    options: {
        adImage: AdImageState;
        subjectImages: AdSubjectImageState[];
        researchContext: string;
        userInstructions: string;
        numVariations: number;
        textModel: AdClonerSettings['textModel'];
    }
): Promise<AdClonerGenerationResult> => {

    const { adImage, subjectImages, researchContext, userInstructions, numVariations, textModel: model } = options;
    if (!adImage.croppedSrc) {
        throw new Error("Ad image is required to generate prompts.");
    }
    const adBlob = dataUrlToBlob(adImage.croppedSrc);
    
    let userPrompt = `Generate a base prompt and ${numVariations} variations for the provided ad image${subjectImages.length > 0 ? ' and subject images' : ''}.`;
    if (researchContext) {
      userPrompt += `\n\nUse the following research context to inform the generation: "${researchContext}"`;
    }
    if (userInstructions) {
      userPrompt += `\n\nFollow these instructions: "${userInstructions}"`;
    }

    const parts: any[] = [
      { text: userPrompt },
      { inlineData: { data: adBlob.base64, mimeType: adBlob.mimeType } },
    ];
    subjectImages.forEach((img) => {
        if (img.croppedSrc) {
            const subjectBlob = dataUrlToBlob(img.croppedSrc);
            parts.push({ inlineData: { data: subjectBlob.base64, mimeType: subjectBlob.mimeType } });
        }
    });

    const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
        },
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AdClonerGenerationResult;
    } catch (e) {
        console.error("Failed to parse JSON response from generateAdPrompts:", response.text);
        throw new Error("The AI returned an invalid format for the ad concepts.");
    }
};

export const getNewAdVariations = async (options: {
    existingResult: AdClonerGenerationResult;
    researchContext: string;
    userInstructions: string;
    numVariations: number;
    textModel: AdClonerSettings['textModel'];
}): Promise<AdClonerVariation[]> => {
    const { existingResult, researchContext, userInstructions, numVariations, textModel: model } = options;

    let userPrompt = `Based on the provided base prompt and existing variations, generate ${numVariations} new, creative, and distinct variation(s).`;

    if (userInstructions) {
      userPrompt += `\n\nRemember to also adhere to the original top-level instructions: "${userInstructions}"`;
    }

    if (researchContext) {
        userPrompt += `\n\nAlso consider the original research context: "${researchContext}"`;
    }
    
    userPrompt += `
      \n\nExisting Data (for context and to avoid generating duplicates):
      ${JSON.stringify(existingResult, null, 2)}
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            variations: {
                type: Type.ARRAY,
                items: variationPromptSchema,
            },
        },
        required: ["variations"],
    };

    const systemInstruction = `You are an expert ad prompt generator. Your task is to generate new variation prompts based on existing data and user instructions. The output must be a single, valid JSON object with a 'variations' key containing an array of new variation objects that follow the provided schema. Do not repeat ideas from the existing data.`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: userPrompt }] },
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
        },
    });

    try {
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed.variations as AdClonerVariation[];
    } catch (e) {
        console.error("Error parsing JSON response for new variation:", response.text);
        throw new Error("Failed to parse the new variation from the AI.");
    }
};

export const generateAdVariationImage = async (options: {
    originalAdImage: AdImageState;
    subjectImages: AdSubjectImageState[];
    instructionalPrompt: string;
    imageModel: AdClonerSettings['imageModel'];
    aspectRatio: string | null;
}): Promise<string> => {
    const { originalAdImage, subjectImages, instructionalPrompt, imageModel: model, aspectRatio } = options;

    if (!originalAdImage.croppedSrc) {
        throw new Error("Original ad image is required.");
    }
    const adBlob = dataUrlToBlob(originalAdImage.croppedSrc);

    const parts: any[] = [
        { text: instructionalPrompt },
        { inlineData: { data: adBlob.base64, mimeType: adBlob.mimeType } },
    ];

    if (subjectImages.length > 0) {
        subjectImages.forEach((img) => {
            if (img.croppedSrc) {
                const subjectBlob = dataUrlToBlob(img.croppedSrc);
                parts.push({ inlineData: { data: subjectBlob.base64, mimeType: subjectBlob.mimeType } });
            }
        });
    }
    
    const config: any = {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    };
    if (aspectRatio) {
        config.imageConfig = { aspectRatio };
    }

    const response = await ai.models.generateContent({
        model, // 'gemini-2.5-flash-image'
        contents: { parts },
        config,
    });
    
    for (const part of response.candidates?.[0]?.content.parts ?? []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }

    throw new Error("Ad variation image generation failed. The model did not return an image.");
};

export const refineAdImage = async (options: {
    currentImageSrc: string;
    refineText: string;
    refineImageState: { file: File | null; src: string | null };
    aspectRatio: string | null;
}): Promise<string> => {
    const { currentImageSrc, refineText, refineImageState, aspectRatio } = options;

    const currentImageBlob = dataUrlToBlob(currentImageSrc);
    const parts: any[] = [
        { inlineData: { data: currentImageBlob.base64, mimeType: currentImageBlob.mimeType } },
        { text: refineText },
    ];
    
    if (refineImageState.src) {
        const refineImageBlob = dataUrlToBlob(refineImageState.src);
        parts.push({ inlineData: { data: refineImageBlob.base64, mimeType: refineImageBlob.mimeType } });
    }

    const config: any = {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    };
    if (aspectRatio) {
        config.imageConfig = { aspectRatio };
    }
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config,
    });

    for (const part of response.candidates?.[0]?.content.parts ?? []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }

    throw new Error("Image refinement failed. The model did not return an image.");
};