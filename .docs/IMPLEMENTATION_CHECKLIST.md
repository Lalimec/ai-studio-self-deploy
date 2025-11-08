# Implementation Checklist - Video Analyzer Studio

Bu doküman, Video Analyzer Studio'yu başka bir AI Studio uygulamasına "Video Analyzer Studio" sekmesi olarak entegre etmek için adım adım rehber sağlar.

---

## Phase 1: Setup & Dependencies

### 1.1 Install Dependencies

```bash
# Core dependencies
npm install @google/genai@^1.21.0
npm install react@^19.1.1 react-dom@^19.1.1
npm install fflate@0.8.2

# Dev dependencies
npm install --save-dev @types/node@^22.14.0
npm install --save-dev typescript@~5.8.2
```

**Verification**:
```bash
npm list @google/genai fflate
```

✅ **Checkpoint**: Dependencies installed successfully

---

### 1.2 Configure Environment Variables

**Create `.env.local`**:
```bash
GEMINI_API_KEY=your_api_key_here
```

**Update Build Config** (Vite):
```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
```

**Verification**:
```typescript
console.log('API Key configured:', !!process.env.API_KEY);
```

✅ **Checkpoint**: Environment variables configured

---

### 1.3 Configure Tailwind CSS

**Install Tailwind**:
```bash
npm install --save-dev tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Configure `tailwind.config.js`**:
```javascript
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./video-analyzer/**/*.{js,ts,jsx,tsx}", // Your integration path
  ],
  theme: {
    extend: {
      aspectRatio: {
        '3/4': '3 / 4',
        '4/3': '4 / 3',
        '9/16': '9 / 16',
        '16/9': '16 / 9',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: [],
};
```

**Add Global Styles**:
```css
/* global.css or index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

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
```

✅ **Checkpoint**: Tailwind CSS configured

---

## Phase 2: Core Services Implementation

### 2.1 Create Type Definitions

**Create `types.ts`**:
```typescript
export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export type AnalysisModel = 'gemini-2.5-pro' | 'gemini-2.5-flash';

export type ImageModel =
  | 'imagen-4.0-ultra-generate-001'
  | 'imagen-4.0-generate-001'
  | 'imagen-4.0-fast-generate-001'
  | 'gemini-2.5-flash-image-preview';

export interface StoryboardScene {
  timestamp: string;
  description: string;
  visuals: string;
  assets: string;
  still_prompt: string;
  video_prompt: string;
  generated_images?: string[];
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

export const imageModels: { id: ImageModel; name: string; requiresImage: boolean }[] = [
  { id: 'imagen-4.0-ultra-generate-001', name: 'Imagen 4 Ultra', requiresImage: false },
  { id: 'imagen-4.0-generate-001', name: 'Imagen 4', requiresImage: false },
  { id: 'imagen-4.0-fast-generate-001', name: 'Imagen 4 Fast', requiresImage: false },
  { id: 'gemini-2.5-flash-image-preview', name: 'Nano Banana (Edit)', requiresImage: true },
];

export const analysisModels: { id: AnalysisModel; name: string }[] = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
];

export const getModelNameForApi = (modelId: ImageModel): string => modelId;
```

**Verification**:
```typescript
import { VideoAnalysis, AdIdea } from './types';
// No TypeScript errors
```

✅ **Checkpoint**: Types defined

---

### 2.2 Create Gemini Service

**Create `services/geminiService.ts`**:

⚠️ **IMPORTANT**: Copy the EXACT content from SYSTEM_PROMPTS_REFERENCE.md

**Key Functions to Implement**:
1. `fileToGenerativePart(file: File)`
2. `parseJsonResponse<T>(text, key)`
3. `parseAnalysisResponse(text)`
4. `generateAnalysis(processedFile, model, onProgress)`
5. `analyzeVideo(videoFile, model, onProgress)`
6. `generateAdConcept(analysis, approach, images, instructions, model)`
7. `generateImage(prompt, aspectRatio, modelId, baseImages?)`

**System Prompts**:
- Copy `systemInstructionForAnalysis` (71-128 lines) EXACTLY
- Copy concept generation system instruction EXACTLY

**Verification**:
```typescript
import { analyzeVideo, generateAdConcept, generateImage } from './services/geminiService';
// Test with mock file
```

✅ **Checkpoint**: Gemini service implemented

---

### 2.3 Create Utility Functions

**Create `utils/timestamp.ts`**:
```typescript
export const parseTimestamp = (timestamp: string): number => {
  const parts = timestamp.split(/[:.]/);
  if (parts.length < 2) return 0;
  const minutes = parseInt(parts[0], 10) || 0;
  const seconds = parseInt(parts[1], 10) || 0;
  const milliseconds = parts.length > 2 ? parseInt(parts[2], 10) || 0 : 0;
  return minutes * 60 + seconds + milliseconds / 1000;
};

export const formatTimeWithMS = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00.000";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds - Math.floor(timeInSeconds)) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};
```

**Create `utils/download.ts`**:
```typescript
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const dataUrlToUint8Array = async (dataUrl: string): Promise<Uint8Array> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};
```

**Create `utils/aspectRatio.ts`**:
```typescript
import { AspectRatio } from '../types';

export const aspectRatioToClass = (ratio: AspectRatio): string => {
  const mapping: Record<AspectRatio, string> = {
    '1:1': 'aspect-square',
    '3:4': 'aspect-[3/4]',
    '4:3': 'aspect-[4/3]',
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-[16/9]',
  };
  return mapping[ratio] || 'aspect-square';
};
```

✅ **Checkpoint**: Utilities created

---

## Phase 3: Component Implementation (Layer by Layer)

### 3.1 Basic Components (No Dependencies)

**Create in order**:
1. ✅ `components/Header.tsx` - Simple header
2. ✅ `components/Footer.tsx` - Simple footer
3. ✅ `components/Loader.tsx` - Loading spinner
4. ✅ `components/MarkdownRenderer.tsx` - Markdown display

**Verification**: Import and render each component

---

### 3.2 Utility Components

**Create**:
1. ✅ `components/Lightbox.tsx` - Image viewer (Portal)
2. ✅ `components/FileUpload.tsx` - File drag-drop

**Test**: Each component independently

---

### 3.3 Settings Component

**Create**:
1. ✅ `components/SettingsModal.tsx` - Settings UI (Portal)

**Features**:
- Model selection (analysis + image)
- Aspect ratio selector
- Mock data toggle
- Additional instructions

**Test**: Open/close modal, change settings

---

### 3.4 Analysis Components

**Create in order**:
1. ✅ `components/AdAnalysisCard.tsx` - Analysis display
2. ✅ `components/ConceptApproachCard.tsx` - Approach display + generation
3. ✅ `components/AnalysisErrorCard.tsx` - Error display with retry
4. ✅ `components/SceneGenerationControls.tsx` - Scene variation controls
5. ✅ `components/StoryboardCard.tsx` - Storyboard + frames

**Test**: Each with mock data

---

### 3.5 Generation Components

**Create**:
1. ✅ `components/AdIdeaCard.tsx` - Concept display + image generation

**Test**: Mock generation, image display

---

## Phase 4: Main App Integration

### 4.1 Create App Component

**Create `App.tsx`**:

**Structure**:
```typescript
const App: React.FC = () => {
  // 1. State declarations (all ~40 state variables)
  // 2. useEffect hooks (API key check, frame extraction)
  // 3. Handler functions
  // 4. Conditional rendering (API key check → main app)
  // 5. Tab structure (Analyze / Generate)
  return (/* ... */);
};
```

**Implementation Order**:
1. State variables (copy from VIDEO_ANALYZER_INTEGRATION_GUIDE.md)
2. API key management
3. Video analysis handlers
4. Concept generation handlers
5. Frame extraction useEffect
6. Scene variation handlers
7. UI rendering

**Verification**:
```typescript
// Test each feature incrementally
1. API key prompt → shows correctly
2. Video upload → stores file
3. Analysis → calls API (use mock data first)
4. Frame extraction → creates data URLs
5. Concept generation → creates concepts
6. Image generation → generates images
```

✅ **Checkpoint**: App component working

---

### 4.2 Create Mock Data (Optional but Recommended)

**Create `mockData.ts`**:
```typescript
import { VideoAnalysis, AdIdea } from './types';

export const mockVideoAnalysisData: VideoAnalysis = {
  analysis: "## Analysis\n\n...",
  concept_approaches: "## Approaches\n\n...",
  overall_video_style_prompt: "A cinematic video...",
  storyboard: [
    {
      timestamp: "00:00.000",
      description: "Opening scene",
      visuals: "Clean, minimalist",
      assets: "Logo, product",
      still_prompt: "A photorealistic...",
      video_prompt: "A smooth dolly shot..."
    },
    // ... more scenes
  ]
};

const adIdeas: AdIdea[] = [
  {
    title: "Epic Adventure Awaits",
    description: "High-energy concept...",
    // ... all fields
  }
];

export const getMockAdIdea = (): AdIdea => {
  return { ...adIdeas[Math.floor(Math.random() * adIdeas.length)] };
};
```

**Enable Mock Mode**:
```typescript
const [isMockDataEnabled, setIsMockDataEnabled] = useState(true); // Start with true
```

✅ **Checkpoint**: Mock data working

---

## Phase 5: Tab Integration into Parent App

### 5.1 Export App as VideoAnalyzerStudio

**Create `index.ts`**:
```typescript
export { default as VideoAnalyzerStudio } from './App';
export * from './types';
```

---

### 5.2 Integrate into Parent App

**Option 1: Standalone Component**:
```typescript
// ParentApp.tsx
import { VideoAnalyzerStudio } from './video-analyzer';

const ParentApp = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'video-analyzer'>('chat');

  return (
    <div>
      <TabNavigation activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'video-analyzer' && <VideoAnalyzerStudio />}
      {activeTab === 'chat' && <ChatInterface />}
    </div>
  );
};
```

**Option 2: With State Preservation**:
```typescript
<div style={{ display: activeTab === 'video-analyzer' ? 'block' : 'none' }}>
  <VideoAnalyzerStudio />
</div>
```

**Option 3: With Context Provider**:
```typescript
import { VideoAnalyzerProvider } from './video-analyzer/context';

<VideoAnalyzerProvider>
  <VideoAnalyzerStudio />
</VideoAnalyzerProvider>
```

✅ **Checkpoint**: Integration complete

---

## Phase 6: Testing

### 6.1 Unit Tests (Key Functions)

**Test `parseTimestamp`**:
```typescript
test('parseTimestamp', () => {
  expect(parseTimestamp('00:00.000')).toBe(0);
  expect(parseTimestamp('00:03.452')).toBe(3.452);
  expect(parseTimestamp('01:25.123')).toBe(85.123);
});
```

**Test `parseAnalysisResponse`**:
```typescript
test('parseAnalysisResponse', () => {
  const validJson = '```json\n{"analysis":"...","storyboard":[]}\n```';
  expect(() => parseAnalysisResponse(validJson)).not.toThrow();

  const invalidJson = 'not json';
  expect(() => parseAnalysisResponse(invalidJson)).toThrow(JsonParseError);
});
```

---

### 6.2 Integration Tests

**Test Scenarios**:
1. ✅ Video upload → Analysis → Frame extraction
2. ✅ Analysis error → Retry with cached file
3. ✅ Concept generation → Image generation
4. ✅ Scene variation generation (single + bulk)
5. ✅ Download functionality (single scene + bulk)
6. ✅ API key error handling
7. ✅ Model switching (Imagen → Nano Banana)
8. ✅ Tab switching (state preservation)

---

### 6.3 Manual Testing Checklist

**Video Analysis Flow**:
- [ ] Upload video file (< 100MB)
- [ ] Click "Analyze Video"
- [ ] File uploads to Gemini API
- [ ] Polling shows progress
- [ ] Analysis completes successfully
- [ ] Frames extracted automatically
- [ ] Storyboard displays correctly
- [ ] Timestamps are clickable (video seeks)
- [ ] Adjusted timestamps shown for middle scenes

**Concept Generation Flow**:
- [ ] "Generate" tab disabled until analysis complete
- [ ] After analysis, tab becomes enabled
- [ ] Generate concept from approach button
- [ ] Auto-switches to Generate tab
- [ ] Concept displays with all fields
- [ ] Generation prompt is editable
- [ ] Generate image button works
- [ ] Images prepend to gallery
- [ ] Multiple variations can be generated
- [ ] Download individual images

**Scene Variation Flow**:
- [ ] Upload subject image
- [ ] Select scene generation model
- [ ] Enter custom instructions
- [ ] Generate single scene works
- [ ] Generate all scenes works (stops on error)
- [ ] Scene variations display correctly
- [ ] Download scene assets (ZIP)

**Error Scenarios**:
- [ ] Invalid API key → Shows prompt
- [ ] Malformed JSON → Shows AnalysisErrorCard
- [ ] Retry analysis without re-upload
- [ ] Network error → Shows error message
- [ ] Quota exceeded → Shows error message

**Settings**:
- [ ] Open settings modal
- [ ] Change analysis model
- [ ] Change image model
- [ ] Change aspect ratio
- [ ] Toggle mock data
- [ ] Settings persist across sessions (optional)

**Download**:
- [ ] Download single scene (frame + JSON)
- [ ] Download all assets (video + frames + scenes + summary)
- [ ] ZIP structure correct
- [ ] Files open correctly

---

## Phase 7: Production Readiness

### 7.1 Error Boundaries

**Create `ErrorBoundary.tsx`**:
```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Video Analyzer Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
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

// Wrap App
<ErrorBoundary>
  <VideoAnalyzerStudio />
</ErrorBoundary>
```

---

### 7.2 Rate Limiting

**Implement Rate Limiter**:
```typescript
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

// Use in API calls
const result = await rateLimiter.enqueue(() =>
  generateImage(prompt, aspectRatio, model, images)
);
```

---

### 7.3 Performance Optimization

**Lazy Loading**:
```typescript
const Lightbox = React.lazy(() => import('./components/Lightbox'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));

// Usage with Suspense
<Suspense fallback={<Loader />}>
  <Lightbox images={images} />
</Suspense>
```

**Memoization**:
```typescript
const memoizedParseTimestamp = useMemo(
  () => storyboard.map(s => parseTimestamp(s.timestamp)),
  [storyboard]
);

const MemoizedStoryboardCard = React.memo(StoryboardCard);
```

---

### 7.4 Accessibility

**Add ARIA Labels**:
```typescript
<button
  onClick={handleAnalyze}
  aria-label="Analyze video advertisement"
  aria-disabled={appState === 'analyzing'}
>
  Analyze Video
</button>

<input
  type="file"
  accept="video/*"
  aria-label="Upload video file"
  onChange={handleFileChange}
/>
```

**Keyboard Navigation**:
- Tab through all interactive elements
- Enter/Space activate buttons
- Escape closes modals
- Arrow keys in lightbox

---

## Phase 8: Documentation & Handoff

### 8.1 Create README for Integration

**Create `VIDEO_ANALYZER_README.md`**:
```markdown
# Video Analyzer Studio Integration

## Quick Start

\`\`\`bash
npm install
# Set GEMINI_API_KEY in .env.local
npm run dev
\`\`\`

## Integration

\`\`\`typescript
import { VideoAnalyzerStudio } from './video-analyzer';

<VideoAnalyzerStudio />
\`\`\`

## Features

- Video ad analysis with Gemini AI
- Key frame storyboard generation
- Static ad concept creation
- Image generation (Imagen + Nano Banana)
- Scene variation compositing
- Bulk download (ZIP)

## Dependencies

- @google/genai ^1.21.0
- fflate 0.8.2
- React 19.1.1

## API Key Management

Set GEMINI_API_KEY environment variable.

For AI Studio integration, implement window.aistudio API.
```

---

### 8.2 Code Comments

**Add JSDoc comments to key functions**:
```typescript
/**
 * Analyzes a video ad using Gemini API
 * @param videoFile - Video file to analyze
 * @param model - Analysis model ('gemini-2.5-pro' or 'gemini-2.5-flash')
 * @param onProgress - Progress callback function
 * @returns Promise with analysis and processed file info
 */
export const analyzeVideo = async (
  videoFile: File,
  model: AnalysisModel,
  onProgress: (message: string) => void
): Promise<{ analysis: VideoAnalysis; processedFile: { uri: string; mimeType: string } }> => {
  // ...
};
```

---

## Final Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] No console errors in browser
- [ ] ESLint/Prettier applied
- [ ] Code reviewed
- [ ] Performance profiled (no memory leaks)

### Functionality
- [ ] All features working
- [ ] Error handling comprehensive
- [ ] API key management working
- [ ] Mock data mode working
- [ ] Downloads working
- [ ] Tab switching smooth

### Documentation
- [ ] All 6 documentation files created
- [ ] README updated
- [ ] Code comments added
- [ ] Integration guide clear
- [ ] API reference complete

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] Edge cases handled
- [ ] Error scenarios tested

### Production
- [ ] Error boundaries added
- [ ] Rate limiting implemented
- [ ] Performance optimized
- [ ] Accessibility verified
- [ ] Build succeeds
- [ ] Bundle size acceptable

---

## Troubleshooting Common Issues

### Issue: "API key not valid"
**Solution**: Check environment variable, verify key in Google AI Studio

### Issue: Video upload times out
**Solution**: Check file size (< 100MB), increase polling max retries

### Issue: Frame extraction fails
**Solution**: Ensure video codec supported, check browser compatibility

### Issue: JSON parse error on analysis
**Solution**: Use AnalysisErrorCard, retry analysis, check system prompt

### Issue: Image generation fails
**Solution**: Check model availability, verify prompt length, check quota

### Issue: Tab doesn't switch
**Solution**: Check `videoAnalysis !== null` condition

### Issue: Downloads don't work
**Solution**: Check fflate installation, verify blob creation

---

## Support & Resources

- **Main Guide**: VIDEO_ANALYZER_INTEGRATION_GUIDE.md
- **System Prompts**: SYSTEM_PROMPTS_REFERENCE.md
- **API Guide**: API_INTEGRATION_GUIDE.md
- **Components**: UI_COMPONENTS_GUIDE.md
- **Data Processing**: DATA_PROCESSING_GUIDE.md
- **This Checklist**: IMPLEMENTATION_CHECKLIST.md

---

**Son Güncelleme**: 2025-11-03
**Versiyon**: 1.0.0

**Başarılar!** 🚀
