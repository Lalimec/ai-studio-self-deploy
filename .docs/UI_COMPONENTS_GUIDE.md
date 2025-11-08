# UI Components Guide - Video Analyzer Studio

Bu doküman, Video Analyzer Studio'nun tüm UI component'lerini detaylı olarak açıklar.

---

## Component Hierarchy

```
App.tsx (Root Container)
├── Header.tsx
├── SettingsModal.tsx (Portal)
├── Tab: Analyze
│   ├── FileUpload.tsx (Video)
│   │   └── videoRef (HTMLVideoElement)
│   ├── AnalysisProgress (Internal)
│   ├── AnalysisErrorCard.tsx
│   ├── SceneGenerationControls.tsx
│   │   └── FileUpload.tsx (Subject Images)
│   ├── StoryboardCard.tsx
│   │   ├── PromptDisplay (Internal)
│   │   ├── SceneItem (Internal)
│   │   └── Lightbox.tsx (Portal)
│   ├── AdAnalysisCard.tsx
│   │   └── MarkdownRenderer.tsx
│   └── ConceptApproachCard.tsx
│       ├── MarkdownRenderer.tsx
│       └── InstructionModal (Internal Portal)
├── Tab: Generate
│   ├── FileUpload.tsx (Subject Images)
│   ├── Textarea (Additional Instructions)
│   ├── Textarea (Nano Banana Prompt)
│   └── AdIdeaCard.tsx (Mapped)
│       ├── DetailItem (Internal)
│       └── Lightbox.tsx (Portal)
├── Loader.tsx
└── Footer.tsx
```

---

## App.tsx - Main Application Container

### Sorumluluklar

1. Global state management
2. Tab routing (Analyze / Generate)
3. API key validation
4. Video analysis coordination
5. Concept generation coordination
6. Frame extraction orchestration

### Key Props & State

```typescript
// Bu component props almaz (root)

// Major State Groups
interface AppState {
  // Files
  videoFile: File | null;
  subjectImages: File[];
  sceneSubjectImages: File[];

  // App State
  appState: 'idle' | 'analyzing' | 'analyzed' | 'generating';
  activeTab: 'analyze' | 'generate';
  hasSelectedApiKey: boolean;

  // Data
  videoAnalysis: VideoAnalysis | null;
  processedVideo: { uri: string; mimeType: string } | null;
  extractedFrames: (string | null)[];
  generatedAds: AdIdea[];

  // UI State
  error: string | null;
  analysisLogs: string[];
  analysisParseError: string | null;
  generatingApproach: string | null;
  generatingScene: number | 'all' | null;

  // Settings
  analysisModel: AnalysisModel;
  imageModel: ImageModel;
  aspectRatio: AspectRatio;
  // ... more settings
}
```

### Key Handlers

```typescript
// Video Management
handleVideoChange(files: File[]): void;
handleAnalyze(): Promise<void>;
handleRetryAnalysis(): Promise<void>;
handleSeekVideo(timeInSeconds: number): void;

// Concept Generation
handleGenerateConcept(selectedApproach?, specificInstructions?): Promise<void>;
handleImageGenerated(ideaId: string, imageUrl: string): void;

// Scene Variations
handleGenerateSceneVariation(index: number | 'all'): Promise<void>;

// API Key
handleSelectKey(): Promise<void>;
handleApiKeyError(err: unknown): boolean;

// State Management
resetState(): void;
```

### Conditional Rendering Logic

```typescript
// 1. Checking API key
if (isCheckingApiKey) {
  return <Loader message="Verifying API key..." />;
}

// 2. No API key
if (!hasSelectedApiKey) {
  return <APIKeyPromptScreen onSelectKey={handleSelectKey} />;
}

// 3. Main app
return (
  <div>
    <Header />
    <SettingsButton onClick={() => setIsSettingsModalOpen(true)} />

    <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

    {/* Tab-specific content */}
    {activeTab === 'analyze' && <AnalyzeTab />}
    {activeTab === 'generate' && <GenerateTab />}

    <Footer />
    <SettingsModal />
  </div>
);
```

---

## FileUpload.tsx - File Upload Component

### Props

```typescript
interface FileUploadProps {
  id: string;
  label: string;
  accept: string;        // "video/*" or "image/*"
  multiple?: boolean;
  onChange: (files: FileList) => void;
  file?: File;           // Single file mode
  files?: File[];        // Multiple files mode
  videoRef?: React.RefObject<HTMLVideoElement>; // For video preview
}
```

### Features

1. **Drag & Drop**:
   ```typescript
   const handleDragOver = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragging(true);
   };

   const handleDrop = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragging(false);
     if (e.dataTransfer.files) {
       onChange(e.dataTransfer.files);
     }
   };
   ```

2. **File Validation**:
   ```typescript
   // Video: max 100MB
   if (file.type.startsWith('video/') && file.size > 100 * 1024 * 1024) {
     alert('Video file too large (max 100MB)');
     return;
   }

   // Image: max 10MB
   if (file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) {
     alert('Image file too large (max 10MB)');
     return;
   }
   ```

3. **Video Preview**:
   ```typescript
   {file && file.type.startsWith('video/') && videoRef && (
     <video
       ref={videoRef}
       src={URL.createObjectURL(file)}
       controls
       className="w-full rounded-lg"
     />
   )}
   ```

4. **Image Gallery**:
   ```typescript
   {files && files.length > 0 && (
     <div className="grid grid-cols-2 gap-2">
       {files.map((file, idx) => (
         <div key={idx} className="relative">
           <img
             src={URL.createObjectURL(file)}
             alt={file.name}
             className="w-full h-24 object-cover rounded"
           />
           <button
             onClick={() => handleRemoveFile(idx)}
             className="absolute top-1 right-1 bg-red-600 rounded-full p-1"
           >
             ✕
           </button>
         </div>
       ))}
     </div>
   )}
   ```

### Styling States

```typescript
const borderClasses = isDragging
  ? 'border-indigo-500 bg-indigo-900/20'
  : 'border-gray-600 hover:border-gray-500';

const cursorClasses = 'cursor-pointer';

<div
  className={`border-2 border-dashed rounded-lg p-6 ${borderClasses} ${cursorClasses}`}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  onClick={() => inputRef.current?.click()}
>
  {/* Upload UI */}
</div>
```

---

## StoryboardCard.tsx - Storyboard Display

### Props

```typescript
interface StoryboardCardProps {
  storyboard: StoryboardScene[];
  videoFile: File | null;
  onTimestampClick: (timeInSeconds: number) => void;
  overallVideoStylePrompt: string;
  extractedFrames: (string | null)[];
  isExtractingFrames: boolean;
  onGenerateScene: (index: number) => void;
  generatingScene: number | 'all' | null;
  sceneAspectRatio: AspectRatio;
}
```

### Internal State

```typescript
interface ProcessedScene {
  scene: StoryboardScene;
  originalTime: number;    // Parsed from timestamp
  adjustedTime: number;     // originalTime + duration/3
  addedDuration: number;    // adjustedTime - originalTime
}

const [processedScenes, setProcessedScenes] = useState<ProcessedScene[]>([]);
const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
const [isZippingAll, setIsZippingAll] = useState(false);
const [zippingSceneIndex, setZippingSceneIndex] = useState<number | null>(null);
```

### Key Functions

#### Timestamp Processing

```typescript
useEffect(() => {
  const parsed = storyboard.map((scene, index) => {
    const originalTime = parseTimestamp(scene.timestamp);
    let adjustedTime = originalTime;
    let addedDuration = 0;

    // Adjust for middle scenes
    if (index > 0 && index < storyboard.length - 1) {
      const nextTime = parseTimestamp(storyboard[index + 1].timestamp);
      const duration = nextTime - originalTime;

      if (duration > 0) {
        adjustedTime = originalTime + duration / 3;
        addedDuration = adjustedTime - originalTime;
      }
    }

    return {
      scene,
      originalTime,
      adjustedTime,
      addedDuration
    };
  });

  setProcessedScenes(parsed);
}, [storyboard]);
```

#### Download Individual Scene

```typescript
const handleDownloadScene = async (index: number) => {
  setZippingSceneIndex(index);

  const scene = processedScenes[index].scene;
  const frameDataUrl = extractedFrames[index];
  const timestampId = scene.timestamp.replace(/[:.]/g, '_');

  const zipData: { [key: string]: Uint8Array } = {};
  const textEncoder = new TextEncoder();

  // Add frame image
  if (frameDataUrl) {
    zipData[`frame-${timestampId}.jpeg`] = await dataUrlToUint8Array(frameDataUrl);
  }

  // Add scene JSON
  const sceneJson = {
    ...scene,
    frame_filename: frameDataUrl ? `frame-${timestampId}.jpeg` : null
  };
  zipData[`scene-${timestampId}.json`] = textEncoder.encode(
    JSON.stringify(sceneJson, null, 2)
  );

  // Create ZIP
  const zipped = fflate.zipSync(zipData);
  const blob = new Blob([zipped], { type: 'application/zip' });

  // Download
  downloadBlob(blob, `scene_assets_${timestampId}.zip`);

  setZippingSceneIndex(null);
};
```

#### Download All Assets

```typescript
const handleDownloadAll = async () => {
  setIsZippingAll(true);

  const zipData: { [key: string]: Uint8Array } = {};
  const textEncoder = new TextEncoder();

  // Add original video
  if (videoFile) {
    const videoBuffer = await videoFile.arrayBuffer();
    zipData[`video/${videoFile.name}`] = new Uint8Array(videoBuffer);
  }

  // Add summary JSON
  const summaryJson = {
    overall_video_style_prompt: overallVideoStylePrompt,
    storyboard: processedScenes.map((pScene, index) => ({
      ...pScene.scene,
      original_time_seconds: pScene.originalTime,
      adjusted_time_seconds: pScene.adjustedTime,
      added_duration: pScene.addedDuration,
      frame_filename: extractedFrames[index]
        ? `frames/frame-${pScene.scene.timestamp.replace(/[:.]/g, '_')}.jpeg`
        : null
    }))
  };
  zipData['analysis_summary.json'] = textEncoder.encode(
    JSON.stringify(summaryJson, null, 2)
  );

  // Add all frames and scene JSONs
  for (let i = 0; i < processedScenes.length; i++) {
    const pScene = processedScenes[i];
    const frameDataUrl = extractedFrames[i];
    const timestampId = pScene.scene.timestamp.replace(/[:.]/g, '_');

    if (frameDataUrl) {
      zipData[`frames/frame-${timestampId}.jpeg`] = await dataUrlToUint8Array(frameDataUrl);
    }

    const sceneJson = {
      ...pScene.scene,
      original_time_seconds: pScene.originalTime,
      adjusted_time_seconds: pScene.adjustedTime,
      frame_filename: frameDataUrl ? `frame-${timestampId}.jpeg` : null
    };
    zipData[`scenes/scene-${timestampId}.json`] = textEncoder.encode(
      JSON.stringify(sceneJson, null, 2)
    );
  }

  // Create ZIP
  const zipped = fflate.zipSync(zipData);
  const blob = new Blob([zipped], { type: 'application/zip' });

  // Download
  downloadBlob(blob, 'video_analysis_assets.zip');

  setIsZippingAll(false);
};
```

### Rendering Structure

```typescript
<div className="bg-gray-800 rounded-xl p-6">
  {/* Header with download all button */}
  <div className="flex justify-between items-center mb-6">
    <h3>Storyboard</h3>
    <button onClick={handleDownloadAll} disabled={isZippingAll}>
      {isZippingAll ? 'Creating ZIP...' : 'Download All Assets'}
    </button>
  </div>

  {/* Overall video style prompt */}
  {overallVideoStylePrompt && (
    <div className="mb-8 p-4 bg-gray-900/50 rounded-lg">
      <PromptDisplay
        label="Overall Video Style Prompt"
        prompt={overallVideoStylePrompt}
      />
    </div>
  )}

  {/* Scene items */}
  {processedScenes.map((pScene, index) => (
    <SceneItem
      key={index}
      pScene={pScene}
      index={index}
      frameDataUrl={extractedFrames[index]}
      isExtractingFrame={isExtractingFrames && !extractedFrames[index]}
      onTimestampClick={onTimestampClick}
      onGenerateScene={() => onGenerateScene(index)}
      onDownloadScene={() => handleDownloadScene(index)}
      isGenerating={generatingScene === index || generatingScene === 'all'}
      isDownloading={zippingSceneIndex === index}
      sceneAspectRatio={sceneAspectRatio}
    />
  ))}

  {/* Lightbox for frame gallery */}
  {lightboxIndex !== null && (
    <Lightbox
      images={allSceneImages}
      startIndex={lightboxIndex}
      onClose={() => setLightboxIndex(null)}
      captions={imageCaptions}
    />
  )}
</div>
```

### PromptDisplay Component (Internal)

```typescript
const PromptDisplay: React.FC<{
  label: string;
  prompt: string;
}> = ({ label, prompt }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-indigo-300">{label}</h4>
        <button
          onClick={handleCopy}
          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <textarea
        value={prompt}
        readOnly
        rows={4}
        className="w-full bg-gray-900 text-gray-300 p-2 rounded font-mono text-xs resize-none"
      />
    </div>
  );
};
```

---

## AdIdeaCard.tsx - Generated Concept Display

### Props

```typescript
interface AdIdeaCardProps {
  idea: AdIdea;
  index: number;
  aspectRatio: AspectRatio;
  imageModel: ImageModel;
  subjectImages: File[];
  nanoBananaPrompt: string;
  onImageGenerated: (ideaId: string, imageUrl: string) => void;
  isMockDataEnabled: boolean;
  onApiKeyInvalid: () => void;
}
```

### Internal State

```typescript
const [isGenerating, setIsGenerating] = useState(false);
const [error, setError] = useState<string | null>(null);
const [editablePrompt, setEditablePrompt] = useState(idea.generation_prompt);
const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
```

### Key Logic

#### Model-Specific Prompt Selection

```typescript
const promptToUse = imageModel === 'gemini-2.5-flash-image-preview'
  ? nanoBananaPrompt       // Edit model
  : editablePrompt;        // Generation model

const baseImageFiles = imageModel === 'gemini-2.5-flash-image-preview'
  ? subjectImages
  : undefined;

const isGenerationDisabled = isGenerating ||
  (imageModels.find(m => m.id === imageModel)?.requiresImage && subjectImages.length === 0);
```

#### Image Generation

```typescript
const handleGenerateImage = async () => {
  setIsGenerating(true);
  setError(null);

  try {
    if (isMockDataEnabled) {
      // Mock data flow (Picsum)
      const { width, height } = getDimensionsForAspectRatio(aspectRatio);
      const seed = crypto.randomUUID();
      const mockImageUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;

      setTimeout(() => {
        onImageGenerated(idea.id!, mockImageUrl);
        setIsGenerating(false);
      }, 1500);
      return;
    }

    // Real API call
    const base64ImageBytes = await generateImage(
      promptToUse,
      aspectRatio,
      imageModel,
      baseImageFiles
    );

    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
    onImageGenerated(idea.id!, imageUrl);

  } catch (err: any) {
    if (err.message.includes('API key')) {
      onApiKeyInvalid();
    } else {
      setError(`Image generation failed: ${err.message}`);
    }
  } finally {
    setIsGenerating(false);
  }
};
```

### Rendering Structure

```typescript
<div className="bg-gray-800 rounded-xl p-6">
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
    {/* Left Column: Image Gallery (1/4) */}
    <div className="lg:col-span-1">
      <h4>Generated Images</h4>

      {/* Generate Button */}
      <button
        onClick={handleGenerateImage}
        disabled={isGenerationDisabled}
        className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
      >
        {isGenerating ? 'Generating...' :
         idea.generatedImages?.length > 0 ? 'Generate Variation' : 'Generate Image'}
      </button>

      {/* Image Gallery */}
      <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3">
        {/* Loading Placeholder */}
        {isGenerating && (
          <div className={`${aspectRatioClass} flex items-center justify-center bg-gray-900/50`}>
            <svg className="animate-spin h-8 w-8 text-indigo-400">
              {/* Spinner */}
            </svg>
            <p className="text-xs text-gray-400 mt-2">
              Generating with {modelName}...
            </p>
          </div>
        )}

        {/* Generated Images */}
        {idea.generatedImages?.map((url, idx) => (
          <button
            key={idx}
            onClick={() => setLightboxIndex(idx)}
            className={`${aspectRatioClass} relative group w-full overflow-hidden rounded-lg`}
          >
            <img src={url} className="w-full h-full object-cover" />

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg>{/* Zoom icon */}</svg>
            </div>

            {/* Download Button */}
            <button
              onClick={(e) => handleDownload(e, url, idx)}
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-gray-800/90 p-2 rounded-full"
            >
              <svg>{/* Download icon */}</svg>
            </button>
          </button>
        ))}

        {/* Empty State */}
        {!isGenerating && (!idea.generatedImages || idea.generatedImages.length === 0) && (
          <div className={`${aspectRatioClass} border-dashed border-2 border-gray-600 flex items-center justify-center`}>
            <p className="text-gray-500 text-sm">
              Generated images will appear here.
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    </div>

    {/* Right Column: Concept Details (3/4) */}
    <div className="lg:col-span-3">
      <h3 className="text-2xl font-bold text-white mb-4">
        Concept {index + 1}: {idea.title}
      </h3>
      <p className="text-gray-300 mb-6">{idea.description}</p>

      {/* 2-Column Details Grid */}
      <div className="columns-1 md:columns-2 gap-6 mb-6">
        <DetailItem label="Layout" value={idea.layout} />
        <DetailItem label="CTA" value={idea.cta} />

        <div className="break-inside-avoid mb-6">
          <h4 className="font-semibold text-indigo-300 mb-2">Text / Copy</h4>
          <p className="font-semibold text-white">{idea.text.headline}</p>
          <p className="text-gray-300 text-sm mt-1">{idea.text.body}</p>
          {idea.text.disclaimer && (
            <p className="text-gray-400 text-xs mt-1 italic">{idea.text.disclaimer}</p>
          )}
        </div>

        <DetailItem label="Subjects" value={idea.subjects} />
        <DetailItem label="Environment" value={idea.environment} />
        <DetailItem label="Vibe" value={idea.vibe} />
        <DetailItem label="Creatives" value={idea.creatives} />
      </div>

      {/* Editable Generation Prompt */}
      <div className="bg-gray-900/50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-indigo-300">Generation Prompt</h4>
          <button
            onClick={handleCopyPrompt}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
          >
            {copiedPrompt ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <textarea
          value={editablePrompt}
          onChange={(e) => setEditablePrompt(e.target.value)}
          rows={8}
          className="w-full bg-gray-900 text-gray-300 p-3 rounded font-mono text-xs resize-none"
          placeholder="Edit the generation prompt before creating images..."
        />
      </div>
    </div>
  </div>

  {/* Lightbox */}
  {lightboxIndex !== null && idea.generatedImages && (
    <Lightbox
      images={idea.generatedImages}
      startIndex={lightboxIndex}
      onClose={() => setLightboxIndex(null)}
    />
  )}
</div>
```

### DetailItem Component (Internal)

```typescript
const DetailItem: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="break-inside-avoid mb-6">
    <h4 className="font-semibold text-indigo-300 capitalize text-sm mb-1">
      {label}
    </h4>
    <p className="text-gray-300 text-sm">{value}</p>
  </div>
);
```

---

## Lightbox.tsx - Image Viewer

### Props

```typescript
interface LightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
  captions?: string[];
}
```

### Features

1. **Keyboard Navigation**
2. **Mouse Click Navigation**
3. **Backdrop Close**
4. **Image Counter**
5. **Optional Captions**

### Implementation

```typescript
const Lightbox: React.FC<LightboxProps> = ({
  images,
  startIndex,
  onClose,
  captions
}) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white bg-gray-800/80 hover:bg-gray-700 rounded-full p-2 z-10"
        >
          ✕
        </button>

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
            className="absolute left-4 text-white bg-gray-800/80 hover:bg-gray-700 rounded-full p-3"
          >
            ←
          </button>
        )}

        {/* Image */}
        <div
          className="relative max-w-full max-h-full flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
          />

          {/* Caption */}
          {captions && captions[currentIndex] && (
            <p className="mt-4 text-white text-sm text-center max-w-2xl">
              {captions[currentIndex]}
            </p>
          )}

          {/* Counter */}
          <div className="mt-2 text-white text-xs">
            {currentIndex + 1} / {images.length}
          </div>
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-4 text-white bg-gray-800/80 hover:bg-gray-700 rounded-full p-3"
          >
            →
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};
```

---

## Styling Reference

### Color Palette

```css
/* Backgrounds */
--bg-primary: #111827;      /* bg-gray-900 */
--bg-secondary: #1f2937;    /* bg-gray-800 */
--bg-tertiary: #374151;     /* bg-gray-700 */

/* Primary Colors */
--primary: #4f46e5;         /* indigo-600 */
--primary-hover: #4338ca;   /* indigo-700 */

/* Secondary Colors */
--secondary: #9333ea;       /* purple-600 */
--secondary-hover: #7e22ce; /* purple-700 */

/* Accent Colors */
--accent-green: #059669;    /* green-600 */
--accent-amber: #d97706;    /* amber-600 */
--accent-violet: #7c3aed;   /* violet-600 */

/* Semantic Colors */
--error: #dc2626;           /* red-600 */
--error-bg: #7f1d1d;        /* red-900 */
--success: #16a34a;         /* green-600 */
--warning: #f59e0b;         /* amber-500 */

/* Text Colors */
--text-primary: #f9fafb;    /* gray-50 */
--text-secondary: #d1d5db;  /* gray-300 */
--text-tertiary: #9ca3af;   /* gray-400 */
```

### Aspect Ratio Classes

```typescript
const aspectRatioToClass = (ratio: AspectRatio): string => {
  const mapping = {
    '1:1': 'aspect-square',
    '3:4': 'aspect-[3/4]',
    '4:3': 'aspect-[4/3]',
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-[16/9]',
  };
  return mapping[ratio] || 'aspect-square';
};
```

### Common Patterns

```css
/* Card */
.card {
  @apply bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-6;
}

/* Button Primary */
.btn-primary {
  @apply px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-full shadow-lg transition-transform hover:scale-105;
}

/* Button Secondary */
.btn-secondary {
  @apply px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg;
}

/* Input */
.input {
  @apply w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500;
}

/* Textarea */
.textarea {
  @apply w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-none;
}
```

---

## Responsive Design Patterns

### Breakpoints

```typescript
// Tailwind default breakpoints
sm: 640px   // Small devices
md: 768px   // Medium devices
lg: 1024px  // Large devices
xl: 1280px  // Extra large devices
```

### Common Responsive Patterns

```typescript
// Grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

// Columns
<div className="columns-1 md:columns-2 gap-6">

// Padding
<div className="px-4 md:px-8 py-8 md:py-12">

// Text size
<h1 className="text-2xl md:text-3xl lg:text-4xl">

// Hidden on mobile
<div className="hidden lg:block">

// Sticky sidebar
<div className="lg:sticky lg:top-28 lg:self-start">
```

---

**Son Güncelleme**: 2025-11-03
**Versiyon**: 1.0.0
