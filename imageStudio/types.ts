
export interface AppFile {
  file: File;
  id: string;
}

export interface PromptPreset {
  id: string;
  name: string;
  content: string;
}

export interface GeneratedImage {
  url: string;
  originalImageIndex: number;
  originalPromptIndex: number;
  prompt: string;
  batchTimestamp: number;
}

export interface GenerationResult {
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