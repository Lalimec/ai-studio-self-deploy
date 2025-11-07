# API Integration Guide - Video Analyzer Studio

Bu doküman, Google Gemini API'nin Video Analyzer Studio'ya entegrasyonunu adım adım açıklar.

---

## İçindekiler

1. [Gemini API Setup](#1-gemini-api-setup)
2. [File API Workflow](#2-file-api-workflow)
3. [Analysis Pipeline](#3-analysis-pipeline)
4. [Concept Generation Pipeline](#4-concept-generation-pipeline)
5. [Image Generation](#5-image-generation)
6. [Error Handling](#6-error-handling)
7. [Rate Limiting & Optimization](#7-rate-limiting--optimization)

---

## 1. Gemini API Setup

### Installation

```bash
npm install @google/genai@^1.21.0
```

### Initialization

```typescript
import { GoogleGenAI } from "@google/genai";

// Initialize client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

### Environment Configuration

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    }
  };
});
```

---

## 2. File API Workflow

### Overview

Video'lar Gemini'nin File API'sine yüklenip işlenmeli:

```
Upload → Poll (PROCESSING) → ACTIVE → Analyze
```

### Step 1: Upload Video

```typescript
export const analyzeVideo = async (
  videoFile: File,
  model: AnalysisModel,
  onProgress: (message: string) => void
): Promise<{ analysis: VideoAnalysis, processedFile: { uri: string, mimeType: string } }> => {

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  onProgress("Uploading video via File API...");

  // Upload file
  const uploadResult = await ai.files.upload({ file: videoFile });

  onProgress(`Video uploaded: ${uploadResult.name}`);

  return { name: uploadResult.name, state: 'PROCESSING' };
};
```

**Upload Response**:
```typescript
{
  name: "files/abc123def456",  // File identifier
  displayName: "my-video.mp4",
  mimeType: "video/mp4",
  sizeBytes: 15728640,
  state: "PROCESSING",         // Initial state
  uri: "https://generativelanguage.googleapis.com/v1beta/files/abc123def456"
}
```

### Step 2: Poll Until ACTIVE

```typescript
const fileName = uploadResult.name;
let file = await ai.files.get({ name: fileName });

const maxRetries = 20;
let retries = 0;

while (file.state === 'PROCESSING' && retries < maxRetries) {
  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check state
  file = await ai.files.get({ name: fileName });
  retries++;

  onProgress(`File state is ${file.state}, attempt ${retries}/${maxRetries}`);
}

// Validate final state
if (file.state !== 'ACTIVE') {
  throw new Error(`File processing failed. Final state: ${file.state}`);
}
```

**File States**:
- `PROCESSING`: Video işleniyor (başlangıç state)
- `ACTIVE`: Video hazır, analiz için kullanılabilir (hedef state)
- `FAILED`: İşleme başarısız (error state)

**Polling Parameters**:
- **Interval**: 5 seconds (5000ms)
- **Max Retries**: 20 (toplam 100 saniye)
- **Timeout**: 100 seconds

**Best Practices**:
```typescript
// Progress callback kullan
onProgress(`Waiting for file to process... ${retries}/${maxRetries}`);

// State logla
console.log('File state:', file.state);

// Timeout handling
if (retries >= maxRetries) {
  throw new Error('File processing timeout after 100 seconds');
}
```

### Step 3: Extract File URI

```typescript
const processedFile = {
  uri: file.uri,           // "https://generativelanguage.googleapis.com/..."
  mimeType: file.mimeType  // "video/mp4"
};

// Cache for retry scenarios
return { analysis, processedFile };
```

**Neden Cache Ediyoruz?**
- JSON parse error durumunda re-upload gerekmez
- Retry daha hızlı (upload skip edilir)
- API quota tasarrufu

---

## 3. Analysis Pipeline

### Full Analysis Flow

```typescript
// Upload + Analyze (ilk kez)
const { analysis, processedFile } = await analyzeVideo(videoFile, model, onProgress);

// Analysis only (retry durumu)
const analysis = await generateAnalysis(processedFile, model, onProgress);
```

### generateAnalysis Implementation

```typescript
export const generateAnalysis = async (
  processedFile: { uri: string; mimeType: string },
  model: AnalysisModel,
  onProgress: (message: string) => void
): Promise<VideoAnalysis> => {

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  onProgress('File is ACTIVE. Proceeding with analysis.');

  // Prepare video part
  const videoPart = {
    fileData: {
      mimeType: processedFile.mimeType,
      fileUri: processedFile.uri,
    },
  };

  // API call
  const response = await ai.models.generateContent({
    model: model, // 'gemini-2.5-pro' or 'gemini-2.5-flash'
    contents: [{
      parts: [
        videoPart,
        { text: "Analyze this video ad based on your instructions and provide the complete JSON output." }
      ]
    }],
    config: {
      systemInstruction: systemInstructionForAnalysis,
      tools: [{ googleSearch: {} }], // Enable web search
    },
  });

  onProgress('Analysis complete. Parsing results.');

  // Parse and validate response
  return parseAnalysisResponse(response.text);
};
```

### Response Parsing

```typescript
const parseAnalysisResponse = (responseText: string): VideoAnalysis => {
  try {
    // Extract JSON (supports both fenced and raw JSON)
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);

    if (!jsonMatch) {
      throw new Error("Could not find a JSON object in the response.");
    }

    const jsonString = jsonMatch[1] || jsonMatch[2];
    const parsedObject = JSON.parse(jsonString);

    // Validate required keys
    if (!parsedObject.analysis ||
        !parsedObject.concept_approaches ||
        !parsedObject.storyboard ||
        !parsedObject.overall_video_style_prompt) {
      throw new Error('Missing required keys in response');
    }

    // Validate storyboard structure
    if (!Array.isArray(parsedObject.storyboard)) {
      throw new Error('Storyboard must be an array');
    }

    // Validate storyboard items
    for (const item of parsedObject.storyboard) {
      if (typeof item.still_prompt !== 'string' ||
          typeof item.video_prompt !== 'string') {
        throw new Error('Storyboard items missing required prompt keys');
      }
    }

    return parsedObject as VideoAnalysis;

  } catch (parseError) {
    console.error("Failed to parse JSON response:", parseError);
    console.error("Original response text:", responseText);

    // Throw custom error with raw response
    throw new JsonParseError(
      "Failed to parse the AI's response. The AI model returned malformed JSON.",
      responseText
    );
  }
};
```

### Custom Error Class

```typescript
export class JsonParseError extends Error {
  public rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = 'JsonParseError';
    this.rawResponse = rawResponse;
  }
}
```

### Error Handling

```typescript
try {
  const { analysis, processedFile } = await analyzeVideo(videoFile, model, onProgress);
  setVideoAnalysis(analysis);
  setProcessedVideo(processedFile);
  setAppState('analyzed');

} catch (err) {
  if (err instanceof JsonParseError) {
    // Show raw response for debugging
    setError(`Analysis failed: ${err.message}`);
    setAnalysisParseError(err.rawResponse);
    setAppState('idle');
  } else {
    // Generic error
    setError(`Analysis failed: ${err.message}`);
    setAppState('idle');
  }
}
```

### Retry Logic

```typescript
const handleRetryAnalysis = async () => {
  if (!processedVideo) {
    setError('Cannot retry: Processed video data is missing.');
    return;
  }

  setError(null);
  setAnalysisParseError(null);
  setVideoAnalysis(null);
  setAppState('analyzing');
  setAnalysisLogs(['Retrying analysis with processed video...']);

  try {
    // Skip upload, use cached file
    const result = await generateAnalysis(
      processedVideo,
      analysisModel,
      (msg) => setAnalysisLogs(prev => [...prev, msg])
    );

    setVideoAnalysis(result);
    setAppState('analyzed');

  } catch (err) {
    if (err instanceof JsonParseError) {
      setError(`Analysis failed again: ${err.message}`);
      setAnalysisParseError(err.rawResponse);
    } else {
      setError(`Analysis failed: ${err.message}`);
    }
    setAppState('idle');
  }
};
```

---

## 4. Concept Generation Pipeline

### Overview

```
VideoAnalysis + selectedApproach + subjectImages → generateAdConcept() → AdIdea[]
```

### Implementation

```typescript
export const generateAdConcept = async (
  videoAnalysis: VideoAnalysis,
  selectedApproach: string,
  subjectImages: File[],
  additionalInstructions: string,
  model: AnalysisModel
): Promise<AdIdea[]> => {

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Convert images to base64 parts
  const imageParts = await Promise.all(
    subjectImages.map(fileToGenerativePart)
  );

  // Prepare context
  const analysisContext = `
Here is the high-level strategic analysis of the original video ad:
---
${videoAnalysis.analysis}
---

Here is the creative approach to follow for the static ad concept:
---
${videoAnalysis.concept_approaches}
---
`;

  const storyboardText = `Finally, here is the detailed storyboard analysis of the source video ad:\n\n${JSON.stringify(videoAnalysis.storyboard, null, 2)}`;

  // Dynamic system instruction
  const systemInstruction = `You are a static ad concept generator...

  **Inputs You Will Receive:**
  *   A specific creative direction, the \`selectedApproach\`: "${selectedApproach}"
  *   A detailed \`storyboard\` JSON object.
  ${additionalInstructions ? `\nIMPORTANT USER INSTRUCTIONS: ${additionalInstructions}\n` : ''}

  [rest of prompt...]
  `;

  // API call
  const response = await ai.models.generateContent({
    model: model,
    contents: [{
      parts: [
        ...imageParts,
        { text: analysisContext },
        { text: storyboardText }
      ]
    }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ideas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                layout: { type: Type.STRING },
                cta: { type: Type.STRING },
                text: {
                  type: Type.OBJECT,
                  properties: {
                    headline: { type: Type.STRING },
                    body: { type: Type.STRING },
                    disclaimer: { type: Type.STRING },
                  },
                  required: ["headline", "body", "disclaimer"]
                },
                subjects: { type: Type.STRING },
                environment: { type: Type.STRING },
                vibe: { type: Type.STRING },
                creatives: { type: Type.STRING },
                generation_prompt: { type: Type.STRING },
              },
              required: [
                "title", "description", "layout", "cta", "text",
                "subjects", "environment", "vibe", "creatives", "generation_prompt"
              ]
            },
          },
        },
        required: ["ideas"],
      },
    },
  });

  // Parse response (guaranteed valid JSON)
  return parseJsonResponse<AdIdea[]>(response.text, 'ideas');
};
```

### File to Base64 Conversion

```typescript
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};
```

### Response Parsing

```typescript
const parseJsonResponse = <T>(
  responseText: string,
  expectedKey: 'ideas'
): T => {
  try {
    const trimmedText = responseText.trim();
    const parsedObject = JSON.parse(trimmedText);

    if (!parsedObject[expectedKey]) {
      throw new Error(`Missing required '${expectedKey}' key`);
    }

    return parsedObject[expectedKey];

  } catch (parseError) {
    console.error("Failed to parse JSON response:", parseError);
    throw new Error("Failed to parse the AI's response.");
  }
};
```

---

## 5. Image Generation

### Model Branching

```typescript
export const generateImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  modelId: ImageModel,
  baseImageFiles?: File[],
): Promise<string> => {

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Branch based on model type
  if (modelId === 'gemini-2.5-flash-image-preview') {
    return generateWithEditModel(prompt, baseImageFiles, ai);
  } else {
    return generateWithImagenModel(prompt, aspectRatio, modelId, ai);
  }
};
```

### Imagen Models (Text-to-Image)

```typescript
const generateWithImagenModel = async (
  prompt: string,
  aspectRatio: AspectRatio,
  modelId: ImageModel,
  ai: GoogleGenAI
): Promise<string> => {

  const response = await ai.models.generateImages({
    model: modelId, // 'imagen-4.0-ultra-generate-001' etc.
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: aspectRatio, // '1:1', '3:4', '16:9' etc.
    },
  });

  if (response.generatedImages && response.generatedImages.length > 0) {
    return response.generatedImages[0].image.imageBytes; // base64
  } else {
    throw new Error("No images returned from API");
  }
};
```

**API Response**:
```typescript
{
  generatedImages: [
    {
      image: {
        imageBytes: "base64_encoded_string...",
        mimeType: "image/jpeg"
      }
    }
  ]
}
```

### Gemini Image Edit Model (Nano Banana)

```typescript
const generateWithEditModel = async (
  prompt: string,
  baseImageFiles: File[] | undefined,
  ai: GoogleGenAI
): Promise<string> => {

  if (!baseImageFiles || baseImageFiles.length === 0) {
    throw new Error("Edit model requires base images");
  }

  // Convert images to parts
  const imageParts = await Promise.all(
    baseImageFiles.map(fileToGenerativePart)
  );

  const textPart = { text: prompt };

  // API call
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [...imageParts, textPart]
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  // Extract image from multimodal response
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data; // base64
    }
  }

  throw new Error("No image part returned from edit model");
};
```

**API Response**:
```typescript
{
  candidates: [{
    content: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: "base64_encoded_string..."
          }
        },
        {
          text: "Optional text response"
        }
      ]
    }
  }]
}
```

### Usage in UI

```typescript
// In AdIdeaCard
const handleGenerateImage = async () => {
  try {
    const base64ImageBytes = await generateImage(
      promptToUse,
      aspectRatio,
      imageModel,
      baseImageFiles
    );

    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
    onImageGenerated(idea.id!, imageUrl);

  } catch (err) {
    setError(`Image generation failed: ${err.message}`);
  }
};
```

---

## 6. Error Handling

### Error Types

#### 1. API Key Errors

```typescript
const handleApiKeyError = (err: unknown): boolean => {
  const errorMessage = err instanceof Error ? err.message : '';

  const apiKeyErrorPatterns = [
    'Requested entity was not found',
    'API key not valid',
    'Failed to get upload url',
    'Permission denied',
    'Invalid authentication credentials'
  ];

  for (const pattern of apiKeyErrorPatterns) {
    if (errorMessage.includes(pattern)) {
      setError('Your API key may be invalid or lack necessary permissions.');
      setHasSelectedApiKey(false); // Trigger re-prompt
      return true; // Error handled
    }
  }

  return false; // Not an API key error
};
```

#### 2. JSON Parse Errors

```typescript
catch (err) {
  if (err instanceof JsonParseError) {
    // Show raw response in AnalysisErrorCard
    setError(`Analysis failed: ${err.message}`);
    setAnalysisParseError(err.rawResponse);

    // Allow retry without re-upload
    setAppState('idle');
  }
}
```

#### 3. Network Errors

```typescript
catch (err) {
  if (err.message.includes('fetch failed') ||
      err.message.includes('Network request failed')) {
    setError('Network error. Please check your connection and try again.');
  }
}
```

#### 4. Quota Errors

```typescript
catch (err) {
  if (err.message.includes('quota exceeded') ||
      err.message.includes('Resource has been exhausted')) {
    setError('API quota exceeded. Please wait or upgrade your plan.');
  }
}
```

### Error Recovery Strategies

#### Video Analysis Retry

```typescript
// Scenario: JSON parse error
// Solution: Retry with cached file (no re-upload)
const handleRetryAnalysis = async () => {
  if (!processedVideo) return;

  const analysis = await generateAnalysis(
    processedVideo, // Use cached file URI
    analysisModel,
    onProgress
  );

  setVideoAnalysis(analysis);
};
```

#### Batch Operation Error Handling

```typescript
// Scenario: "Generate All Scenes" with partial failure
for (const sceneIndex of scenesToGenerate) {
  try {
    const imageUrl = await generateImage(/*...*/);
    updateScene(sceneIndex, imageUrl);
  } catch (err) {
    setError(`Failed at scene ${sceneIndex}: ${err.message}`);

    if (index === 'all') {
      break; // Stop bulk operation on first error
    }
    // For single scene, just show error (no break)
  }
}
```

### Error Display Patterns

```typescript
// Global error banner
{error && appState !== 'analyzing' && (
  <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
    <p>{error}</p>
  </div>
)}

// Analysis error with raw response
{analysisParseError && (
  <AnalysisErrorCard
    rawResponse={analysisParseError}
    onRetry={handleRetryAnalysis}
    isRetrying={appState === 'analyzing'}
  />
)}

// Component-level error
{componentError && (
  <div className="mt-2 bg-red-900/50 text-red-300 text-sm p-2 rounded">
    {componentError}
  </div>
)}
```

---

## 7. Rate Limiting & Optimization

### Rate Limiter Implementation

```typescript
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute: number;
  private minDelay: number;

  constructor(requestsPerMinute = 60) {
    this.requestsPerMinute = requestsPerMinute;
    this.minDelay = (60 * 1000) / requestsPerMinute;
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const fn = this.queue.shift()!;

    await fn();
    await new Promise(resolve => setTimeout(resolve, this.minDelay));

    this.processQueue();
  }
}

// Usage
const rateLimiter = new RateLimiter(60); // 60 requests/minute

const result = await rateLimiter.enqueue(() =>
  generateAdConcept(videoAnalysis, approach, images, instructions, model)
);
```

### Caching Strategies

#### File API Results

```typescript
// Cache uploaded file URI
const [processedVideo, setProcessedVideo] = useState<{
  uri: string;
  mimeType: string;
} | null>(null);

// Use cached file for retry
if (processedVideo) {
  await generateAnalysis(processedVideo, model, onProgress);
} else {
  await analyzeVideo(videoFile, model, onProgress);
}
```

#### Extracted Frames

```typescript
// Cache extracted frames (base64 data URLs)
const [extractedFrames, setExtractedFrames] = useState<(string | null)[]>([]);

// Re-use frames for scene variations (no re-extraction)
const frameDataUrl = extractedFrames[sceneIndex];
const frameBlob = await (await fetch(frameDataUrl)).blob();
```

### Batch Request Optimization

```typescript
// Instead of sequential requests
for (const scene of scenes) {
  await generateImage(scene); // BAD: Sequential
}

// Use Promise.allSettled for parallel (with rate limiting)
const promises = scenes.map(scene =>
  rateLimiter.enqueue(() => generateImage(scene))
);

const results = await Promise.allSettled(promises);

// Handle partial failures
results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    updateScene(index, result.value);
  } else {
    console.error(`Scene ${index} failed:`, result.reason);
  }
});
```

### File API Cleanup

```typescript
// Delete uploaded files after processing (optional)
useEffect(() => {
  return () => {
    if (processedVideo?.uri) {
      const fileName = extractFileNameFromUri(processedVideo.uri);
      ai.files.delete({ name: fileName })
        .catch(err => console.warn('Failed to delete file:', err));
    }
  };
}, [processedVideo]);

const extractFileNameFromUri = (uri: string): string => {
  // "https://.../.../files/abc123" → "files/abc123"
  const match = uri.match(/files\/[^/]+$/);
  return match ? match[0] : '';
};
```

---

## Best Practices Özeti

### ✅ DO

1. **File API için polling kullan** (5s interval, 20 max retry)
2. **processedVideo cache et** (retry için)
3. **JsonParseError ile raw response sakla** (debugging)
4. **Rate limiting implement et** (quota koruma)
5. **Error handling her API call'da** (try-catch)
6. **Progress callbacks kullan** (user feedback)
7. **Schema validation** (concept generation için)
8. **Cleanup logic** (unmount'ta file delete)

### ❌ DON'T

1. **Upload'ı retry etme** (cached file kullan)
2. **Polling'i timeout olmadan yapma** (infinite loop riski)
3. **API key'i hardcode etme** (environment variable kullan)
4. **Sequential bulk requests** (rate limiter + parallel)
5. **Error swallow etme** (her error handle edilmeli)
6. **Raw response ignore etme** (JsonParseError için sakla)
7. **Schema olmadan JSON parse** (validation critical)

---

**Son Güncelleme**: 2025-11-03
**Versiyon**: 1.0.0
