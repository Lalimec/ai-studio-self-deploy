# Hooks Directory

This directory contains custom React hooks that encapsulate all business logic and state management for each studio.

## Purpose

**Hooks provide:**
- Complete state management for studios
- Business logic separated from UI components
- Integration with service layer
- Event handlers and callbacks
- Reusable logic patterns

**Total**: 7 hooks, ~3,800 lines of TypeScript

## Hook Files

### useHairStudio.ts (456 lines)

**Purpose**: Hair Studio state and logic

**State:**
- `croppedImage`: User's cropped face image
- `generatedImages`: Array of generated hairstyle images
- `pendingImageCount`: Number of images being generated
- `selectedOptions`: Hairstyle, color, accessories, pose

**Key Functions:**
- `onCropConfirm(croppedDataUrl)`: Handles confirmed crop
- `generateHairstyles()`: Triggers batch generation
- `handleDownload(image)`: Downloads single image
- `handleDownloadAll()`: Bulk download
- `prepareForVideo(image)`: Import to Video Studio
- `regenerateHairstyle(image)`: Regenerate specific combination

**Service Integration**: `hairStudioService.ts`

---

### useBabyStudio.ts (~400 lines)

**Purpose**: Baby Studio state with two-parent logic

**State:**
- `parent1`, `parent2`: Parent image states
- `generatedBabyImages`: Array of generated baby images
- `pendingImageCount`: Generation progress
- `selectedOptions`: Age, gender, style, background

**Key Functions:**
- `onCropConfirmParent1(croppedDataUrl)`: Parent 1 crop
- `onCropConfirmParent2(croppedDataUrl)`: Parent 2 crop
- `generateBabies()`: Triggers generation (requires both parents)
- `handleDownload(image)`: Download baby image
- `clearParent1()`, `clearParent2()`: Reset parents

**Service Integration**: `babyStudioService.ts`

**Complexity**: Manages two separate upload/crop flows

---

### useImageStudioLogic.ts (648 lines) ⭐ **MOST COMPLEX**

**Purpose**: Advanced batch image generation with extensive features

**State:**
- `imageFiles`: Array of uploaded images (50+ supported)
- `promptContents`: Prompts mapped to each image
- `generationResults`: Generated images per source
- `isGenerating`: Generation in progress
- `progress`: Current/total tracking
- `selectedModel`: Gemini/NanoBanana/Seedream/Flux
- `aspectRatio`, `customDimensions`: Size options
- `filenameTemplate`: Custom naming pattern

**Advanced Features:**

1. **JSON Import/Export**:
   - `importPrompts(jsonString)`: Load prompts from JSON
   - `exportPrompts()`: Export current prompts as JSON

2. **Prompt Engineering**:
   - `translatePrompts()`: Auto-translate to English
   - `enhancePrompts()`: AI-powered improvement
   - `generateVariations()`: Create prompt variants
   - `generatePromptList(template)`: Batch generate

3. **Batch Operations**:
   - `handleMultipleImages(files)`: Upload multiple
   - `cropAllImages()`: Batch cropping workflow
   - `generateAll()`: Generate all combinations
   - `downloadAll()`: Bulk download with custom filenames

4. **EXIF Embedding**:
   - Embeds prompt in JPEG/PNG metadata
   - Enables reproducibility

**Service Integration**: `geminiService.ts` directly (no studio service)

**Used by**: `components/ImageStudio.tsx`

---

### useVideoStudio.ts (443 lines)

**Purpose**: Video generation from images

**State:**
- `studioImages`: Array of uploaded images
- `videoProgress`: Map of image ID → progress state
- `generatedVideos`: Map of image ID → video URL
- `videoPrompts`: Map of image ID → custom prompt

**Key Functions:**
- `handleImageUpload(files)`: Upload images
- `editPrompt(imageId, prompt)`: Custom prompt per image
- `generateVideo(image)`: Start video generation
- `pollVideoProgress(image)`: Poll until complete
- `downloadVideo(videoUrl)`: Download completed video
- `deleteImage(imageId)`: Remove image

**Workflow:**
```
1. Upload image(s)
2. Edit prompts (optional)
3. Generate video → Polling starts
4. Progress updates via callback
5. Video URL returned → Download
```

**Service Integration**: `videoService.ts`

**Complexity**: Polling management, progress tracking per image

---

### useTimelineStudio.ts (741 lines)

**Purpose**: Timeline creation and video stitching

**State:**
- `studioImages`: Uploaded images
- `timelinePairs`: Array of image pairs with prompts
- `pairVideos`: Map of pair → video URL
- `stitchingProgress`: Stitching state
- `finalVideo`: Stitched result

**Key Functions:**
- `createPair(image1, image2)`: Create timeline pair
- `editPairPrompt(pairId, prompt)`: Custom transition prompt
- `generatePairVideo(pair)`: Generate transition
- `stitchAllVideos()`: Stitch timeline into final video
- `reorderPairs(newOrder)`: Drag-and-drop reordering
- `deletePair(pairId)`: Remove pair

**Workflow:**
```
1. Upload images
2. Create pairs (image1 → image2)
3. Edit transition prompts
4. Generate videos for each pair
5. Stitch all videos → Final timeline
6. Download final video
```

**Service Integration**: `timelineStudioService.ts`, `videoStitcher.ts`

**Complexity**: Pair management, stitching coordination, FFmpeg integration

---

### useAdCloner.ts (~650 lines) - BETA

**Purpose**: Ad variation generation and refinement

**State:**
- `adImage`: Main ad image
- `subjectImages`: Array of subject images to composite
- `variationStates`: Map of variation → state (generating/refining/error)
- `generationResult`: Complete ad analysis with variations
- `settings`: Text/image model selection

**Key Functions:**
- `uploadAd(file)`: Upload ad image
- `uploadSubjects(files)`: Upload subject images
- `analyzeAndGenerate()`: Research ad → Generate variations
- `refineVariation(variationId, instructions, newSubjects)`: Refine specific variation
- `regenerateVariation(variationId)`: Regenerate failed variation
- `getMoreVariations(count)`: Generate additional variations

**Workflow:**
```
1. Upload ad + subjects
2. AI researches ad context
3. Generate variations (default 3)
4. User can refine specific variations
5. Or regenerate failed ones
6. Or request more variations
```

**Service Integration**: `adClonerService.ts`

**Complexity**: Per-variation state, refinement workflow, multi-image composition

**Used by**: `components/adCloner/AdClonerStudio.tsx`

---

### useVideoAnalyzerStudio.ts (880 lines) ⭐ **LARGEST HOOK** - BETA

**Purpose**: Video ad analysis and concept generation

**State:**
- `processedVideo`: Uploaded video file metadata
- `videoAnalysis`: 10-point analysis result
- `extractedFrames`: Key frames from storyboard
- `generatedConcepts`: Static ad concepts
- `conceptApproaches`: Different strategic approaches
- `isAnalyzing`, `isGeneratingConcepts`, `isGeneratingScenes`: Loading states
- `analysisModel`, `imageModel`: Model selection

**Stages:**

1. **Video Upload & Processing**:
   - `handleVideoUpload(file)`: Upload to Gemini File API
   - Polling for file processing
   - Retry logic with exponential backoff

2. **Strategic Analysis**:
   - `analyzeVideo()`: 10-point analysis with Google Search
   - Zero-trust IP verification
   - JSON parsing with AI repair
   - Error recovery

3. **Storyboard Extraction**:
   - Parses timestamps from analysis
   - `extractFrames()`: Extract frames at timestamps
   - Creates visual storyboard

4. **Concept Generation**:
   - `generateConcepts()`: Static ad concepts from storyboard
   - Multiple concept approaches
   - Batch image generation

5. **Scene Variations**:
   - `generateSceneVariations(scene, subjects)`: Scene-by-scene variations
   - Subject composition with new images

**Error Handling:**
- JSON parse failures → AI repair
- File processing failures → Retry
- Frame extraction failures → Skip frame
- User-friendly error messages

**Service Integration**: `videoAnalyzerService.ts`

**Complexity**:
- Most complex hook (880 lines)
- Multi-stage workflow
- Extensive error handling
- Frame extraction from video
- JSON parsing with recovery

**Used by**: `components/videoAnalyzer/VideoAnalyzerStudio.tsx`

---

## Hook Pattern

### Standard Hook Structure

All hooks follow this pattern:

```typescript
export function useStudioHook({
  showToast,
  openImageCropper,
  openLightbox,
  openConfirmationDialog,
  // ... other callbacks from App.tsx
}) {
  // State
  const [images, setImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Handlers
  const handleUpload = (files) => {
    // Process upload
    openImageCropper('studioType', imageDataUrl);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const results = await studioService.generate(options);
      setImages(results);
      showToast('Generated successfully!', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Return state and handlers
  return {
    images,
    isGenerating,
    handleUpload,
    handleGenerate,
    // ...
  };
}
```

### Key Principles

1. **Separation of Concerns**:
   - Hook: State + logic
   - Component: Presentation only
   - Service: API calls

2. **Callback Props**:
   - All external interactions via callbacks from App.tsx
   - Enables centralized modal/toast management
   - Makes hooks testable

3. **Error Handling**:
   - Try/catch around async operations
   - User-friendly error messages
   - Toast notifications for feedback

4. **Loading States**:
   - Boolean flags for async operations
   - Progress tracking for long operations
   - Disable UI during loading

## Hook Integration with Components

### Component Usage

```tsx
function StudioComponent() {
  const {
    images,
    isGenerating,
    handleUpload,
    handleGenerate,
  } = useStudioHook({
    showToast: (msg, type) => { /* from App.tsx */ },
    openImageCropper: (type, url) => { /* from App.tsx */ },
    // ...
  });

  return (
    <div>
      <button onClick={handleUpload} disabled={isGenerating}>
        Upload
      </button>
      {images.map(img => <img src={img.url} />)}
    </div>
  );
}
```

### App.tsx Integration

```tsx
// App.tsx
const [toasts, setToasts] = useState([]);
const showToast = (message, type) => {
  setToasts([...toasts, { id: Date.now(), message, type }]);
};

// Pass to all studios
<HairStudio showToast={showToast} ... />
<BabyStudio showToast={showToast} ... />
```

## Common Hook Tasks

### Add New Hook

1. Create file: `hooks/useMyStudio.ts`
2. Define state variables
3. Implement event handlers
4. Integrate with service layer
5. Return state and handlers
6. Export hook

### Modify Existing Hook

1. **Read service layer first** - Understand API
2. Update state if needed
3. Modify handler logic
4. Test with component
5. Check error handling

### Debug Hook Issues

1. Add console.logs in handlers
2. Check service layer errors
3. Verify state updates
4. Test edge cases (no images, failed generation)
5. Check callback props are provided

## Related Documentation

- **Root CLAUDE.md**: Project overview
- **services/CLAUDE.md**: Service layer documentation
- **components/CLAUDE.md**: Component integration
