# Video Analyzer Studio - Entegrasyon Kılavuzu

## Executive Summary

Bu doküman, Video Analyzer uygulamasının başka bir AI Studio uygulamasına **"Video Analyzer Studio"** sekmesi olarak entegre edilmesi için kapsamlı mimari ve teknik rehber sağlar.

### Uygulama Özeti

**Video Analyzer Studio** şunları yapan bir React/TypeScript uygulamasıdır:
1. Video reklamları yükler ve Google Gemini API ile analiz eder
2. 10 noktalık stratejik framework ile detaylı analiz üretir
3. Key-frame bazlı storyboard oluşturur (her frame için still + video prompts)
4. Video analizinden static reklam konseptleri üretir
5. Imagen veya Gemini image modelleri ile görsel oluşturur
6. Scene variation generation (subject compositing) sağlar

### Teknoloji Stack

```
Frontend:
- React 19.1.1 (latest features)
- TypeScript ~5.8.2
- Vite 6.2.0 (build tool)
- Tailwind CSS (utility-first styling)

Backend/API:
- @google/genai ^1.21.0 (Gemini API client)
- Google Gemini 2.5 Pro/Flash (analysis)
- Google Imagen 4 (image generation)
- Gemini 2.5 Flash Image Preview / Nano Banana (image editing)

Utilities:
- fflate 0.8.2 (ZIP compression)
- Canvas API (frame extraction)
```

---

## Mimari Genel Bakış

### İki Fazlı Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Video Analyzer Studio                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐        ┌──────────────────────┐      │
│  │  Phase 1: ANALYZE    │───────▶│  Phase 2: GENERATE   │      │
│  │  & STORYBOARD        │        │  CONCEPTS            │      │
│  └──────────────────────┘        └──────────────────────┘      │
│           │                                   │                  │
│           │                                   │                  │
│  ┌────────▼────────┐                 ┌───────▼────────┐        │
│  │ Upload Video    │                 │ Generate Static │        │
│  │ Analyze with AI │                 │ Ad Concepts     │        │
│  │ Extract Frames  │                 │ Create Images   │        │
│  │ Generate        │                 │ Scene Variations│        │
│  │ Storyboard      │                 │                 │        │
│  └─────────────────┘                 └─────────────────┘        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### State Machine

```typescript
type AppState = 'idle' | 'analyzing' | 'analyzed' | 'generating';

// State transitions
idle ──(upload + analyze)──▶ analyzing
                                  │
                    ┌─────────────┼─────────────┐
                    │                           │
              [success]                     [error]
                    │                           │
                    ▼                           ▼
               analyzed ◀─(complete)─── generating
```

### Tab Yapısı

```typescript
type ActiveTab = 'analyze' | 'generate';

// Tab access rules
Analyze Tab: Always accessible
Generate Tab: Disabled until videoAnalysis !== null
```

---

## Bağımlılıklar ve Kurulum

### NPM Packages

```json
{
  "dependencies": {
    "@google/genai": "^1.21.0",     // Google Gemini API client
    "react": "^19.1.1",              // UI framework
    "react-dom": "^19.1.1",          // React DOM renderer
    "fflate": "0.8.2"                // ZIP compression (downloads)
  },
  "devDependencies": {
    "@types/node": "^22.14.0",       // Node.js type definitions
    "@vitejs/plugin-react": "^5.0.0",// Vite React plugin
    "typescript": "~5.8.2",          // TypeScript compiler
    "vite": "^6.2.0"                 // Build tool
  }
}
```

### Environment Variables

```bash
# .env.local (not tracked in git)
GEMINI_API_KEY=your_gemini_api_key_here
```

**Vite Configuration** (`vite.config.ts`):
```typescript
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
    };
});
```

**Runtime Access**:
```typescript
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

### Tailwind CSS Configuration

**Custom Utilities Needed**:
```css
/* Add to global CSS or tailwind config */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #4b5563 #1f2937;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #4b5563;
  border-radius: 3px;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}
```

**Aspect Ratio Classes**:
```javascript
// Ensure Tailwind includes arbitrary aspect ratios
module.exports = {
  theme: {
    extend: {
      aspectRatio: {
        '3/4': '3 / 4',
        '4/3': '4 / 3',
        '9/16': '9 / 16',
        '16/9': '16 / 9',
      }
    }
  }
}
```

---

## Sekme Entegrasyonu

### Diğer AI Studio Uygulamasına Entegrasyon Yaklaşımları

#### Yaklaşım 1: Standalone Component Integration

```typescript
// ParentAIStudio.tsx
import { VideoAnalyzerStudio } from './video-analyzer/App';

const ParentAIStudio = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'video-analyzer' | 'other'>('chat');

  return (
    <div>
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'video-analyzer' && (
        <VideoAnalyzerStudio />
      )}

      {activeTab === 'chat' && <ChatInterface />}
    </div>
  );
};
```

#### Yaklaşım 2: State Management Integration

```typescript
// If parent uses Redux/Zustand/Context
import { VideoAnalyzerProvider } from './video-analyzer/context';

const ParentAIStudio = () => {
  return (
    <GlobalStateProvider>
      <VideoAnalyzerProvider>
        <TabSystem>
          <VideoAnalyzerStudio />
        </TabSystem>
      </VideoAnalyzerProvider>
    </GlobalStateProvider>
  );
};
```

### Tab Visibility and Lifecycle

**Mount/Unmount Behavior**:
```typescript
// Option 1: Conditional Rendering (unmounts when switching tabs)
{activeTab === 'video-analyzer' && <VideoAnalyzerStudio />}

// Option 2: Hidden with CSS (preserves state)
<div style={{ display: activeTab === 'video-analyzer' ? 'block' : 'none' }}>
  <VideoAnalyzerStudio />
</div>
```

**State Persistence**:
```typescript
// If you want to preserve state across tab switches
import { useLocalStorage } from './hooks';

const VideoAnalyzerStudio = () => {
  const [videoAnalysis, setVideoAnalysis] = useLocalStorage('va-analysis', null);
  const [generatedAds, setGeneratedAds] = useLocalStorage('va-concepts', []);

  // Rest of component logic
};
```

---

## State Management Stratejisi

### Core State Variables (App.tsx)

```typescript
// File Management
const [videoFile, setVideoFile] = useState<File | null>(null);
const [subjectImages, setSubjectImages] = useState<File[]>([]);
const [sceneSubjectImages, setSceneSubjectImages] = useState<File[]>([]);

// Application State
const [appState, setAppState] = useState<AppState>('idle');
const [activeTab, setActiveTab] = useState<ActiveTab>('analyze');
const [hasSelectedApiKey, setHasSelectedApiKey] = useState(false);
const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);

// Analysis Data
const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
const [processedVideo, setProcessedVideo] = useState<{ uri: string; mimeType: string; } | null>(null);
const [extractedFrames, setExtractedFrames] = useState<(string | null)[]>([]);
const [isExtractingFrames, setIsExtractingFrames] = useState(false);
const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
const [analysisParseError, setAnalysisParseError] = useState<string | null>(null);

// Generation Data
const [generatedAds, setGeneratedAds] = useState<AdIdea[]>([]);
const [generatingApproach, setGeneratingApproach] = useState<string | null>(null);
const [generatingScene, setGeneratingScene] = useState<number | 'all' | null>(null);

// Settings
const [analysisModel, setAnalysisModel] = useState<AnalysisModel>('gemini-2.5-pro');
const [imageModel, setImageModel] = useState<ImageModel>('imagen-4.0-ultra-generate-001');
const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
const [sceneImageModel, setSceneImageModel] = useState<ImageModel>('gemini-2.5-flash-image-preview');
const [sceneAspectRatio, setSceneAspectRatio] = useState<AspectRatio>('16:9');
const [additionalInstructions, setAdditionalInstructions] = useState<string>('');
const [nanoBananaPrompt, setNanoBananaPrompt] = useState<string>('...');
const [sceneInstructions, setSceneInstructions] = useState<string>('');
const [sceneGenerationDefaultPrompt, setSceneGenerationDefaultPrompt] = useState<string>('...');
const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
const [isMockDataEnabled, setIsMockDataEnabled] = useState(false);

// UI State
const [error, setError] = useState<string | null>(null);

// Refs
const videoRef = useRef<HTMLVideoElement>(null);
```

### State Transition Flow

#### Video Upload → Analysis
```typescript
// 1. User uploads video
handleVideoChange(files: File[]) {
  setVideoFile(files[0] || null);
  // Reset all analysis-related state
  resetState(); // Clears videoAnalysis, generatedAds, error, logs, etc.
  setActiveTab('analyze');
}

// 2. User clicks "Analyze Video"
handleAnalyze() {
  setAppState('analyzing');
  setError(null);
  setVideoAnalysis(null);
  setAnalysisParseError(null);
  setAnalysisLogs([]);

  try {
    // Upload video to File API
    const { analysis, processedFile } = await analyzeVideo(
      videoFile,
      analysisModel,
      (msg) => setAnalysisLogs(prev => [...prev, msg])
    );

    setVideoAnalysis(analysis);
    setProcessedVideo(processedFile); // Cache for retry
    setAppState('analyzed');
  } catch (err) {
    if (err instanceof JsonParseError) {
      setError(`Analysis failed: ${err.message}`);
      setAnalysisParseError(err.rawResponse); // Show in AnalysisErrorCard
    } else {
      setError(`Analysis failed: ${err.message}`);
    }
    setAppState('idle');
  }
}
```

#### Analysis → Frame Extraction (Automatic)
```typescript
useEffect(() => {
  if (!videoFile || !videoAnalysis?.storyboard) {
    setExtractedFrames([]);
    return;
  }

  const extractFrames = async () => {
    setIsExtractingFrames(true);
    setExtractedFrames(Array(storyboard.length).fill(null));

    // Create video element and canvas
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Wait for metadata
    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        resolve();
      };
    });

    // Extract each frame
    const capturedFrames = [];
    for (let i = 0; i < storyboard.length; i++) {
      const originalTime = parseTimestamp(storyboard[i].timestamp);
      let timeToCapture = originalTime;

      // Adjust timestamp for middle scenes (1/3 into next scene)
      if (i > 0 && i < storyboard.length - 1) {
        const nextTime = parseTimestamp(storyboard[i + 1].timestamp);
        const duration = nextTime - originalTime;
        if (duration > 0) timeToCapture += duration / 3;
      }

      // Seek to time
      await new Promise(resolve => {
        video.onseeked = resolve;
        video.currentTime = Math.min(timeToCapture, video.duration);
      });

      // Capture frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      capturedFrames.push(canvas.toDataURL('image/jpeg'));
    }

    setExtractedFrames(capturedFrames);
    setIsExtractingFrames(false);
  };

  extractFrames().catch(err => {
    setError("Failed to extract key frames from the video.");
    setIsExtractingFrames(false);
  });
}, [videoFile, videoAnalysis]);
```

#### Concept Generation
```typescript
handleGenerateConcept(selectedApproach?: string, specificInstructions?: string) {
  if (!videoAnalysis) {
    setError('Please analyze a video first.');
    return;
  }

  setAppState('generating');
  if (selectedApproach) {
    setGeneratingApproach(selectedApproach); // Track which approach
  }
  setError(null);

  try {
    const finalInstructions = [
      additionalInstructions,
      specificInstructions
    ].filter(Boolean).join('\n\n');

    const ideas = await generateAdConcept(
      videoAnalysis,
      selectedApproach || '',
      imageModel === 'gemini-2.5-flash-image-preview' ? subjectImages : [],
      finalInstructions,
      analysisModel
    );

    // Add UUIDs and empty generatedImages array
    const ideasWithIds = ideas.map(idea => ({
      ...idea,
      id: crypto.randomUUID(),
      generatedImages: []
    }));

    // PREPEND to array (newest first)
    setGeneratedAds(prevAds => [...ideasWithIds, ...prevAds]);

    // Auto-switch to Generate tab if triggered from ConceptApproachCard
    if (selectedApproach) {
      setActiveTab('generate');
    }
  } catch (err) {
    setError(`Generation failed: ${err.message}`);
  } finally {
    setAppState('analyzed');
    setGeneratingApproach(null);
  }
}
```

#### Image Generation from Concept
```typescript
// In AdIdeaCard component
const handleGenerateImage = async () => {
  setIsGenerating(true);
  setError(null);

  try {
    // Determine which prompt to use
    const promptToUse = imageModel === 'gemini-2.5-flash-image-preview'
      ? nanoBananaPrompt  // Edit model
      : editablePrompt;    // Generation model (from concept)

    // Determine base images
    const baseImageFiles = imageModel === 'gemini-2.5-flash-image-preview'
      ? subjectImages
      : undefined;

    // Generate image
    const base64ImageBytes = await generateImage(
      promptToUse,
      aspectRatio,
      imageModel,
      baseImageFiles
    );

    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

    // Update parent state (prepend to array)
    onImageGenerated(idea.id!, imageUrl);
  } catch (err) {
    setError(`Image generation failed: ${err.message}`);
  } finally {
    setIsGenerating(false);
  }
};

// In App.tsx
const handleImageGenerated = (ideaId: string, imageUrl: string) => {
  setGeneratedAds(prevAds =>
    prevAds.map(ad =>
      ad.id === ideaId
        ? { ...ad, generatedImages: [imageUrl, ...(ad.generatedImages || [])] }
        : ad
    )
  );
};
```

#### Scene Variation Generation
```typescript
handleGenerateSceneVariation(index: number | 'all') {
  if (sceneSubjectImages.length === 0) {
    setError('Please upload at least one subject image.');
    return;
  }

  setGeneratingScene(index);
  setError(null);

  const scenesToGenerate = index === 'all'
    ? videoAnalysis.storyboard.map((_, i) => i)
    : [index];

  for (const sceneIndex of scenesToGenerate) {
    const scene = videoAnalysis.storyboard[sceneIndex];
    const frameDataUrl = extractedFrames[sceneIndex];

    if (!frameDataUrl) continue;

    try {
      // Construct composite prompt
      const finalPrompt = `${sceneGenerationDefaultPrompt}

--- Original Prompt ---
${scene.still_prompt}

--- User Instructions ---
${sceneInstructions}`;

      // Convert frame to file
      const frameBlob = await (await fetch(frameDataUrl)).blob();
      const frameFile = new File([frameBlob], `frame_${sceneIndex}.jpeg`);

      // Combine subject image + original frame
      const imageFiles = [sceneSubjectImages[0], frameFile];

      // Generate composite image
      const base64ImageBytes = await generateImage(
        finalPrompt,
        sceneAspectRatio,
        sceneImageModel,
        imageFiles
      );

      const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

      // Update storyboard scene
      setVideoAnalysis(prev => {
        const newStoryboard = [...prev.storyboard];
        const currentScene = newStoryboard[sceneIndex];
        newStoryboard[sceneIndex] = {
          ...currentScene,
          generated_images: [imageUrl, ...(currentScene.generated_images || [])]
        };
        return { ...prev, storyboard: newStoryboard };
      });

    } catch (err) {
      setError(`Failed to generate variation: ${err.message}`);
      if (index === 'all') break; // Stop on error
    }
  }

  setGeneratingScene(null);
}
```

---

## API Key Yönetimi

### window.aistudio Integration

Video Analyzer, Google AI Studio ortamında çalışmak için özel bir API key yönetimi kullanır:

```typescript
// Initialize on mount
useEffect(() => {
  // @ts-ignore
  if (!window.aistudio) {
    // Development fallback
    console.warn("window.aistudio not found. Assuming API key for development.");
    setHasSelectedApiKey(true);
    setIsCheckingApiKey(false);
    return;
  }

  const checkKey = async () => {
    setIsCheckingApiKey(true);
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    setHasSelectedApiKey(hasKey);
    setIsCheckingApiKey(false);
  };

  checkKey();
}, []);
```

### API Key Selection Flow

```typescript
// User clicks "Select API Key"
const handleSelectKey = async () => {
  // @ts-ignore
  await window.aistudio.openSelectKey();
  // Optimistically assume key is selected
  setHasSelectedApiKey(true);
  setError(null);
};

// Error detection
const handleApiKeyError = (err: unknown) => {
  const errorMessage = err instanceof Error ? err.message : '';

  // Check for common API key errors
  if (
    errorMessage.includes('Requested entity was not found') ||
    errorMessage.includes('API key not valid') ||
    errorMessage.includes('Failed to get upload url')
  ) {
    setError('Your API key may be invalid or lack necessary permissions.');
    setHasSelectedApiKey(false); // Trigger re-prompt
    return true; // Error handled
  }

  return false; // Not an API key error
};
```

### UI States

```typescript
// State 1: Checking API key
if (isCheckingApiKey) {
  return <Loader message="Verifying API key..." />;
}

// State 2: No API key
if (!hasSelectedApiKey) {
  return (
    <div className="api-key-prompt">
      <h2>API Key Required</h2>
      <p>This application uses Gemini File API requiring a personal API key.</p>
      <button onClick={handleSelectKey}>Select API Key</button>
    </div>
  );
}

// State 3: API key available - show main app
return <MainAppInterface />;
```

### Alternative Implementation for Other Environments

Eğer diğer AI Studio uygulamanız farklı bir API key yönetimi kullanıyorsa:

```typescript
// Option 1: Direct environment variable
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable required");
}

// Option 2: Global config object
const config = {
  geminiApiKey: window.__APP_CONFIG__.geminiApiKey
};

// Option 3: Context provider
const { geminiApiKey } = useContext(APIKeysContext);
```

---

## Test Stratejisi

### Mock Data Kullanımı

Video Analyzer, API quota'sını korumak ve hızlı geliştirme için mock data desteği içerir.

**Activation** (SettingsModal):
```typescript
const [isMockDataEnabled, setIsMockDataEnabled] = useState(false);

<label>
  <input
    type="checkbox"
    checked={isMockDataEnabled}
    onChange={(e) => setIsMockDataEnabled(e.target.checked)}
  />
  Enable Mock Data (Development Mode)
</label>
```

**Mock Analysis** (App.tsx):
```typescript
if (isMockDataEnabled) {
  setAppState('analyzing');
  setAnalysisLogs(['[MOCK] Using mock data for analysis...']);
  setTimeout(() => {
    setVideoAnalysis(mockVideoAnalysisData);
    setAnalysisLogs(prev => [...prev, '[MOCK] Mock analysis loaded.']);
    setAppState('analyzed');
  }, 1000); // Simulate delay
  return;
}
```

**Mock Concept Generation**:
```typescript
if (isMockDataEnabled) {
  setTimeout(() => {
    const newIdea = getMockAdIdea();
    newIdea.id = crypto.randomUUID();
    setGeneratedAds(prevAds => [newIdea, ...prevAds]);
    setAppState('analyzed');
  }, 1200);
  return;
}
```

**Mock Image Generation** (uses Picsum photos):
```typescript
if (isMockDataEnabled) {
  const getDimensions = () => {
    switch (aspectRatio) {
      case '1:1': return { width: 500, height: 500 };
      case '3:4': return { width: 375, height: 500 };
      // ... other ratios
    }
  };

  const { width, height } = getDimensions();
  const seed = crypto.randomUUID();
  const mockImageUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;

  onImageGenerated(idea.id!, mockImageUrl);
  return;
}
```

### Test Senaryoları

**1. Video Upload & Analysis**
- ✓ Upload valid video file (MP4, MOV)
- ✓ Handle large files (>100MB)
- ✓ Handle File API processing state
- ✓ Parse valid analysis JSON
- ✓ Handle malformed JSON (AnalysisErrorCard)
- ✓ Retry analysis after parse error

**2. Frame Extraction**
- ✓ Extract frames at correct timestamps
- ✓ Handle timestamp adjustment (1/3 rule)
- ✓ Handle videos with varying frame rates
- ✓ Handle extraction errors gracefully

**3. Concept Generation**
- ✓ Generate from general approach
- ✓ Generate from ConceptApproachCard with instructions
- ✓ Handle with/without subject images
- ✓ Validate JSON schema compliance

**4. Image Generation**
- ✓ Imagen models (text-to-image)
- ✓ Nano Banana (image editing with subject)
- ✓ Different aspect ratios
- ✓ Gallery display and download

**5. Scene Variations**
- ✓ Single scene generation
- ✓ Bulk "Generate All" operation
- ✓ Subject compositing quality
- ✓ Error handling mid-batch

**6. Error Scenarios**
- ✓ Invalid API key
- ✓ Network timeouts
- ✓ Quota exceeded
- ✓ Malformed API responses
- ✓ File upload failures

---

## Production Considerations

### Rate Limiting

```typescript
// Implement request throttling
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute = 60;
  private minDelay = (60 * 1000) / this.requestsPerMinute;

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

const rateLimiter = new RateLimiter();

// Usage
const result = await rateLimiter.enqueue(() =>
  generateAdConcept(videoAnalysis, approach, images, instructions, model)
);
```

### Error Boundaries

```typescript
import React, { Component, ErrorInfo } from 'react';

class VideoAnalyzerErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Video Analyzer Error:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### File API Cleanup

```typescript
// Cleanup uploaded files after 48 hours
useEffect(() => {
  return () => {
    // Optional: Delete file when component unmounts
    if (processedVideo?.uri) {
      ai.files.delete({ name: extractFileNameFromUri(processedVideo.uri) })
        .catch(err => console.warn('Failed to delete file:', err));
    }
  };
}, [processedVideo]);
```

---

## Sonraki Adımlar

Bu dokümandan sonra şu dokümantasyonları okuyun:

1. **SYSTEM_PROMPTS_REFERENCE.md** - Tüm sistem prompt'larının tam detayları
2. **API_INTEGRATION_GUIDE.md** - Gemini API entegrasyonu adım adım
3. **UI_COMPONENTS_GUIDE.md** - Her component'in detaylı implementasyonu
4. **DATA_PROCESSING_GUIDE.md** - Veri işleme pipeline'ları
5. **IMPLEMENTATION_CHECKLIST.md** - Adım adım uygulama rehberi

---

**Son Güncelleme**: 2025-11-03
**Versiyon**: 1.0.0
