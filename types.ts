/// <reference lib="dom" />
import { Hairstyle } from './Hairstyle';

export enum Gender {
  Male = 'Male',
  Female = 'Female',
}

export enum PoseStyle {
  Static = 'Keep Pose Static',
  Random = 'Randomize Poses',
}

export enum ColorOption {
  Original = 'Original Color',
  Random = 'Random Colors',
  Bold = 'Bold Colors',
  ComplexNatural = 'Complex Natural',
  MulticolorBold = 'Multicolor Bold',
}

export enum AdornmentOption {
    Original = 'Original',
    Random = 'Random',
}

export const ASPECT_RATIOS = ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] as const;
export type AspectRatio = typeof ASPECT_RATIOS[number];

export type Hairstyle = {
  id: string;
  name: string;
};

export type HairstyleCategory = {
  name: string;
  styles: Hairstyle[];
};

export type Beard = {
  id: string;
  name: string;
};

export type Accessory = {
  id:string;
  name:string;
};

export type GenerationOptions = {
  gender: Gender;
  // Hairstyle
  hairstyleCategories: string[];
  keepOriginalHairstyle: boolean;
  customHairstyles: string;
  useCustomHairstyles: boolean;
  // Color
  colorOptions: ColorOption[];
  customHairColors: string;
  useCustomHairColors: boolean;
  // Pose
  poseOptions: PoseStyle[];
  customPoses: string;
  useCustomPoses: boolean;
  // Adornments
  adornmentOptions: AdornmentOption[];
  customAdornments: string;
  useCustomAdornments: boolean;
  // Other
  imageCount: number;
  aspectRatio: AspectRatio;
};

export type GeneratedImage = {
  src: string;
  hairstyle: Hairstyle;
  color: string;
  filename: string;
  imageGenerationPrompt: string;
  isRegenerating?: boolean;
  videoPrompt?: string;
  isPreparing?: boolean;
  videoSrc?: string;
  isGeneratingVideo?: boolean;
  videoGenerationFailed?: boolean;
  publicUrl?: string;
};

export type StudioImage = {
  id: string; // Unique identifier, can be based on filename + timestamp
  src: string; // data URL
  file?: File;
  filename: string;
  publicUrl?: string; // To cache the uploaded URL
  isPreparing?: boolean;
  videoPrompt?: string;
  isGeneratingVideo?: boolean;
  videoSrc?: string;
  videoGenerationFailed?: boolean;
};

export type ImageForVideoProcessing = {
  src: string;
  endSrc?: string;
  filename: string;
  videoPrompt?: string;
};

export type Toast = {
  id: number;
  message: string;
  // FIX: Add 'warning' to the Toast type to allow for warning notifications.
  type: 'error' | 'success' | 'info' | 'warning';
};

// --- BABY STUDIO TYPES ---

export enum BabyGender {
    Boy = "Boy",
    Girl = "Girl",
    SurpriseMe = "Surprise Me",
}

export enum BabyAge {
    Newborn = "Newborn (0-6 mo)",
    Infant = "Infant (6-12 mo)",
    Toddler = "Toddler (1-3 yrs)",
    Child = "Child (4-6 yrs)",
}

export type BabyGenerationOptions = {
    age: BabyAge;
    gender: BabyGender;
    composition: string[];
    customComposition: string;
    useCustomComposition: boolean;
    background: string[];
    customBackgrounds: string;
    useCustomBackgrounds: boolean;
    clothing: string[];
    customClothing: string;
    useCustomClothing: boolean;
    action: string[];
    customAction: string;
    useCustomAction: boolean;
    imageCount: number;
    aspectRatio: AspectRatio;
};

export type GeneratedBabyImage = {
    src: string;
    description: string;
    filename: string;
    imageGenerationPrompt: string;
    isRegenerating?: boolean; // Keep for consistency, but won't be used
    videoPrompt?: string;
    isPreparing?: boolean;
    videoSrc?: string;
    isGeneratingVideo?: boolean;
    videoGenerationFailed?: boolean;
    publicUrl?: string;
};

export type ParentImageState = {
    id: 'parent1' | 'parent2';
    file: File | null;
    originalSrc: string | null;
    croppedSrc: string | null;
    publicUrl?: string; // To cache the uploaded URL
    isPreparing?: boolean;
    videoPrompt?: string;
    isGeneratingVideo?: boolean;
    videoSrc?: string;
    filename?: string;
    videoGenerationFailed?: boolean;
};


// --- IMAGE STUDIO TYPES ---
export interface AppFile {
  file: File;
  id: string;
}

export interface PromptPreset {
  id: string;
  name: string;
  content: string;
}

export interface ImageStudioRunResult {
  url: string;
  originalImageIndex: number;
  originalPromptIndex: number;
  prompt: string;
  batchTimestamp: number;
}

export interface ImageStudioGenerationResult {
    key: string;
    status: 'success' | 'error' | 'warning' | 'pending';
    url?: string;
    prompt?: string;
    error?: string;
    modelResponse?: string;
    originalImageIndex: number;
    originalPromptIndex: number;
    batchTimestamp: number;
}

export type ImageStudioResultImage = {
    src: string;
    filename: string;
    imageGenerationPrompt: string;
    // FIX: Add optional properties to conform to DisplayImage union type
    isRegenerating?: boolean;
    videoPrompt?: string;
    isPreparing?: boolean;
    videoSrc?: string;
    isGeneratingVideo?: boolean;
    publicUrl?: string;
};

// --- TIMELINE STUDIO TYPES ---
export type TimelinePair = {
  id: string;
  startImageId: string;
  endImageId: string;
  videoPrompt?: string;
  isPreparing?: boolean; // For enhance/translate
  isGeneratingVideo?: boolean;
  videoSrc?: string;
  isDisabled?: boolean;
  videoGenerationFailed?: boolean;
};

export type TimelinePairWithImages = TimelinePair & {
  startImage: StudioImage;
  endImage: StudioImage;
};

// --- VIDEO GENERATION TYPES ---
export type VideoModel = 'seedance-v1-pro';

export type VideoResolution = '480p' | '720p' | '1080p';

export type VideoDuration = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type VideoGenerationSettings = {
  model: VideoModel;
  resolution: VideoResolution;
  duration: VideoDuration;
  aspectRatio: string; // e.g., 'auto', '16:9', '9:16', etc.
};

// Model-specific parameter schemas for extensibility
export type SeedanceV1ProParams = {
  prompt: string;
  image_url: string;
  end_image_url?: string;
  aspect_ratio: string;
  resolution: VideoResolution;
  duration: string; // API expects string
};

// Union type for all model params (extensible for future models)
export type VideoModelParams = SeedanceV1ProParams;

// --- AD CLONER TYPES ---
export type AdImageState = {
  file: File | null;
  originalSrc: string | null;
  croppedSrc: string | null;
  publicUrl?: string;
};

export type AdSubjectImageState = AdImageState & {
  id: string;
};

export type AdClonerSettings = {
  textModel: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  imageModel: 'gemini-2.5-flash-image';
};

export type AdClonerPromptDetails = {
    summary: string;
    overall_format_and_art_style: string;
    composition_and_layout: string;
    subject: string;
    actions_and_poses_clockwise_from_top_left: string;
    setting_background: string;
    text_and_ui_elements: string;
    overall_mood: string;
};

export type AdClonerVariation = {
  title: string;
  details: AdClonerPromptDetails[];
  prompt: string; // This is the instructional prompt for the image model
};

export type AdClonerGenerationResult = {
  base_prompt: {
    title: string;
    details: AdClonerPromptDetails[];
  };
  variations: AdClonerVariation[];
};

export type VariationImageHistory = {
  images: string[];
  activeIndex: number;
};

// FIX: Added VariationState here to make it globally available.
export type VariationState = {
    isLoading: boolean;
    imageHistory: string[];
    activeImageIndex: number;
    refineText: string;
    refineImage: { file: File | null; src: string | null };
    isEnhancingRefine: boolean;
    isGeneratingRefineVariation: boolean;
    isTranslatingRefine: boolean;
};

// --- GLOBAL SETTINGS ---
export type NanoBananaWebhookSettings = {
    hair: boolean;
    baby: boolean;
    image: boolean;
    architecture: boolean;
    adCloner: boolean;
    videoAnalyzer: boolean;
};

export type DownloadSettings = {
    includeMetadataFiles: boolean; // Whether to download .txt metadata files alongside images
};

// --- VIDEO ANALYZER TYPES ---
export type AnalysisModel = 'gemini-2.5-pro' | 'gemini-2.5-flash';
export type ImageModel =
    'imagen-4.0-ultra-generate-001' |
    'imagen-4.0-generate-001' |
    'imagen-4.0-fast-generate-001' |
    'gemini-2.5-flash-image' |
    'nano-banana' |
    'seedream' |
    'flux-kontext-pro' |
    'qwen';

export type VideoAnalyzerSettings = {
    analysisModel: AnalysisModel;
    imageModel: ImageModel;
    aspectRatio: AspectRatio;
    sceneImageModel: ImageModel;
    sceneAspectRatio: AspectRatio;
    additionalInstructions: string;
    nanoBananaPrompt: string;
    sceneInstructions: string;
};

export interface StoryboardScene {
    timestamp: string;
    description: string;
    visuals: string;
    assets: string;
    still_prompt: string;
    video_prompt: string;
    generated_images?: string[];
    manual_offset_ms?: number;
}

export interface VideoAnalysis {
    analysis: string;
    concept_approaches: string;
    storyboard: StoryboardScene[];
    overall_video_style_prompt: string;
}

export interface AdIdea {
    id?: string;
    title: string;
    description: string;
    layout: string;
    cta: string;
    text: {
        headline: string;
        body: string;
        disclaimer: string;
    };
    subjects: string;
    environment: string;
    vibe: string;
    creatives: string;
    generation_prompt: string;
    generatedImages?: string[];
}

export class JsonParseError extends Error {
    public rawResponse: string;

    constructor(message: string, rawResponse: string) {
        super(message);
        this.name = 'JsonParseError';
        this.rawResponse = rawResponse;
    }
}

// --- ARCHITECTURE STUDIO TYPES ---
export type ArchitectureScope = {
  id: string;
  name: string;
};

export type ArchitectureStyle = {
  id: string;
  name: string;
  prompt: string;
};

export type ArchitectureTime = {
  id: string;
  name: string;
  prompt: string;
};

export type ArchitectureTheme = {
  id: string;
  name: string;
  prompt: string;
};

export type CameraAngleOption = {
  id: string;
  name: string;
  prompt: string;
};

export type RoomType = {
  id: string;
  name: string;
  prompt: string;
};

export type BuildingType = {
  id: string;
  name: string;
  prompt: string;
};

export type ColorScheme = {
  id: string;
  name: string;
  prompt: string;
};

export type TidyOption = {
  id: string;
  name: string;
  prompt: string;
};

export type ArchitectureGenerationOptions = {
  scope: string; // interior, exterior, facade, garden, landscape
  roomType: string; // Room type for interior (living room, kitchen, etc.)
  buildingType: string; // Building type for exterior/facade/garden
  styles: string[]; // Selected style IDs
  customStyles: string;
  useCustomStyles: boolean;
  colorScheme: string; // Color scheme (optional)
  tidy: string; // tidy or untidy
  showUnfinished: boolean; // Whether to show unfinished/before version
  time: string; // Time of day
  theme: string; // Holiday/seasonal theme
  cameraAngle: string; // preserve, slight_variation, randomize
  imageCount: number;
  aspectRatio: AspectRatio;
};

export type GeneratedArchitectureImage = {
  src: string;
  style: string; // Style name or "Custom"
  time: string; // Time name
  theme: string; // Theme name
  filename: string;
  imageGenerationPrompt: string;
  isRegenerating?: boolean;
  videoPrompt?: string;
  isPreparing?: boolean;
  videoSrc?: string;
  isGeneratingVideo?: boolean;
  videoGenerationFailed?: boolean;
  publicUrl?: string;
  depthMapSrc?: string;
  isGeneratingDepthMap?: boolean;
  depthMapGenerationFailed?: boolean;
};

// --- SHARED DISPLAY TYPE ---
export type DisplayImage = GeneratedImage | StudioImage | GeneratedBabyImage | ImageStudioResultImage | GeneratedArchitectureImage;