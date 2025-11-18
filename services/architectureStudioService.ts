import { ArchitectureGenerationOptions, AspectRatio, GeneratedArchitectureImage } from '../types';
import {
    ARCHITECTURE_SCOPES,
    INTERIOR_STYLES,
    EXTERIOR_STYLES,
    FACADE_STYLES,
    GARDEN_STYLES,
    LANDSCAPE_STYLES,
    ARCHITECTURE_TIMES,
    ARCHITECTURE_THEMES,
    CAMERA_ANGLE_OPTIONS
} from '../architectureConstants';
import { processWithConcurrency } from './apiUtils';
import { dataUrlToBlob } from './geminiClient';
import { Constance } from './endpoints';
import { generateFigureImage } from './geminiService';

const imageModel = Constance.models.image.nanoBanana;

type GenerationTask = {
  styleName: string;
  stylePrompt: string;
  timePrompt: string;
  themePrompt: string;
  cameraAnglePrompt: string;
  filename: string;
};

const parseGenerationError = (error: Error, task: GenerationTask | { filename: string }): string => {
  const taskName = 'styleName' in task ? `"${task.styleName}"` : `image ${task.filename}`;
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
    scope: string,
    styleName: string,
    timeName: string,
    themeName: string,
    sessionId: string,
    timestamp: string,
    extension: string = 'jpg'
) => {
    const baseFilename = originalFilename.split('.').slice(0, -1).join('.') || 'image';
    const sanitizedFilename = baseFilename.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const sanitizedScope = scope.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedStyle = styleName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const sanitizedTime = timeName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const sanitizedTheme = themeName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);

    return `${sessionId}_${sanitizedFilename}_${sanitizedScope}_${sanitizedStyle}_${sanitizedTime}_${sanitizedTheme}_${timestamp}.${extension}`;
};

const getStylesForScope = (scope: string) => {
  switch (scope) {
    case 'interior': return INTERIOR_STYLES;
    case 'exterior': return EXTERIOR_STYLES;
    case 'facade': return FACADE_STYLES;
    case 'garden': return GARDEN_STYLES;
    case 'landscape': return LANDSCAPE_STYLES;
    default: return INTERIOR_STYLES;
  }
};

const createGenerationTasks = (
    options: ArchitectureGenerationOptions,
    originalFilename: string,
    sessionId: string,
    timestamp: string
): GenerationTask[] => {
  const { scope, styles, customStyles, useCustomStyles, time, theme, cameraAngle, imageCount } = options;

  // 1. Style Pool (scope-specific)
  let stylePool: { name: string; prompt: string }[];
  if (useCustomStyles && customStyles.trim()) {
      stylePool = customStyles.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => ({ name: s, prompt: s }));
  } else {
      const availableStyles = getStylesForScope(scope);
      if (styles.length === 0) {
        // If no styles selected, use all styles for this scope
        stylePool = availableStyles.map(s => ({ name: s.name, prompt: s.prompt }));
      } else {
        // Use selected styles
        stylePool = availableStyles
          .filter(s => styles.includes(s.id))
          .map(s => ({ name: s.name, prompt: s.prompt }));
      }
  }
  if (stylePool.length === 0) stylePool.push({ name: 'Current Style', prompt: '' });

  // 2. Time prompt
  const timeData = ARCHITECTURE_TIMES.find(t => t.id === time);
  const timePrompt = timeData?.prompt || '';
  const timeName = timeData?.name || 'Current';

  // 3. Theme prompt
  const themeData = ARCHITECTURE_THEMES.find(t => t.id === theme);
  const themePrompt = themeData?.prompt || '';
  const themeName = themeData?.name || 'None';

  // 4. Camera angle prompt
  const cameraData = CAMERA_ANGLE_OPTIONS.find(c => c.id === cameraAngle);
  const cameraAnglePrompt = cameraData?.prompt || '';

  // 5. Create Combinations
  const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const tasks: GenerationTask[] = [];
  for (let i = 0; i < imageCount; i++) {
    const style = getRandomElement(stylePool);

    const uniqueTimestamp = `${timestamp}_${i.toString().padStart(2, '0')}`;
    const filename = generateFilename(
      originalFilename,
      scope,
      style.name,
      timeName,
      themeName,
      sessionId,
      uniqueTimestamp
    );

    tasks.push({
      styleName: style.name,
      stylePrompt: style.prompt,
      timePrompt,
      themePrompt,
      cameraAnglePrompt,
      filename
    });
  }

  return tasks;
};

const generateSingleImage = async (
  imageSource: { base64: string; mimeType: string },
  task: Omit<GenerationTask, 'filename'>,
  options: { aspectRatio: AspectRatio },
  useNanoBananaWebhook: boolean
): Promise<{ imageUrl: string, promptText: string }> => {
  const { styleName, stylePrompt, timePrompt, themePrompt, cameraAnglePrompt } = task;

  let promptText = '';
  const components: string[] = [];

  // Build the transformation prompt
  if (stylePrompt) {
    components.push(stylePrompt);
  } else {
    // No style transformation, keep current
    components.push('Maintain the current architectural style and design elements exactly as shown');
  }

  // Add time of day if specified
  if (timePrompt) {
    components.push(timePrompt);
  }

  // Add theme if specified
  if (themePrompt) {
    components.push(themePrompt);
  }

  // Add camera angle instruction if specified
  if (cameraAnglePrompt) {
    components.push(cameraAnglePrompt);
  }

  // Assemble the full prompt
  if (components.length > 0) {
    promptText = `Transform this architectural scene to have ${components.join(', ')}. `;
    promptText += 'Maintain photorealistic quality and architectural accuracy. ';
    promptText += 'Preserve the overall spatial layout and structural proportions. ';
    promptText += 'Ensure all architectural elements are harmonious and professionally designed. ';

    // Add camera angle preservation note if not randomizing
    if (!cameraAnglePrompt) {
      promptText += 'Preserve the exact camera angle, framing, and perspective from the original image. ';
    }
  } else {
    promptText = 'Return the original architectural image exactly as it is, without any changes or modifications.';
  }

  const imageUrl = await generateFigureImage(
      Constance.models.image.nanoBanana,
      promptText,
      [imageSource],
      { aspectRatio: options.aspectRatio !== 'auto' ? options.aspectRatio : undefined },
      useNanoBananaWebhook
  );

  return { imageUrl, promptText };
};

export const generateArchitecturalStyles = async (
  croppedImageDataUrl: string,
  options: ArchitectureGenerationOptions,
  originalFilename: string,
  timestamp: string,
  sessionId: string,
  useNanoBananaWebhook: boolean,
  onImageGenerated: (result: {
    imageUrl: string;
    style: string;
    time: string;
    theme: string;
    filename: string;
    imageGenerationPrompt: string;
  }) => void,
  onError: (errorMessage: string) => void,
  onTaskComplete: () => void
): Promise<void> => {
  const tasks = createGenerationTasks(options, originalFilename, sessionId, timestamp);

  if (tasks.length === 0) {
    throw new Error('No styles selected for generation.');
  }

  const imageSource = dataUrlToBlob(croppedImageDataUrl);

  const processSingleTask = async (task: GenerationTask) => {
    try {
      const { imageUrl, promptText } = await generateSingleImage(
        imageSource,
        task,
        { aspectRatio: options.aspectRatio },
        useNanoBananaWebhook
      );

      // Get time and theme names for display
      const timeData = ARCHITECTURE_TIMES.find(t => t.prompt === task.timePrompt);
      const themeData = ARCHITECTURE_THEMES.find(t => t.prompt === task.themePrompt);

      onImageGenerated({
        imageUrl,
        style: task.styleName,
        time: timeData?.name || 'Current',
        theme: themeData?.name || 'None',
        filename: task.filename,
        imageGenerationPrompt: promptText
      });
    } catch (error) {
      console.error(`Failed to generate architectural style "${task.styleName}":`, error);
      const formattedError = parseGenerationError(error as Error, task);
      onError(formattedError);
    } finally {
        onTaskComplete();
    }
  };

  await processWithConcurrency(tasks, processSingleTask, 6);
};

export const regenerateSingleArchitecturalStyle = async (
  croppedImageDataUrl: string,
  options: ArchitectureGenerationOptions,
  originalFilename: string,
  timestamp: string,
  sessionId: string,
  useNanoBananaWebhook: boolean
): Promise<{
  imageUrl: string;
  style: string;
  time: string;
  theme: string;
  filename: string;
  imageGenerationPrompt: string;
}> => {
  const [task] = createGenerationTasks({ ...options, imageCount: 1 }, originalFilename, sessionId, timestamp);

  if (!task) {
    throw new Error('Could not create a new generation task from the selected filters.');
  }

  const imageSource = dataUrlToBlob(croppedImageDataUrl);

  const { imageUrl, promptText } = await generateSingleImage(
    imageSource,
    task,
    { aspectRatio: options.aspectRatio },
    useNanoBananaWebhook
  );

  // Get time and theme names for display
  const timeData = ARCHITECTURE_TIMES.find(t => t.prompt === task.timePrompt);
  const themeData = ARCHITECTURE_THEMES.find(t => t.prompt === task.themePrompt);

  return {
    imageUrl,
    style: task.styleName,
    time: timeData?.name || 'Current',
    theme: themeData?.name || 'None',
    filename: task.filename,
    imageGenerationPrompt: promptText
  };
};
