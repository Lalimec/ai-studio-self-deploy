import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { GenerationOptions, Gender, PoseStyle, Hairstyle, ColorOption, Beard, Accessory, AspectRatio, AdornmentOption, NanoBananaModel, NanoBananaResolution } from '../types';
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
import { Constance } from './endpoints';
import { generateFigureImage } from './geminiService';
import { uploadImageFromDataUrl } from './imageUploadService';

const imageModel = Constance.models.image.flash;

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
  imageSource: { base64: string; mimeType: string },
  task: Omit<GenerationTask, 'filename'>,
  options: { gender: Gender; aspectRatio: AspectRatio },
  useNanoBananaWebhook: boolean,
  model: NanoBananaModel = 'nano-banana',
  resolution: NanoBananaResolution = '1K'
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

  // Select the appropriate model based on the model and resolution settings
  const selectedModel = model === 'nano-banana-pro'
      ? Constance.models.image.nanoBananaPro
      : Constance.models.image.nanoBanana;

  const result = await generateFigureImage(
      selectedModel,
      promptText,
      [imageSource],
      {
          aspectRatio: options.aspectRatio !== 'auto' ? options.aspectRatio : undefined,
          resolution: model === 'nano-banana-pro' ? resolution : undefined
      },
      useNanoBananaWebhook
  );

  // generateFigureImage can return string or string[] - extract first image if array
  const imageUrl = Array.isArray(result) ? result[0] : result;

  return { imageUrl, promptText };
};

export const generateHairstyles = async (
  croppedImageDataUrl: string,
  options: GenerationOptions,
  originalFilename: string,
  timestamp: string,
  sessionId: string,
  useNanoBananaWebhook: boolean,
  model: NanoBananaModel = 'nano-banana',
  resolution: NanoBananaResolution = '1K',
  onImageGenerated: (result: { imageUrl: string; hairstyle: Hairstyle; color: string; filename: string, imageGenerationPrompt: string }) => void,
  onError: (errorMessage: string) => void,
  onTaskComplete: () => void
): Promise<void> => {
  const tasks = createGenerationTasks(options, originalFilename, sessionId, timestamp);
  
  if (tasks.length === 0) {
    if (options.keepOriginalHairstyle) {
        throw new Error('Please select an option to change, such as "Random Colors" or "Randomize Poses".');
    }
    throw new Error('No hairstyles found for the selected filters.');
  }

  const imageSource = dataUrlToBlob(croppedImageDataUrl);

  const processSingleTask = async (task: GenerationTask) => {
    try {
      const { imageUrl, promptText } = await generateSingleImage(imageSource, task, { gender: options.gender, aspectRatio: options.aspectRatio }, useNanoBananaWebhook, model, resolution);
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
  sessionId: string,
  useNanoBananaWebhook: boolean,
  model: NanoBananaModel = 'nano-banana',
  resolution: NanoBananaResolution = '1K'
): Promise<{ imageUrl: string; hairstyle: Hairstyle; color: string, filename: string, imageGenerationPrompt: string }> => {
  const [task] = createGenerationTasks({ ...options, imageCount: 1 }, originalFilename, sessionId, timestamp);

  if (!task) {
    throw new Error('Could not create a new generation task from the selected filters.');
  }

  const imageSource = dataUrlToBlob(croppedImageDataUrl);

  const { imageUrl, promptText } = await generateSingleImage(imageSource, task, { gender: options.gender, aspectRatio: options.aspectRatio }, useNanoBananaWebhook, model, resolution);
  return { imageUrl, hairstyle: task.hairstyle, color: task.color || 'original', filename: task.filename, imageGenerationPrompt: promptText };
};

/**
 * Generates a video prompt specifically for hair studio images.
 * Focuses on hair-related movements that showcase the hairstyle.
 * Compatible with the unified VideoPromptGenerator type.
 *
 * @param imageBlob - The image blob with base64 and mimeType
 * @param guidance - Optional high-level instruction (can be used to customize the prompt)
 * @returns A descriptive video prompt for hair animation
 */
export const generateHairVideoPrompt = async (
  imageBlob: { base64: string, mimeType: string },
  guidance?: string
): Promise<string> => {
  let prompt = `Analyze the person and their hairstyle in this image. Create a short, descriptive video prompt (around 25-35 words) for an AI video generator. The camera should be 'stationary' or 'static'.

Focus on subtle, natural movements that SHOWCASE THE HAIRSTYLE:
- Running fingers gently through the hair
- A light head turn or tilt to show different angles of the hairstyle
- Gentle hair flip or toss
- Wind softly blowing through the hair
- Tucking hair behind the ear
- Smoothing or adjusting the hairstyle
- Subtle head movement that makes the hair sway naturally

The movement should highlight the hair's texture, volume, and style. Keep the mood natural and elegant.`;

  if (guidance && guidance.trim()) {
    prompt += ` IMPORTANT: The prompt must also adhere to this high-level instruction: "${guidance}".`;
  }

  prompt += ` Example: 'A person gently runs their fingers through their flowing auburn hair while slightly tilting their head, soft natural light highlighting the hair's texture and color, camera stationary.'`;

  const response = await ai.models.generateContent({
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