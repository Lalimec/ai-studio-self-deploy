import { TimelinePairWithImages } from '../types';
import { processWithConcurrency } from './apiUtils';
import { ai, dataUrlToBlob } from './geminiClient';
import { Constance } from './endpoints';

const parseGenerationError = (error: Error, task: { filename: string }): string => {
  const prefix = `Failed on image ${task.filename}`;

  const jsonMatch = error.message.match(/{.*}/s);
  if (jsonMatch) {
    try {
      const errorJson = JSON.parse(jsonMatch[0]);
      const apiMessage = errorJson?.error?.message || 'An unknown API error occurred.';
      return `${prefix}: ${apiMessage.split('. For more information')[0]}`;
    } catch (e) {}
  }

  if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
    return `${prefix}: Your API key has exceeded its quota.`;
  }
  if (error.message.includes('SAFETY')) {
      return `${prefix}: Generation failed due to safety filters.`;
  }

  return `${prefix}. The model could not complete this request.`;
};


export const generateTimelineTransitionPrompt = async (
  startImageBlob: { base64: string, mimeType: string },
  endImageBlob: { base64: string, mimeType: string },
  userGuidance: string
): Promise<string> => {
  const guidanceText = userGuidance.trim();

  const baseInstruction = `Analyze the start image and the end image which represent the first and last frames of a short video. Write a concise, cinematic video prompt (around 25-35 words) for an AI video generator that describes a smooth transition from the start image to the end image.`;

  const guidanceInstruction = guidanceText 
    ? ` The prompt should adhere to this high-level instruction: "${guidanceText}".`
    : '';

  const prompt = `${baseInstruction}${guidanceInstruction}

The video MUST begin with the subject, pose, and expression from the start image. The prompt must describe the continuous motion, expression change, and any other transformations needed to naturally arrive at the state of the end image. The camera should almost always be described as 'stationary' or 'static' unless the user's guidance implies movement.

Generate ONLY the video prompt.`;

  const response = await ai.models.generateContent({
    model: Constance.models.text.flash,
    contents: {
      parts: [
        { text: "Start Image:" },
        { inlineData: { data: startImageBlob.base64, mimeType: startImageBlob.mimeType } },
        { text: "End Image:" },
        { inlineData: { data: endImageBlob.base64, mimeType: endImageBlob.mimeType } },
        { text: prompt },
      ]
    },
  });

  return response.text;
};

export const prepareAllTimelinePrompts = async (
  pairs: TimelinePairWithImages[],
  generalPrompt: string,
  onProgress: (pairId: string, prompt: string) => void,
  onError: (errorMessage: string) => void
): Promise<void> => {
  const processSingleTask = async (task: TimelinePairWithImages) => {
    try {
      const startImageBlob = dataUrlToBlob(task.startImage.src);
      const endImageBlob = dataUrlToBlob(task.endImage.src);
      const videoPrompt = await generateTimelineTransitionPrompt(startImageBlob, endImageBlob, generalPrompt);
      onProgress(task.id, videoPrompt);
    } catch (error) {
      console.error(`Failed to generate timeline prompt for pair starting with "${task.startImage.filename}":`, error);
      const formattedError = parseGenerationError(error as Error, { filename: task.startImage.filename });
      onError(formattedError);
    }
  };

  await processWithConcurrency(pairs, processSingleTask, 10);
};

// FIX: Added the missing `translateTextToEnglish` function.
export const translateTextToEnglish = async (text: string): Promise<string> => {
    const systemInstruction = `You are an AI prompt assistant. Your task is to translate the given text into English and refine it into a clear and effective prompt for an AI video generator that creates a smooth transition between two images. The prompt should describe the motion from a start frame to an end frame. Return ONLY the final, refined prompt string, with no additional commentary, explanations, or introductory phrases.`;
    const response = await ai.models.generateContent({
        model: Constance.models.text.flash,
        contents: `Text to translate: "${text}"`,
        config: {
            systemInstruction
        }
    });
    return response.text;
};

export const enhanceGeneralPrompt = async (text: string): Promise<string> => {
    const userPrompt = `Enhance the following high-level instruction for an AI video generator. The instruction should guide the creation of smooth transitions between a sequence of images, focusing on style, mood, or transition type. Example: "morph quickly" becomes "A rapid, seamless morphing transition with a subtle flash of light, blending the two scenes instantly." Return ONLY the enhanced instruction. The instruction to enhance is: "${text}"`;
    const response = await ai.models.generateContent({ model: Constance.models.text.flash, contents: userPrompt });
    return response.text;
};