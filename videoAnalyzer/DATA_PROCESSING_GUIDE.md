# Data Processing Guide - Video Analyzer Studio

Bu doküman, Video Analyzer Studio'nun tüm veri işleme pipeline'larını detaylı olarak açıklar.

---

## İçindekiler

1. [Video Analysis Response Processing](#1-video-analysis-response-processing)
2. [Frame Extraction Logic](#2-frame-extraction-logic)
3. [State Transformations](#3-state-transformations)
4. [Download Functionality](#4-download-functionality)
5. [Aspect Ratio Handling](#5-aspect-ratio-handling)
6. [Timestamp Processing](#6-timestamp-processing)

---

## 1. Video Analysis Response Processing

### JSON Extraction from Markdown

```typescript
const parseAnalysisResponse = (responseText: string): VideoAnalysis => {
  // Pattern 1: Fenced JSON code block
  // Pattern 2: Raw JSON object
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);

  if (!jsonMatch) {
    throw new Error("Could not find a JSON object in the response.");
  }

  // Extract JSON string
  const jsonString = jsonMatch[1] || jsonMatch[2];
  // Group 1: Content inside ```json ... ```
  // Group 2: Raw JSON starting with {

  return JSON.parse(jsonString);
};
```

**Regex Breakdown**:
```regex
/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/

Fence Pattern:              Raw JSON Pattern:
```json\s*                  ({[\s\S]*})
  ↓                            ↓
  Three backticks           Opening brace
  "json" literal            Capture everything
  Optional whitespace       Until closing brace

([\s\S]*?)
  ↓
  Capture Group 1
  Non-greedy match
  Any character (including newlines)

\s*```
  ↓
  Optional whitespace
  Closing three backticks
```

### Key Validation

```typescript
const parsedObject = JSON.parse(jsonString);

// Required top-level keys
const requiredKeys = [
  'analysis',
  'concept_approaches',
  'storyboard',
  'overall_video_style_prompt'
];

for (const key of requiredKeys) {
  if (!parsedObject[key]) {
    throw new Error(`Missing required key: ${key}`);
  }
}

// Validate storyboard structure
if (!Array.isArray(parsedObject.storyboard)) {
  throw new Error('Storyboard must be an array');
}

// Validate storyboard items
for (const [index, item] of parsedObject.storyboard.entries()) {
  if (typeof item.still_prompt !== 'string') {
    throw new Error(`Storyboard item ${index} missing still_prompt`);
  }
  if (typeof item.video_prompt !== 'string') {
    throw new Error(`Storyboard item ${index} missing video_prompt`);
  }
}

return parsedObject as VideoAnalysis;
```

### Error Handling with Raw Response

```typescript
export class JsonParseError extends Error {
  public rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = 'JsonParseError';
    this.rawResponse = rawResponse;
  }
}

// Usage
try {
  const analysis = parseAnalysisResponse(responseText);
} catch (error) {
  if (error instanceof SyntaxError) {
    // JSON.parse failed
    throw new JsonParseError(
      "Failed to parse the AI's response. Malformed JSON.",
      responseText
    );
  } else {
    // Validation failed
    throw new JsonParseError(
      `Validation failed: ${error.message}`,
      responseText
    );
  }
}
```

### Raw Response Display (AnalysisErrorCard)

```typescript
// In App.tsx
catch (err) {
  if (err instanceof JsonParseError) {
    setAnalysisParseError(err.rawResponse);
    // Show in AnalysisErrorCard component
  }
}

// In AnalysisErrorCard.tsx
<div className="bg-gray-800 rounded-xl p-6">
  <h3 className="text-xl font-bold text-red-400 mb-4">
    Analysis Failed - JSON Parse Error
  </h3>

  <p className="text-gray-300 mb-4">
    The AI model returned a response, but it couldn't be parsed as valid JSON.
    You can review the raw response below and retry the analysis.
  </p>

  <div className="bg-gray-900 rounded-lg p-4 mb-4">
    <div className="flex justify-between items-center mb-2">
      <h4 className="text-sm font-semibold text-gray-400">Raw Response</h4>
      <button
        onClick={() => navigator.clipboard.writeText(rawResponse)}
        className="text-xs bg-gray-700 px-2 py-1 rounded"
      >
        Copy
      </button>
    </div>
    <textarea
      value={rawResponse}
      readOnly
      rows={15}
      className="w-full bg-gray-950 text-gray-300 p-3 rounded font-mono text-xs resize-none"
    />
  </div>

  <button
    onClick={onRetry}
    disabled={isRetrying}
    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
  >
    {isRetrying ? 'Retrying...' : 'Retry Analysis'}
  </button>
</div>
```

---

## 2. Frame Extraction Logic

### Overview

```
Video File → HTMLVideoElement → Seek to Timestamps → Canvas Capture → Base64 Data URLs
```

### Complete Implementation

```typescript
useEffect(() => {
  if (!videoFile || !videoAnalysis?.storyboard || videoAnalysis.storyboard.length === 0) {
    setExtractedFrames([]);
    return;
  }

  const extractFrames = async () => {
    setIsExtractingFrames(true);
    setExtractedFrames(Array(videoAnalysis.storyboard.length).fill(null));

    // Step 1: Create video element
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;

    // Step 2: Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Step 3: Wait for metadata
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        resolve();
      };
      video.onerror = () => reject("Error loading video metadata.");
    });

    // Step 4: Parse all timestamps
    const parsedTimestamps = videoAnalysis.storyboard.map(s => parseTimestamp(s.timestamp));

    // Step 5: Extract each frame
    const capturedFrames: (string | null)[] = [];

    for (let i = 0; i < videoAnalysis.storyboard.length; i++) {
      const originalTime = parsedTimestamps[i];
      let timeToCapture = originalTime;

      // Timestamp adjustment for middle scenes
      if (i > 0 && i < videoAnalysis.storyboard.length - 1) {
        const nextTime = parsedTimestamps[i + 1];
        const duration = nextTime - originalTime;
        if (duration > 0) {
          timeToCapture += duration / 3; // 33% into next scene
        }
      }

      // Seek to target time
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
          resolve();
        };
        const onError = () => {
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
          reject(`Error seeking to ${timeToCapture}s`);
        };

        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);

        // Ensure we don't seek past video duration
        video.currentTime = Math.min(timeToCapture, video.duration);
      });

      // Capture frame
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedFrames.push(canvas.toDataURL('image/jpeg'));
      } else {
        capturedFrames.push(null);
      }
    }

    setExtractedFrames(capturedFrames);
    URL.revokeObjectURL(videoUrl);
    setIsExtractingFrames(false);
  };

  extractFrames().catch(error => {
    console.error("Failed to extract frames:", error);
    setError("Failed to extract key frames from the video.");
    setIsExtractingFrames(false);
  });

}, [videoFile, videoAnalysis]);
```

### Timestamp Adjustment Algorithm

**Neden Gerekli?**
- AI'ın verdiği timestamp genellikle scene'in başlangıcı
- Başlangıç frame'leri genelde transition'da veya blurry
- 1/3 kuralı daha representative bir frame yakalamayı sağlar

**Algorithm**:
```typescript
// For first scene: Use exact timestamp
if (i === 0) {
  timeToCapture = originalTime;
}

// For middle scenes: Add 1/3 of duration
else if (i > 0 && i < storyboard.length - 1) {
  const nextTime = parsedTimestamps[i + 1];
  const duration = nextTime - originalTime;

  if (duration > 0) {
    timeToCapture = originalTime + (duration / 3);
  }
}

// For last scene: Use exact timestamp
else {
  timeToCapture = originalTime;
}
```

**Örnek**:
```
Scene 1: 00:00.000 → Use 00:00.000 (first scene)
Scene 2: 00:02.500 → 00:02.500 + (00:05.000 - 00:02.500) / 3 = 00:03.333
Scene 3: 00:05.000 → 00:05.000 + (00:08.000 - 00:05.000) / 3 = 00:06.000
Scene 4: 00:08.000 → Use 00:08.000 (last scene)
```

### Canvas Capture Details

```typescript
// Set canvas dimensions to match video
canvas.width = video.videoWidth;   // e.g., 1920
canvas.height = video.videoHeight; // e.g., 1080

// Draw video frame to canvas
context.drawImage(
  video,                    // Source
  0, 0,                     // Source x, y
  canvas.width,             // Source width
  canvas.height             // Source height
);

// Convert to data URL (JPEG format)
const dataURL = canvas.toDataURL('image/jpeg');
// Returns: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
```

**Quality Considerations**:
```typescript
// Default quality: 0.92 (92%)
canvas.toDataURL('image/jpeg'); // 92% quality

// Custom quality (0.0 - 1.0)
canvas.toDataURL('image/jpeg', 0.8); // 80% quality (smaller file)
canvas.toDataURL('image/jpeg', 1.0); // 100% quality (larger file)
```

---

## 3. State Transformations

### VideoAnalysis → UI State

```typescript
// API Response
interface VideoAnalysisRaw {
  analysis: string;                    // Markdown string
  concept_approaches: string;          // Markdown string
  overall_video_style_prompt: string;  // Plain string
  storyboard: StoryboardScene[];       // Array
}

// UI Enhanced State
interface VideoAnalysisEnhanced extends VideoAnalysisRaw {
  storyboard: StoryboardSceneEnhanced[];
}

interface StoryboardSceneEnhanced extends StoryboardScene {
  generated_images?: string[];  // Added by scene variation generation
}

// Transformation
const enhanceVideoAnalysis = (raw: VideoAnalysisRaw): VideoAnalysisEnhanced => {
  return {
    ...raw,
    storyboard: raw.storyboard.map(scene => ({
      ...scene,
      generated_images: []  // Initialize empty array
    }))
  };
};
```

### AdIdea Creation

```typescript
// API Response
interface AdIdeaRaw {
  title: string;
  description: string;
  layout: string;
  cta: string;
  text: { headline: string; body: string; disclaimer: string };
  subjects: string;
  environment: string;
  vibe: string;
  creatives: string;
  generation_prompt: string;
}

// UI Enhanced State
interface AdIdeaEnhanced extends AdIdeaRaw {
  id: string;                  // crypto.randomUUID()
  generatedImages: string[];   // base64 data URLs
}

// Transformation
const enhanceAdIdeas = (raw: AdIdeaRaw[]): AdIdeaEnhanced[] => {
  return raw.map(idea => ({
    ...idea,
    id: crypto.randomUUID(),
    generatedImages: []
  }));
};

// Usage
const ideas = await generateAdConcept(/* ... */);
const enhancedIdeas = enhanceAdIdeas(ideas);
setGeneratedAds(prev => [...enhancedIdeas, ...prev]); // PREPEND
```

### Image Generation Updates

```typescript
// Update AdIdea with new image
const handleImageGenerated = (ideaId: string, imageUrl: string) => {
  setGeneratedAds(prevAds =>
    prevAds.map(ad => {
      if (ad.id === ideaId) {
        return {
          ...ad,
          generatedImages: [imageUrl, ...(ad.generatedImages || [])] // PREPEND
        };
      }
      return ad;
    })
  );
};

// Update StoryboardScene with new image
const updateSceneImage = (sceneIndex: number, imageUrl: string) => {
  setVideoAnalysis(prev => {
    if (!prev) return null;

    const newStoryboard = [...prev.storyboard];
    const currentScene = newStoryboard[sceneIndex];

    newStoryboard[sceneIndex] = {
      ...currentScene,
      generated_images: [imageUrl, ...(currentScene.generated_images || [])] // PREPEND
    };

    return { ...prev, storyboard: newStoryboard };
  });
};
```

**Array Ordering**:
- ✅ **PREPEND** (unshift): Newest images first
- ❌ **APPEND** (push): Oldest images first

**Neden PREPEND?**
- User en son generate ettiği image'ı ilk görmek ister
- Gallery'de en üstte newest image
- Better UX for iterative generation

---

## 4. Download Functionality

### Data URL to Uint8Array

```typescript
const dataUrlToUint8Array = async (dataUrl: string): Promise<Uint8Array> => {
  // Fetch as blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  // Convert to ArrayBuffer
  const arrayBuffer = await blob.arrayBuffer();

  // Return Uint8Array
  return new Uint8Array(arrayBuffer);
};
```

### Individual Scene Download

```typescript
const downloadScene = async (index: number) => {
  const scene = videoAnalysis.storyboard[index];
  const frameDataUrl = extractedFrames[index];
  const timestampId = scene.timestamp.replace(/[:.]/g, '_');

  const zipData: { [key: string]: Uint8Array } = {};
  const textEncoder = new TextEncoder();

  // 1. Add frame image
  if (frameDataUrl) {
    zipData[`frame-${timestampId}.jpeg`] = await dataUrlToUint8Array(frameDataUrl);
  }

  // 2. Add scene JSON
  const sceneJson = {
    ...scene,
    frame_filename: frameDataUrl ? `frame-${timestampId}.jpeg` : null,
    extracted_at: new Date().toISOString()
  };

  zipData[`scene-${timestampId}.json`] = textEncoder.encode(
    JSON.stringify(sceneJson, null, 2)
  );

  // 3. Create ZIP
  const zipped = fflate.zipSync(zipData);

  // 4. Download
  const blob = new Blob([zipped], { type: 'application/zip' });
  downloadBlob(blob, `scene_assets_${timestampId}.zip`);
};
```

### Bulk Download (All Assets)

```typescript
const downloadAllAssets = async () => {
  const zipData: { [key: string]: Uint8Array } = {};
  const textEncoder = new TextEncoder();

  // 1. Add original video
  if (videoFile) {
    const videoBuffer = await videoFile.arrayBuffer();
    zipData[`video/${videoFile.name}`] = new Uint8Array(videoBuffer);
  }

  // 2. Add summary JSON
  const summaryJson = {
    metadata: {
      created_at: new Date().toISOString(),
      video_filename: videoFile?.name,
      analysis_model: analysisModel,
      total_scenes: videoAnalysis.storyboard.length
    },
    overall_video_style_prompt: videoAnalysis.overall_video_style_prompt,
    analysis: videoAnalysis.analysis,
    concept_approaches: videoAnalysis.concept_approaches,
    storyboard: videoAnalysis.storyboard.map((scene, index) => {
      const originalTime = parseTimestamp(scene.timestamp);
      const timestampId = scene.timestamp.replace(/[:.]/g, '_');

      return {
        index: index,
        timestamp: scene.timestamp,
        original_time_seconds: originalTime,
        frame_filename: extractedFrames[index]
          ? `frames/frame-${timestampId}.jpeg`
          : null,
        scene_json_filename: `scenes/scene-${timestampId}.json`,
        ...scene
      };
    })
  };

  zipData['analysis_summary.json'] = textEncoder.encode(
    JSON.stringify(summaryJson, null, 2)
  );

  // 3. Add all frames
  for (let i = 0; i < videoAnalysis.storyboard.length; i++) {
    const scene = videoAnalysis.storyboard[i];
    const frameDataUrl = extractedFrames[i];
    const timestampId = scene.timestamp.replace(/[:.]/g, '_');

    if (frameDataUrl) {
      zipData[`frames/frame-${timestampId}.jpeg`] = await dataUrlToUint8Array(frameDataUrl);
    }
  }

  // 4. Add all scene JSONs
  for (let i = 0; i < videoAnalysis.storyboard.length; i++) {
    const scene = videoAnalysis.storyboard[i];
    const timestampId = scene.timestamp.replace(/[:.]/g, '_');
    const frameDataUrl = extractedFrames[i];

    const sceneJson = {
      ...scene,
      index: i,
      original_time_seconds: parseTimestamp(scene.timestamp),
      frame_filename: frameDataUrl ? `frame-${timestampId}.jpeg` : null
    };

    zipData[`scenes/scene-${timestampId}.json`] = textEncoder.encode(
      JSON.stringify(sceneJson, null, 2)
    );
  }

  // 5. Create ZIP
  const zipped = fflate.zipSync(zipData);

  // 6. Download
  const blob = new Blob([zipped], { type: 'application/zip' });
  downloadBlob(blob, 'video_analysis_assets.zip');
};
```

### Download Helper

```typescript
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

### ZIP Structure

```
video_analysis_assets.zip
├── video/
│   └── my-video.mp4
├── frames/
│   ├── frame-00_00_000.jpeg
│   ├── frame-00_02_500.jpeg
│   ├── frame-00_05_000.jpeg
│   └── frame-00_08_000.jpeg
├── scenes/
│   ├── scene-00_00_000.json
│   ├── scene-00_02_500.json
│   ├── scene-00_05_000.json
│   └── scene-00_08_000.json
└── analysis_summary.json
```

---

## 5. Aspect Ratio Handling

### Type Definition

```typescript
export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
```

### Tailwind Class Mapping

```typescript
const aspectRatioToClass = (ratio: AspectRatio): string => {
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

### Pixel Dimensions (for Mock Data)

```typescript
const getDimensionsForAspectRatio = (ratio: AspectRatio): { width: number; height: number } => {
  const dimensions: Record<AspectRatio, { width: number; height: number }> = {
    '1:1': { width: 500, height: 500 },
    '3:4': { width: 375, height: 500 },
    '4:3': { width: 500, height: 375 },
    '9:16': { width: 281, height: 500 },
    '16:9': { width: 800, height: 450 },
  };
  return dimensions[ratio] || dimensions['1:1'];
};
```

### API Parameter Conversion

```typescript
// For Imagen models (direct pass)
const response = await ai.models.generateImages({
  model: modelId,
  prompt: prompt,
  config: {
    aspectRatio: aspectRatio, // "3:4", "16:9", etc.
    numberOfImages: 1,
    outputMimeType: 'image/jpeg',
  },
});

// For edit models (no aspect ratio parameter)
// Final image aspect ratio determined by input images
```

### UI Usage

```typescript
// Container with aspect ratio
<div className={`${aspectRatioToClass(aspectRatio)} w-full overflow-hidden rounded-lg`}>
  <img src={imageUrl} className="w-full h-full object-cover" />
</div>

// Empty placeholder with aspect ratio
<div className={`${aspectRatioToClass(aspectRatio)} border-dashed border-2 flex items-center justify-center`}>
  <p>No image generated yet</p>
</div>
```

---

## 6. Timestamp Processing

### Timestamp Format

**AI Output Format**: `MM:SS.ms`

**Examples**:
- `00:00.000` - Start
- `00:03.452` - 3.452 seconds
- `01:25.123` - 1 minute 25.123 seconds

### Parser Implementation

```typescript
const parseTimestamp = (timestamp: string): number => {
  // Split by : or .
  const parts = timestamp.split(/[:.]/);

  if (parts.length < 2) {
    console.warn(`Invalid timestamp format: ${timestamp}`);
    return 0;
  }

  const minutes = parseInt(parts[0], 10) || 0;
  const seconds = parseInt(parts[1], 10) || 0;
  const milliseconds = parts.length > 2 ? parseInt(parts[2], 10) || 0 : 0;

  // Convert to total seconds
  return minutes * 60 + seconds + milliseconds / 1000;
};

// Examples
parseTimestamp("00:00.000")  // → 0.0
parseTimestamp("00:03.452")  // → 3.452
parseTimestamp("01:25.123")  // → 85.123
parseTimestamp("02:30")      // → 150.0 (no ms)
```

### Formatter Implementation

```typescript
const formatTimeWithMS = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) {
    return "00:00.000";
  }

  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds - Math.floor(timeInSeconds)) * 1000);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

// Examples
formatTimeWithMS(0)      // → "00:00.000"
formatTimeWithMS(3.452)  // → "00:03.452"
formatTimeWithMS(85.123) // → "01:25.123"
```

### Timestamp Display in UI

```typescript
// In StoryboardCard
{addedDuration > 0 ? (
  // Show both original and adjusted
  <div className="bg-gray-900/50 p-2 rounded-md font-mono text-sm">
    <button
      onClick={() => onTimestampClick(adjustedTime)}
      className="text-violet-300 hover:text-violet-200 transition-colors"
      title="Adjusted timestamp (click to seek video)"
    >
      {formatTimeWithMS(adjustedTime)}
    </button>
    <span className="text-gray-400 mx-2">=</span>
    <button
      onClick={() => onTimestampClick(originalTime)}
      className="text-amber-300 hover:text-amber-200 transition-colors"
      title="Original AI timestamp (click to seek video)"
    >
      {scene.timestamp}
    </button>
    <span className="text-green-400 ml-2">
      + {addedDuration.toFixed(2)}s
    </span>
  </div>
) : (
  // Show only original
  <button
    onClick={() => onTimestampClick(originalTime)}
    className="text-amber-300 hover:text-amber-200 font-mono text-sm"
  >
    {scene.timestamp}
  </button>
)}
```

### Video Seeking

```typescript
const handleSeekVideo = (timeInSeconds: number) => {
  if (videoRef.current) {
    videoRef.current.currentTime = timeInSeconds;

    // Optional: Play from that point
    // videoRef.current.play();
  }
};
```

---

## Best Practices Özeti

### ✅ DO

1. **JSON validation her zaman yap** (required keys check)
2. **Raw response sakla** (debugging için JsonParseError)
3. **Timestamp'leri adjust et** (1/3 rule for better frames)
4. **Array prepend kullan** (newest images first)
5. **Canvas dimensions match video** (quality için)
6. **ZIP metadata ekle** (context için summary JSON)
7. **Data URL cleanup** (memory leaks için revoke)
8. **Error boundaries kullan** (graceful degradation)

### ❌ DON'T

1. **JSON parse without try-catch** (unexpected errors)
2. **Exact timestamp kullanma** (transition frames bad)
3. **Array append** (UX poor)
4. **Hardcoded canvas sizes** (quality loss)
5. **Memory leaks** (URL.revokeObjectURL unutma)
6. **Blocking operations** (async/await kullan)
7. **Unvalidated state transformations** (type safety critical)

---

## Data Flow Diagram

```
┌─────────────────┐
│  API Response   │
│  (Raw JSON)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse & Validate│
│  (parseAnalysis) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  VideoAnalysis  │
│  (Typed Object) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UI Enhancement │
│  (add IDs, etc) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  State Update   │
│  (React State)  │
└────────┬────────┘
         │
         ├───────────────┐
         │               │
         ▼               ▼
┌─────────────────┐  ┌─────────────────┐
│ Frame Extract   │  │ UI Render       │
│ (Canvas API)    │  │ (Components)    │
└─────────────────┘  └─────────────────┘
         │               │
         ▼               ▼
┌─────────────────┐  ┌─────────────────┐
│ extractedFrames │  │ User Interaction│
│ (Base64 URLs)   │  │ (Generate, etc) │
└─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Download       │
│  (ZIP Creation) │
└─────────────────┘
```

---

**Son Güncelleme**: 2025-11-03
**Versiyon**: 1.0.0
