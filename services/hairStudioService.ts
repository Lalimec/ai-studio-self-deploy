import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { GenerationOptions, Gender, PoseStyle, Hairstyle, ColorOption, Beard, Accessory, AspectRatio, AdornmentOption } from '../types';
import { 
    POSE_PROMPTS, 
    HAIR_COLORS, 
    BOLD_HAIR_COLORS,
    COMPLEX_NATURAL_HAIR_COLORS,
    MULTICOLOR_BOLD_HAIR_COLORS,
    MALE_BEARDS,
    FEMALE_ACCESSORIES,
    MALE_HAIRSTYLES,
    FEMALE_HAIRSTYLES,
    AVANT_GARDE_HAIRSTYLES
} from '../constants';
import { processWithConcurrency } from './apiUtils';
import { ai, dataUrlToBlob } from './geminiClient';

const imageModel = 'gemini-2.5-flash-image';

type GenerationTask = {
  hairstyle: Hairstyle;
  color: string | null;
  filename: string;
  posePrompt: string | null;
  adornmentPrompt: string | null;
};

const parseGenerationError = (error: Error, task: GenerationTask | { filename: string }): string => {
  const taskName = 'hairstyle' in task ? `"${task.hairstyle.name}" (${task.color || 'original'})` : `image ${task.filename}`;
  const prefix = `Failed on ${taskName}`;

  const jsonMatch = error.message.match(/{.*}/s);
  if (jsonMatch) {
    try {
      const errorJson = JSON.parse(jsonMatch[0]);
      const apiMessage = errorJson?.error?.message || 'An unknown API error occurred.';
      return `${prefix}: ${apiMessage.split('. For more information')[0]}`;
    } catch (e) {
      // JSON parsing failed, fall back to simpler checks
    }
  }

  if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
    return `${prefix}: Your API key has exceeded its quota.`;
  }
  if (error.message.includes('SAFETY')) {
      return `${prefix}: Generation failed due to safety filters.`;
  }

  return `${prefix}. The model could not complete this request.`;
};

const generateFilename = (
    originalFilename: string,
    gender: Gender,
    hairstyle: Hairstyle,
    color: string,
    sessionId: string,
    timestamp: string,
    extension: string = 'jpg'
) => {
    const baseFilename = originalFilename.split('.').slice(0, -1).join('.') || 'image';
    const sanitizedFilename = baseFilename.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60);
    const genderCode = gender.toLowerCase();
    const sanitizedHairstyleId = hairstyle.id.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedColor = color.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    
    return `${sessionId}_${sanitizedFilename}_${genderCode}_${sanitizedHairstyleId}_${sanitizedColor}_${timestamp}.${extension}`;
};

const createGenerationTasks = (
    options: GenerationOptions,
    originalFilename: string,
    sessionId: string,
    timestamp: string
): GenerationTask[] => {
  const { gender, imageCount, aspectRatio } = options;

  // 1. Hairstyle Pool
  let hairstylePool: Hairstyle[];
  if (options.keepOriginalHairstyle) {
      hairstylePool = [{ id: 'original', name: 'Original Hairstyle' }];
  } else if (options.useCustomHairstyles && options.customHairstyles.trim()) {
      hairstylePool = options.customHairstyles.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => ({ id: `custom_style_${i}`, name: s }));
  } else {
      const genderCategories = gender === Gender.Male ? MALE_HAIRSTYLES : FEMALE_HAIRSTYLES;
      const allAvailableCategories = [...genderCategories, AVANT_GARDE_HAIRSTYLES];
      
      if (options.hairstyleCategories.length === 0) {
        hairstylePool = allAvailableCategories.flatMap(c => c.styles);
      } else {
        hairstylePool = allAvailableCategories
          .filter(c => options.hairstyleCategories.includes(c.name))
          .flatMap(c => c.styles);
      }
  }
  if (hairstylePool.length === 0) hairstylePool.push({ id: 'original', name: 'Original Hairstyle' });
  
  // 2. Color Pool
  let colorPool: (string | null)[];
  if (options.useCustomHairColors && options.customHairColors.trim()) {
      colorPool = options.customHairColors.split(',').map(s => s.trim()).filter(Boolean);
  } else {
      colorPool = [];
      if (options.colorOptions.length === 0 || options.colorOptions.includes(ColorOption.Original)) colorPool.push(null);
      if (options.colorOptions.includes(ColorOption.Random)) colorPool.push(...HAIR_COLORS);
      if (options.colorOptions.includes(ColorOption.Bold)) colorPool.push(...BOLD_HAIR_COLORS);
      if (options.colorOptions.includes(ColorOption.ComplexNatural)) colorPool.push(...COMPLEX_NATURAL_HAIR_COLORS);
      if (options.colorOptions.includes(ColorOption.MulticolorBold)) colorPool.push(...MULTICOLOR_BOLD_HAIR_COLORS);
  }
  if (colorPool.length === 0) colorPool.push(null);

  // 3. Pose Pool
  let posePool: (string | null)[];
  if (options.useCustomPoses && options.customPoses.trim()) {
      posePool = options.customPoses.split(',').map(s => s.trim()).filter(Boolean);
  } else {
      posePool = [];
      if (options.poseOptions.includes(PoseStyle.Static)) posePool.push(null);
      if (options.poseOptions.includes(PoseStyle.Random)) posePool.push(...POSE_PROMPTS);
  }
  if(posePool.length === 0) posePool.push(null);

  // 4. Adornment Pool
  let adornmentPool: (string | null)[];
  if (options.useCustomAdornments && options.customAdornments.trim()) {
      adornmentPool = options.customAdornments.split(',').map(s => s.trim()).filter(Boolean);
  } else {
      adornmentPool = [];
      if (options.adornmentOptions.includes(AdornmentOption.Original)) adornmentPool.push(null);
      if (options.adornmentOptions.includes(AdornmentOption.Random)) {
          const adornments = gender === Gender.Male ? MALE_BEARDS : FEMALE_ACCESSORIES;
          adornmentPool.push(...adornments.filter(a => !a.id.endsWith('_none')).map(a => a.name));
      }
  }
  if(adornmentPool.length === 0) adornmentPool.push(null);


  // 5. Create Combinations
  const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  const tasks: GenerationTask[] = [];
  for (let i = 0; i < imageCount; i++) {
    const hairstyle = getRandomElement(hairstylePool);
    const color = getRandomElement(colorPool);
    const posePrompt = getRandomElement(posePool);
    const adornmentPrompt = getRandomElement(adornmentPool);
    
    const uniqueTimestamp = `${timestamp}_${i.toString().padStart(2, '0')}`;
    const filename = generateFilename(originalFilename, gender, hairstyle, color || 'original', sessionId, uniqueTimestamp);
    
    tasks.push({ hairstyle, color, posePrompt, adornmentPrompt, filename });
  }

  return tasks;
};

const generateSingleImage = async (
  croppedImageBlob: { base64: string; mimeType: string },
  task: Omit<GenerationTask, 'filename'>,
  options: { gender: Gender; aspectRatio: AspectRatio }
): Promise<{ imageUrl: string, promptText: string }> => {
  let promptText = '';
  const additionalInstructions: string[] = [];
  const { hairstyle, color, posePrompt, adornmentPrompt } = task;
  const hasHairstyleChange = hairstyle.id !== 'original';

  if (hasHairstyleChange) {
      promptText = `Apply a "${hairstyle.name}" hairstyle to the person in the image.`;
  }

  if (color) {
      if (hasHairstyleChange) {
          additionalInstructions.push(`Change the hair color to "${color}". If the original hairstyle name includes a color, ignore it and use "${color}" instead.`);
      } else {
          additionalInstructions.push(`Change ONLY the hair color to "${color}", keeping the original hairstyle, texture, and length exactly the same.`);
      }
  }

  if (adornmentPrompt) {
      if (options.gender === Gender.Male) {
          additionalInstructions.push(`Add a "${adornmentPrompt}" facial hairstyle. If the person already has facial hair, replace it with this new style.`);
      } else {
          additionalInstructions.push(`Add a "${adornmentPrompt}" accessory.`);
      }
  }
  
  if (posePrompt) {
      const commandPose = posePrompt.replace(/^Render a new portrait expression of them\s/, '');
      additionalInstructions.push(`Change their pose and expression to be ${commandPose}`);
  }

  if (additionalInstructions.length > 0) {
      const instructionString = additionalInstructions.join(' Also, ');
      if (promptText) {
          promptText += ` IMPORTANT: ${instructionString}.`;
      } else {
          promptText = `For the person in the image, ${instructionString}.`;
      }
  }

  if (!posePrompt) { // This implies a static pose is desired
      promptText += " It is crucial to preserve the exact same facial expression, head angle, pose, and lighting from the original photo. Only apply the specified changes. DO NOT CHANGE ANYTHING ELSE!!!";
  }

  if (!promptText.trim()) {
      promptText = 'Return the original image exactly as it is, without any changes or modifications.';
  }
  
  const config: any = {
    responseModalities: [Modality.IMAGE, Modality.TEXT],
  };

  if (options.aspectRatio && options.aspectRatio !== 'auto') {
      config.imageConfig = { aspectRatio: options.aspectRatio };
  }

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: imageModel,
    contents: {
      parts: [
        {
          inlineData: {
            data: croppedImageBlob.base64,
            mimeType: croppedImageBlob.mimeType,
          },
        },
        { text: promptText },
      ],
    },
    config,
  });

  for (const part of response.candidates?.[0]?.content.parts ?? []) {
    if (part.inlineData) {
      const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      return { imageUrl, promptText };
    }
  }

  throw new Error('Image generation failed. The model did not return an image.');
};

export const generateHairstyles = async (
  croppedImageDataUrl: string,
  options: GenerationOptions,
  originalFilename: string,
  timestamp: string,
  sessionId: string,
  onImageGenerated: (result: { imageUrl: string; hairstyle: Hairstyle; color: string; filename: string, imageGenerationPrompt: string }) => void,
  onError: (errorMessage: string) => void,
  onTaskComplete: () => void
): Promise<void> => {
  const croppedImageBlob = dataUrlToBlob(croppedImageDataUrl);
  const tasks = createGenerationTasks(options, originalFilename, sessionId, timestamp);
  
  if (tasks.length === 0) {
    if (options.keepOriginalHairstyle) {
        throw new Error('Please select an option to change, such as "Random Colors" or "Randomize Poses".');
    }
    throw new Error('No hairstyles found for the selected filters.');
  }

  const processSingleTask = async (task: GenerationTask) => {
    try {
      const { imageUrl, promptText } = await generateSingleImage(croppedImageBlob, task, { gender: options.gender, aspectRatio: options.aspectRatio });
      onImageGenerated({ imageUrl, hairstyle: task.hairstyle, color: task.color || 'original', filename: task.filename, imageGenerationPrompt: promptText });
    } catch (error) {
      console.error(`Failed to generate hairstyle "${task.hairstyle.name}" with color "${task.color}":`, error);
      const formattedError = parseGenerationError(error as Error, task);
      onError(formattedError);
    } finally {
        onTaskComplete();
    }
  };

  await processWithConcurrency(tasks, processSingleTask, 6);
};

export const regenerateSingleHairstyle = async (
  croppedImageDataUrl: string,
  options: GenerationOptions,
  originalFilename: string,
  timestamp: string,
  sessionId: string
): Promise<{ imageUrl: string; hairstyle: Hairstyle; color: string, filename: string, imageGenerationPrompt: string }> => {
  const croppedImageBlob = dataUrlToBlob(croppedImageDataUrl);
  const [task] = createGenerationTasks({ ...options, imageCount: 1 }, originalFilename, sessionId, timestamp);
  
  if (!task) {
    throw new Error('Could not create a new generation task from the selected filters.');
  }

  const { imageUrl, promptText } = await generateSingleImage(croppedImageBlob, task, { gender: options.gender, aspectRatio: options.aspectRatio });
  return { imageUrl, hairstyle: task.hairstyle, color: task.color || 'original', filename: task.filename, imageGenerationPrompt: promptText };
};