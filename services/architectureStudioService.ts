import { ArchitectureGenerationOptions, AspectRatio, GeneratedArchitectureImage, NanoBananaModel, NanoBananaResolution } from '../types';
import {
    ARCHITECTURE_SCOPES,
    INTERIOR_STYLES,
    EXTERIOR_STYLES,
    FACADE_STYLES,
    GARDEN_STYLES,
    LANDSCAPE_STYLES,
    ARCHITECTURE_TIMES,
    ARCHITECTURE_THEMES,
    CAMERA_ANGLE_OPTIONS,
    ROOM_TYPES,
    BUILDING_TYPES,
    COLOR_SCHEMES,
    TIDY_OPTIONS
} from '../architectureConstants';
import { processWithConcurrency } from './apiUtils';
import { dataUrlToBlob } from './geminiClient';
import { Constance } from './endpoints';
import { generateFigureImage } from './geminiService';
import { uploadImageFromDataUrl } from './imageUploadService';

type GenerationTask = {
  styleName: string;
  stylePrompt: string;
  roomTypePrompt: string;
  buildingTypePrompt: string;
  colorSchemePrompt: string;
  tidyPrompt: string;
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
  const { scope, styles, customStyles, useCustomStyles, time, theme, cameraAngle, imageCount, styleSelectionMode } = options;

  // 1. Style Pool (scope-specific)
  let stylePool: { name: string; prompt: string }[];
  if (useCustomStyles && customStyles.trim()) {
      stylePool = customStyles.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => ({ name: s, prompt: s }));
  } else {
      const availableStyles = getStylesForScope(scope);
      if (styleSelectionMode === 'random') {
        // Random mode: use all styles for this scope
        stylePool = availableStyles.map(s => ({ name: s.name, prompt: s.prompt }));
      } else {
        // Selected mode: use only selected styles
        // Note: validation in hook ensures styles.length > 0 in selected mode
        stylePool = availableStyles
          .filter(s => styles.includes(s.id))
          .map(s => ({ name: s.name, prompt: s.prompt }));
      }
  }

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

  // 5. Room type prompt (for interior)
  const roomTypeData = ROOM_TYPES.find(r => r.id === options.roomType);
  const roomTypePrompt = roomTypeData?.prompt || '';

  // 6. Building type prompt (for exterior/facade/garden/landscape)
  const buildingTypeData = BUILDING_TYPES.find(b => b.id === options.buildingType);
  const buildingTypePrompt = buildingTypeData?.prompt || '';

  // 7. Color scheme prompt
  const colorSchemeData = COLOR_SCHEMES.find(c => c.id === options.colorScheme);
  const colorSchemePrompt = colorSchemeData?.prompt || '';

  // 8. Tidy prompt
  const tidyData = TIDY_OPTIONS.find(t => t.id === options.tidy);
  const tidyPrompt = tidyData?.prompt || '';

  // 9. Create Combinations
  const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const tasks: GenerationTask[] = [];

  if (styleSelectionMode === 'selected') {
    // Selected mode: generate imageCount images for each selected style
    let taskIndex = 0;
    for (const style of stylePool) {
      for (let i = 0; i < imageCount; i++) {
        const uniqueTimestamp = `${timestamp}_${taskIndex.toString().padStart(2, '0')}`;
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
          roomTypePrompt,
          buildingTypePrompt,
          colorSchemePrompt,
          tidyPrompt,
          timePrompt,
          themePrompt,
          cameraAnglePrompt,
          filename
        });
        taskIndex++;
      }
    }
  } else {
    // Random mode: generate imageCount total images, randomly selecting styles
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
        roomTypePrompt,
        buildingTypePrompt,
        colorSchemePrompt,
        tidyPrompt,
        timePrompt,
        themePrompt,
        cameraAnglePrompt,
        filename
      });
    }
  }

  return tasks;
};

const generateSingleImage = async (
  imageSource: { base64: string; mimeType: string },
  task: Omit<GenerationTask, 'filename'>,
  options: { aspectRatio: AspectRatio },
  useNanoBananaWebhook: boolean,
  model: NanoBananaModel = 'nano-banana',
  resolution: NanoBananaResolution = '1K'
): Promise<{ imageUrl: string, promptText: string }> => {
  const {
    styleName,
    stylePrompt,
    roomTypePrompt,
    buildingTypePrompt,
    colorSchemePrompt,
    tidyPrompt,
    timePrompt,
    themePrompt,
    cameraAnglePrompt
  } = task;

  let promptText = '';
  const components: string[] = [];

  // 1. Room/Building type (what is the space)
  if (roomTypePrompt) {
    components.push(roomTypePrompt);
  } else if (buildingTypePrompt) {
    components.push(buildingTypePrompt);
  }

  // 2. Style transformation
  if (stylePrompt) {
    components.push(stylePrompt);
  } else {
    // No style transformation, keep current
    components.push('Maintain the current architectural style and design elements exactly as shown');
  }

  // 3. Tidy/untidy state
  if (tidyPrompt) {
    components.push(tidyPrompt);
  }

  // 4. Color scheme (only if specified)
  if (colorSchemePrompt) {
    components.push(colorSchemePrompt);
  }

  // 5. Time of day (if specified)
  if (timePrompt) {
    components.push(timePrompt);
  }

  // 6. Theme (if specified)
  if (themePrompt) {
    components.push(themePrompt);
  }

  // 7. Camera angle instruction (if specified)
  if (cameraAnglePrompt) {
    components.push(cameraAnglePrompt);
  }

  // Assemble the full prompt
  if (components.length > 0) {
    promptText = `Transform and completely renovate this architectural scene to have ${components.join(', ')}. `;
    promptText += 'Maintain photorealistic quality and architectural accuracy. ';
    promptText += 'CRITICAL RENOVATION REQUIREMENTS: ';
    promptText += 'TRANSFORM COMPLETELY (apply new style to ALL surfaces): ';
    promptText += '- Ceilings: Apply new finishes, materials, and style (even if currently unfinished with exposed beams/structure) ';
    promptText += '- Walls: Apply new colors, finishes, materials, and textures throughout ';
    promptText += '- Floors: Apply new flooring materials and finishes completely ';
    promptText += '- All surfaces, materials, colors, and finishes must match the new style ';
    promptText += 'PRESERVE ONLY (keep structural positions): ';
    promptText += '- Exact locations and positions of doors, windows, columns, archways, and architectural openings ';
    promptText += '- Overall spatial layout, room dimensions, and structural proportions ';
    promptText += '- Do NOT move or relocate structural elements, but DO apply new finishes to them ';
    promptText += 'This is a COMPLETE renovation - transform all surfaces while maintaining the structural skeleton. ';

    // Add EXTREMELY strong tidiness emphasis if specified - MUST be aggressive
    if (tidyPrompt) {
      promptText += 'MANDATORY TIDINESS REQUIREMENT: The space MUST be completely clean, organized, and uncluttered. ';
      promptText += 'REMOVE ALL of the following: ';
      promptText += '- ALL items scattered on floors (shoes, bags, boxes, papers, toys, clothing, books, etc.) ';
      promptText += '- ALL items scattered on surfaces (tables, counters, desks, shelves - clear them completely) ';
      promptText += '- ALL clutter on walls (remove excess decorations, posters, random items) ';
      promptText += '- ALL visible mess, debris, trash, or disorganized objects ';
      promptText += '- ALL piles of items or stacks of objects that create visual clutter ';
      promptText += 'The result must show pristine, magazine-quality cleanliness with only intentional, well-placed decorative items remaining. ';
      promptText += 'Surfaces should be clear and clean. Floors should be completely empty and clean. ';
      promptText += 'This tidiness requirement overrides aesthetic preferences - cleanliness is MANDATORY. ';
    }

    promptText += 'Ensure all architectural elements are harmonious and professionally designed. ';

    // Add camera angle preservation note if not randomizing
    if (!cameraAnglePrompt) {
      promptText += 'Preserve the exact camera angle, framing, and perspective from the original image. ';
    }
  } else {
    promptText = 'Return the original architectural image exactly as it is, without any changes or modifications.';
  }

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

export const generateArchitecturalStyles = async (
  croppedImageDataUrl: string,
  options: ArchitectureGenerationOptions,
  originalFilename: string,
  timestamp: string,
  sessionId: string,
  useNanoBananaWebhook: boolean,
  model: NanoBananaModel = 'nano-banana',
  resolution: NanoBananaResolution = '1K',
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
        useNanoBananaWebhook,
        model,
        resolution
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
  useNanoBananaWebhook: boolean,
  model: NanoBananaModel = 'nano-banana',
  resolution: NanoBananaResolution = '1K'
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
    useNanoBananaWebhook,
    model,
    resolution
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

/**
 * Generates a depth map for a single architecture image
 * @param imageSrc - The source data URL of the image
 * @param publicUrl - Optional cached public URL to avoid re-uploading
 * @returns The depth map image as a data URL
 */
export const generateDepthMap = async (
  imageSrc: string,
  publicUrl?: string
): Promise<string> => {
  try {
    // Upload image if we don't have a cached public URL
    let imageUrl = publicUrl;
    if (!imageUrl) {
      imageUrl = await uploadImageFromDataUrl(imageSrc);
    }

    // Call depth map endpoint
    const payload = {
      image_url: imageUrl,
      num_inference_steps: 5,
      ensemble_size: 5,
    };

    const response = await fetch(Constance.endpoints.image.depthMap, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMsg = `Depth map generation failed with status ${response.status}.`;
      try {
        const errorBody = await response.json();
        errorMsg = errorBody.error || errorBody.message || errorMsg;
      } catch (e) {
        // response was not json
      }
      throw new Error(errorMsg);
    }

    const result = await response.json();

    // Extract depth map from response (same pattern as Flux/Seedream)
    if (result && Array.isArray(result.images) && result.images.length > 0 && typeof result.images[0] === 'string') {
      const imageString = result.images[0];

      // Check if response is a URL (depth map now returns URLs instead of base64)
      if (imageString.startsWith('http://') || imageString.startsWith('https://')) {
        // Fetch the image and convert to data URL
        const response = await fetch(imageString);
        if (!response.ok) {
          throw new Error(`Failed to fetch depth map from URL: ${response.status}`);
        }

        const blob = await response.blob();
        const finalMimeType = blob.type || 'image/png';

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Check if it's already a data URL (legacy support)
      if (imageString.startsWith('data:')) {
        return imageString;
      }

      // Otherwise assume it's base64 and add the data URL prefix (legacy support)
      return `data:image/png;base64,${imageString}`;
    }

    throw new Error('Depth map endpoint did not return a valid images array.');
  } catch (error) {
    console.error('Depth map generation error:', error);
    throw error;
  }
};

/**
 * Generates a transformed version of an architectural image
 * Preserves the original layout, furnishings, and lighting while changing tidiness/furnishing state
 * @param sourceImageDataUrl - The source image data URL
 * @param transformationType - Type of transformation (tidy, unfurnished, livedIn)
 * @param aspectRatio - Aspect ratio for generation
 * @param useNanoBananaWebhook - Whether to use webhook or native Gemini
 * @param sessionId - Session ID for filename generation
 * @param originalFilename - Original filename for the base image
 * @returns Object with imageUrl and promptText
 */
export const generateImageTransformation = async (
  sourceImageDataUrl: string,
  transformationType: 'tidy' | 'unfurnished' | 'livedIn',
  aspectRatio: AspectRatio,
  useNanoBananaWebhook: boolean,
  sessionId: string,
  originalFilename: string = 'image',
  model: NanoBananaModel = 'nano-banana',
  resolution: NanoBananaResolution = '1K'
): Promise<{ imageUrl: string; promptText: string; filename: string }> => {
  const imageSource = dataUrlToBlob(sourceImageDataUrl);

  // Build transformation-specific prompt
  let transformationPrompt = '';
  let transformationLabel = '';

  switch (transformationType) {
    case 'tidy':
      transformationLabel = 'tidy';
      transformationPrompt = `Transform this architectural space to be completely clean, organized, and uncluttered. MAXIMUM CLEANLINESS REQUIRED.

CRITICAL REQUIREMENTS - REMOVE EVERYTHING LISTED:
✗ FLOORS: Remove ALL items from floors - shoes, bags, boxes, papers, toys, clothing, books, cables, packaging, debris, dirt, stains
✗ SURFACES: Clear surfaces of clutter - remove piles, stacks, scattered items. Single intentional objects (one coffee mug, one book, one vase) can stay if neatly placed, but remove all excessive items and clutter
✗ BEDS: Make beds perfectly - smooth sheets, arranged pillows, tucked blankets, hotel-quality presentation
✗ WALLS & CEILINGS: Remove ALL posters, stickers, sticky notes, papers, tape marks, temporary decorations, hanging items, string lights, flags, banners. Only permanent art, framed pictures, or architectural features should remain
✗ CLUTTER: Remove ALL piles, stacks, random objects, packaging materials, scattered items anywhere in the space
✗ TRASH: Remove ALL waste baskets contents, debris, packaging, wrappers, recyclables
✗ PERSONAL ITEMS: Remove scattered personal belongings - clothing on furniture, bags on floor, shoes everywhere. Leave only intentional decor

WHAT CAN STAY (if neat and intentional):
✓ Single decorative objects on surfaces (one vase, one lamp, one book)
✓ Permanent wall-mounted art or framed pictures
✓ Built-in shelving with minimal organized items
✓ Essential functional items if neatly placed (alarm clock on nightstand, soap dispenser in bathroom)

CLEAN STATE REQUIREMENTS:
✓ Floors: Completely empty, clean, spotless
✓ Surfaces: Clear or very minimally decorated (maximum 1-2 intentional items per surface)
✓ Walls & Ceilings: Clean, no temporary decorations or stickers, only permanent fixtures or framed art
✓ Furniture: In place, clean, organized
✓ Beds: Perfectly made with smooth linens
✓ Overall: Magazine-quality, professionally staged appearance

PRESERVE EXACTLY:
- Spatial layout and room structure
- Major furniture in exact positions
- Architectural elements (doors, windows, fixtures)
- Lighting and time of day

This is a TIDYING transformation, not a redesign. Show the SAME room after professional cleaning and staging. The result should be pristine, spotless, and perfectly organized.`;
      break;

    case 'unfurnished':
      transformationLabel = 'unfurnished';
      transformationPrompt = `Transform this architectural space to an unfinished, unfurnished, under-construction state.

CRITICAL REQUIREMENTS:
- Show bare walls without paint or wallpaper (exposed drywall or plaster)
- Remove or minimize furniture (empty or near-empty space)
- Show exposed subflooring or unfinished floor surfaces
- Include construction elements: drop cloths, sawdust, construction materials
- Show incomplete finishes and work-in-progress state
- Provide a before-renovation or under-construction appearance
- May show exposed wiring, unfinished trim, construction equipment

PRESERVE EXACTLY - THESE MUST REMAIN IN EXACT SAME POSITIONS:
- The exact spatial layout and room dimensions
- ALL doors in their exact locations (just unfinished/unpainted, but structurally complete)
- ALL windows in their exact locations and sizes (just without trim or finished frames)
- ALL doorways, door frames, and window openings in exact positions
- The ceiling height and structure
- The architectural proportions and room shape
- The camera angle and perspective
- The overall building structure and all wall positions
- Any built-in architectural features (alcoves, columns, beams)

IMPORTANT: Doors and windows should be present in the same locations as the original image, just appearing unfinished (no paint, trim, or final finishes). Do not remove or relocate any structural openings.

This is a before/during construction transformation showing the raw, unfinished state of the space while maintaining all structural openings and architectural elements.`;
      break;

    case 'livedIn':
      transformationLabel = 'lived_in';
      transformationPrompt = `Transform this architectural space to show everyday living with realistic daily clutter and use.
CRITICAL REQUIREMENTS:
- ADD personal items scattered naturally (books, magazines, remote controls, throw blankets)
- ADD some clutter on surfaces (coffee table items, kitchen counter items, bathroom counter items)
- ADD signs of daily life (shoes by door, bags on furniture, clothing draped casually)
- ADD lived-in details (rumpled cushions, slightly disheveled bed, everyday items out)
- Show realistic human occupation and daily use
- The space should feel warm, lived-in, and currently inhabited
- Balance between "messy" and "realistic everyday living"

PRESERVE EXACTLY:
- The exact spatial layout and room structure
- All major furniture pieces in their exact positions
- All architectural elements in exact locations
- The lighting conditions and time of day

This is a lived-in transformation showing realistic daily use. Add clutter and signs of life while maintaining the architectural structure.`;
      break;
  }

  const fullPrompt = `${transformationPrompt}

Maintain photorealistic quality and architectural accuracy. Ensure all architectural elements are harmonious and professionally designed.`;

  // Generate the transformed image using the existing pipeline
  const selectedModel = model === 'nano-banana-pro'
    ? Constance.models.image.nanoBananaPro
    : Constance.models.image.nanoBanana;

  const result = await generateFigureImage(
    selectedModel,
    fullPrompt,
    [imageSource],
    {
      aspectRatio: aspectRatio !== 'auto' ? aspectRatio : undefined,
      resolution: model === 'nano-banana-pro' ? resolution : undefined
    },
    useNanoBananaWebhook
  );

  // generateFigureImage can return string or string[] - extract first image if array
  const imageUrl = Array.isArray(result) ? result[0] : result;

  // Generate filename
  const timestamp = new Date().getTime().toString();
  const baseFilename = originalFilename.split('.').slice(0, -1).join('.') || 'image';
  const sanitizedFilename = baseFilename.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  const filename = `${sessionId}_${sanitizedFilename}_${transformationLabel}_${timestamp}.jpg`;

  return {
    imageUrl,
    promptText: fullPrompt,
    filename
  };
};

/**
 * Generates an architectural video prompt for a given image
 * Focuses on camera movements and architectural elements rather than people
 * @param imageBlob - The image blob with base64 and mimeType
 * @param guidance - Optional high-level instruction to guide the prompt generation
 * @returns A descriptive video prompt for architectural animation
 */
export const generateArchitecturalVideoPrompt = async (
  imageBlob: { base64: string; mimeType: string },
  guidance?: string
): Promise<string> => {
  const { ai } = await import('./geminiClient');
  const { GenerateContentResponse } = await import('@google/genai');

  let prompt = `Analyze this architectural scene and create a short, descriptive video prompt (around 25-35 words) for an AI video generator that will animate this static image. Focus on slow, cinematic camera movements that reveal architectural details. PRIORITIZE these camera movements:
- Dolly movement (slowly moving forward into the space) - PRIMARY MOVEMENT
- Slow rotation around a central point or architectural feature - PREFERRED
- Gentle vertical tilt (up or down) - SECONDARY
- Avoid horizontal pans unless absolutely necessary - they create static, uninteresting videos

Also consider subtle environmental elements like:
- Changing natural light and shadows moving across surfaces
- Gentle movement of curtains, plants, or water features if present
- Soft atmospheric effects like mist or light rays

Do NOT mention people, facial expressions, or human movements. This is purely an architectural visualization. The camera movement should be slow, smooth, and professional, like an architectural demo or real estate showcase.`;

  if (guidance && guidance.trim()) {
    prompt += ` IMPORTANT: The prompt must also adhere to this high-level instruction: "${guidance}".`;
  }

  prompt += ` Example: 'A modern living room with natural light streaming through large windows, camera slowly moves forward into the space while gently rotating right, revealing architectural details and depth, soft shadows move across the hardwood floor.'`;

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
