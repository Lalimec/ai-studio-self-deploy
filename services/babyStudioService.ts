import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { BabyGenerationOptions, GeneratedBabyImage, BabyGender, AspectRatio } from '../types';
import { 
    BABY_AGES,
    BABY_COMPOSITIONS,
    BABY_BACKGROUNDS,
    BABY_CLOTHING_STYLES_UNISEX,
    BABY_CLOTHING_STYLES_BOY,
    BABY_CLOTHING_STYLES_GIRL,
    BABY_ACTIONS
} from '../constants';
import { processWithConcurrency } from './apiUtils';
import { ai, dataUrlToBlob } from './geminiClient';
import { ImageForVideoProcessing } from '../types';
import { Constance } from './endpoints';
import { generateFigureImage } from './geminiService';
import { uploadImageFromDataUrl } from './imageUploadService';

const imageModel = Constance.models.image.flash;
const textModel = Constance.models.text.flash;

type BabyGenerationTask = {
    description: string;
    prompt: string;
    filename: string;
};

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

type OptionKey = 'composition' | 'background' | 'clothing' | 'action';

// Generic function to get a pool of options, prioritizing custom user input.
function getOptionPool<T extends { id: string; name: string; prompt: string; }>(
    options: BabyGenerationOptions,
    key: OptionKey,
    allCategories: { name: string; options: T[] }[]
): T[] {
    const customKey = `custom${key.charAt(0).toUpperCase() + key.slice(1)}${key === 'background' ? 's' : ''}` as keyof BabyGenerationOptions;
    const useCustomKey = `useCustom${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof BabyGenerationOptions;

    const customItems = options[customKey] as string;
    const useCustom = options[useCustomKey] as boolean;

    // Use custom items if the mode is active and there's text
    if (useCustom && customItems && customItems.trim()) {
        return customItems
            .split(',')
            .map(s => s.trim())
            .filter(s => s)
            .map((s, i) => ({ id: `custom_${key}_${i}`, name: s, prompt: s } as T));
    }

    // Fallback to predefined categories
    const selectedCategoryNames = options[key] as string[];
    const allOptions = allCategories.flatMap(cat => cat.options);

    if (selectedCategoryNames.length === 0) {
        return allOptions; // If no categories selected, use all available
    }
    
    const selectedOptions = allCategories
        .filter(cat => selectedCategoryNames.includes(cat.name))
        .flatMap(cat => cat.options);
        
    return selectedOptions.length > 0 ? selectedOptions : allOptions;
}

const createBabyGenerationTasks = (
    options: BabyGenerationOptions,
    parent1Filename: string,
    parent2Filename: string,
    sessionId: string,
    timestamp: string
): BabyGenerationTask[] => {
    const { age, gender, imageCount } = options;

    const ageSelection = BABY_AGES.find(a => a.name === age) || BABY_AGES[Math.floor(Math.random() * BABY_AGES.length)];
    
    let allClothingCategories: { name: string; options: {id: string; name: string; prompt: string;}[]}[] = [];
    if (gender === BabyGender.Boy) {
        allClothingCategories = [...BABY_CLOTHING_STYLES_UNISEX, ...BABY_CLOTHING_STYLES_BOY];
    } else if (gender === BabyGender.Girl) {
        allClothingCategories = [...BABY_CLOTHING_STYLES_UNISEX, ...BABY_CLOTHING_STYLES_GIRL];
    } else { // Surprise Me
        allClothingCategories = [...BABY_CLOTHING_STYLES_UNISEX, ...BABY_CLOTHING_STYLES_BOY, ...BABY_CLOTHING_STYLES_GIRL];
    }

    const compositionPool = getOptionPool(options, 'composition', BABY_COMPOSITIONS);
    const backgroundPool = getOptionPool(options, 'background', BABY_BACKGROUNDS);
    const clothingPool = getOptionPool(options, 'clothing', allClothingCategories);
    const actionPool = getOptionPool(options, 'action', BABY_ACTIONS);

    const tasks: BabyGenerationTask[] = [];

    for (let i = 0; i < imageCount; i++) {
        const selectedComposition = compositionPool[Math.floor(Math.random() * compositionPool.length)];
        const selectedBackground = backgroundPool[Math.floor(Math.random() * backgroundPool.length)];
        const selectedClothing = clothingPool[Math.floor(Math.random() * clothingPool.length)];
        const selectedAction = actionPool[Math.floor(Math.random() * actionPool.length)];

        let genderPromptPart = '';
        if (gender === BabyGender.Boy) {
            genderPromptPart = `- **Child's Gender:** The child should be a baby boy.\n`;
        } else if (gender === BabyGender.Girl) {
            genderPromptPart = `- **Child's Gender:** The child should be a baby girl.\n`;
        }

        const description = `${gender !== BabyGender.SurpriseMe ? gender + ' ' : ''}${ageSelection.name} - ${selectedComposition.name}`;
        
        const prompt = `Analyze the facial features of the two adults in the provided images (Parent 1 and Parent 2). Generate a photorealistic image of their potential child.
${genderPromptPart}- **Child's Age:** The child should be ${ageSelection.prompt}.
- **Composition:** The scene should be a ${selectedComposition.prompt}.
- **Setting:** The photo is set ${selectedBackground.prompt}.
- **Attire & Action:** The child is ${selectedClothing.prompt} and is ${selectedAction.prompt}.
Ensure the resulting child's features are a plausible and natural blend of both parents. The final image should be a high-quality, professional photograph.`;

        const p1_base = parent1Filename.split('.').slice(0, -1).join('.') || 'parent1';
        const p1 = p1_base.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const p2_base = parent2Filename.split('.').slice(0, -1).join('.') || 'parent2';
        const p2 = p2_base.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const uniqueTimestamp = `${timestamp}_${i.toString().padStart(2, '0')}`;
        
        const genderId = gender.toLowerCase().replace(/\s/g, ''); // boy, girl, surpriseme
        const filename = `${sessionId}_baby_${p1}_${p2}_${genderId}_${ageSelection.id}_${selectedComposition.id}_${uniqueTimestamp}.jpg`;
        
        tasks.push({ description, prompt, filename });
    }
    
    return tasks;
};

export const generateBabyImage = async (
    imageSources: Array<{ base64: string; mimeType: string }>,
    prompt: string,
    aspectRatio: AspectRatio,
    useNanoBananaWebhook: boolean
): Promise<string> => {
    return generateFigureImage(
        Constance.models.image.nanoBanana,
        prompt,
        imageSources,
        { aspectRatio: aspectRatio !== 'auto' ? aspectRatio : undefined },
        useNanoBananaWebhook
    );
};

export const generateBabyImages = async (
  parent1DataUrl: string,
  parent2DataUrl: string,
  parent1File: File,
  parent2File: File,
  options: BabyGenerationOptions,
  sessionId: string,
  timestamp: string,
  useNanoBananaWebhook: boolean,
  onImageGenerated: (result: Omit<GeneratedBabyImage, 'videoPrompt' | 'isPreparing' | 'videoSrc' | 'isGeneratingVideo' | 'isRegenerating'>) => void,
  onError: (errorMessage: string) => void
): Promise<void> => {
  const tasks = createBabyGenerationTasks(options, parent1File.name, parent2File.name, sessionId, timestamp);

  if (tasks.length === 0) {
    throw new Error('Could not create any generation tasks. Please check your options.');
  }

  const imageSources = [dataUrlToBlob(parent1DataUrl), dataUrlToBlob(parent2DataUrl)];

  const processSingleTask = async (task: BabyGenerationTask) => {
    try {
      const imageUrl = await generateBabyImage(imageSources, task.prompt, options.aspectRatio, useNanoBananaWebhook);
      onImageGenerated({ 
        src: imageUrl,
        description: task.description,
        filename: task.filename,
        imageGenerationPrompt: task.prompt 
      });
    } catch (error) {
      console.error(`Failed to generate baby image for task "${task.description}":`, error);
      const formattedError = parseGenerationError(error as Error, { filename: task.filename });
      onError(formattedError);
    }
  };

  await processWithConcurrency(tasks, processSingleTask, 4);
};

export const generateVideoPromptForBabyImage = async (
  imageBlob: { base64: string, mimeType: string }
): Promise<string> => {
  const prompt = `Analyze the baby, their clothing, and the setting in this image. Create a short, descriptive video prompt (around 25-35 words) for an AI video generator. The camera should be 'stationary' or 'static'. Focus on the baby's subtle, natural movements, like a gentle kick, a soft coo, a change in expression, or looking around curiously. The style should be sweet and heartwarming. Example: 'A happy baby in a white onesie gently kicks their feet while lying on a soft blanket, looking up with curious eyes, camera remains stationary.'`;

  const response = await ai.models.generateContent({
    model: textModel,
    contents: {
      parts: [
        { inlineData: { data: imageBlob.base64, mimeType: imageBlob.mimeType } },
        { text: prompt },
      ]
    },
  });

  return response.text;
};

export const prepareBabyVideoPrompts = async (
  images: GeneratedBabyImage[],
  onProgress: (filename: string, prompt: string) => void,
  onError: (errorMessage: string) => void
): Promise<void> => {
  const processSingleTask = async (task: GeneratedBabyImage) => {
    try {
      const imageBlob = dataUrlToBlob(task.src);
      const videoPrompt = await generateVideoPromptForBabyImage(imageBlob);
      onProgress(task.filename, videoPrompt);
    } catch (error) {
      console.error(`Failed to generate video prompt for "${task.filename}":`, error);
      const formattedError = parseGenerationError(error as Error, { filename: task.filename });
      onError(formattedError);
    }
  };

  await processWithConcurrency(images, processSingleTask, 6);
};