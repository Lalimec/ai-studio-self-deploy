# Video Analyzer Studio (BETA)

**Status**: Beta feature - toggleable via GlobalSettingsModal

## Overview

Video Analyzer is the most complex beta studio, providing comprehensive video ad analysis with a 10-point strategic framework, storyboard extraction, and static ad concept generation. It uses heavily engineered AI prompts and multi-stage workflows.

**Largest Hook**: `useVideoAnalyzerStudio.ts` (880 lines)

## Purpose

**Analyze video ads to provide:**
- 10-point strategic analysis
- Zero-trust brand verification
- Key frame storyboard with timestamps
- Automated frame extraction
- Static ad concept generation
- Scene variation generation

## Components (12 files)

### VideoAnalyzerStudio.tsx
**Main component** - Complex multi-stage workflow orchestration

**Stages:**
1. Video upload
2. Analysis generation
3. Storyboard display
4. Concept generation
5. Scene variation generation

**Related Hook**: `hooks/useVideoAnalyzerStudio.ts` (880 lines) ⭐

---

### VideoFileUpload.tsx
**Video upload interface**

**Features:**
- Drag-and-drop video upload
- File format validation (mp4, mov, avi)
- File size warnings (large files → long processing)
- Upload progress indicator

**Supported Formats**: MP4, MOV, AVI (Gemini File API compatible)

---

### AdAnalysisCard.tsx
**Displays 10-point strategic analysis**

**Sections Displayed:**
1. Product/Service Identification
2. **IP Verification** (with verification badge)
3. Campaign Objective
4. Target Audience
5. Creative Strategy
6. Distribution Channels
7. Budget Indicators
8. Messaging Strategy
9. Competitive Positioning
10. Success Metrics

**Features:**
- Collapsible sections
- Markdown rendering
- Copy-to-clipboard
- Verification status badge (Real vs Fake brand)

---

### StoryboardCard.tsx
**Displays extracted storyboard with frames**

**Features:**
- Timeline view with timestamps
- Extracted frame images
- Scene descriptions
- Visual elements list
- Action/motion notes
- Frame extraction status

**Layout:**
```
[Timestamp: 00:05]
[Frame Image]
Description: Opening shot of product
Visual Elements: Product, background, lighting
Action: Camera zooms in
```

---

### AdIdeaCard.tsx
**Displays static ad concept**

**Features:**
- Generated concept image
- Concept title and tagline
- Visual description
- Key elements list
- Color palette
- Mood and tone
- Targeting notes
- Download button

**Layout:**
```
[Generated Image]
Title: "Morning Energy"
Tagline: "Start your day right"
Visual Description: ...
Key Elements: Product, lifestyle, warm tones
```

---

### ConceptApproachCard.tsx
**Displays strategic approach for concepts**

**Features:**
- Approach title
- Strategic rationale
- Key differentiators
- Target audience notes
- Select button (to generate concepts with this approach)

**Usage:**
```tsx
<ConceptApproachCard
  approach={approach}
  onSelect={() => generateConcepts(approach)}
/>
```

---

### ConceptGenerationControls.tsx
**Controls for concept generation**

**Features:**
- Approach selection
- Custom approach input
- Model selection (Image)
- Generate button
- Concept count selector

**Options:**
- Use predefined approach
- Enter custom strategic approach
- Select image model (Gemini/Nano Banana/Seedream/Flux)

---

### SceneGenerationControls.tsx
**Controls for scene variation generation**

**Features:**
- Scene selection (from storyboard)
- Subject image upload
- Custom prompt input
- Model selection
- Generate button

**Workflow:**
1. Select scene from storyboard
2. Upload subject images (optional)
3. Enter custom instructions (optional)
4. Select image model
5. Generate scene variation

---

### AnalysisSettings.tsx
**Model selection for analysis**

**Features:**
- **Analysis Model**: Flash 1.5 8B, Flash 2.0, Flash 2.0 Thinking, Pro 002
- **Image Model**: Gemini Flash, Nano Banana, Seedream, Flux
- Settings saved to localStorage

**Recommendations:**
- Flash 2.0 Thinking: Best analysis quality (slowest)
- Flash 2.0: Balanced quality/speed
- Flash 1.5 8B: Fastest (good for testing)

---

### AnalysisErrorCard.tsx
**Error display with retry**

**Features:**
- Error message display
- Error type indication (parsing, network, file processing)
- Retry button
- Clear button (reset workflow)

**Error Types:**
- **File Processing**: Video upload/processing failed
- **JSON Parsing**: Analysis response malformed
- **Network**: API call failed
- **Quota**: API quota exceeded

---

### MarkdownRenderer.tsx
**Renders markdown content**

**Features:**
- Markdown parsing
- Syntax highlighting
- Link handling
- List formatting

**Used by**: AdAnalysisCard, AdIdeaCard

---

### Loader.tsx
**Loading states**

**Variants:**
- Spinner with message
- Progress bar (for frame extraction)
- Indeterminate loading

---

### mockData.ts
**Mock data for development**

**Contains:**
- Mock VideoAnalysis object
- Mock storyboard with frames
- Mock concepts with images
- Mock approaches

**Usage:**
```typescript
import { mockVideoAnalysis } from './mockData';

// Use for UI development without API calls
setVideoAnalysis(mockVideoAnalysis);
```

## Hook: useVideoAnalyzerStudio.ts (880 lines) ⭐

### State Management

**Primary State:**
- `processedVideo`: Uploaded video file metadata
- `videoAnalysis`: 10-point analysis result
- `extractedFrames`: Map of timestamp → frame dataURL
- `generatedConcepts`: Array of AdIdea objects
- `conceptApproaches`: Strategic approaches
- `selectedScene`: Currently selected storyboard scene
- `analysisModel`, `imageModel`: Model selection

**Loading States:**
- `isProcessingVideo`: File upload in progress
- `isAnalyzing`: Analysis generation in progress
- `isExtractingFrames`: Frame extraction in progress
- `isGeneratingConcepts`: Concept generation in progress
- `isGeneratingScenes`: Scene variation in progress

**Error States:**
- `analysisError`: Analysis failed
- `frameExtractionError`: Frame extraction failed
- `conceptGenerationError`: Concept generation failed

### Workflow Stages

#### Stage 1: Video Upload & Processing

**NEW APPROACH**: Uses inline base64 data instead of File API

```
User uploads video
  ↓
Check video size (max 50MB)
  ↓
If > 50MB → Error: "Video too large, max 50MB"
  ↓
If ≤ 50MB → Proceed to analysis
```

**Why Inline Data:**
- Bypasses File API upload/processing issues entirely
- No polling needed - immediate analysis
- Avoids Cloud Run header stripping issues
- Simpler, more reliable workflow

**Size Limit:**
- **Maximum**: 50MB
- **Reason**: Inline base64 data has practical size limits
- **Solution for larger videos**: Compress or trim video before upload

**Error Handling:**
- File too large (>50MB) → Clear error message with size
- Unsupported format → Error with supported formats list
- No polling timeout issues (instant processing)

---

#### Stage 2: Strategic Analysis

**NEW WORKFLOW** with inline data:

```
analyzeVideo() called
  ↓
videoAnalyzerService.analyzeVideo(videoFile, model, onProgress)
  ↓
Convert video to base64 data URL
  ↓
generateAnalysisWithInlineData(videoFile, model, onProgress)
  ↓
Send inline data + prompt to Gemini
  ↓
AI performs 10-point analysis with Google Search
  ↓
Response returned (may be JSON or text)
  ↓
parseAnalysisResponse(response)
  ↓
  ├─ JSON valid → setVideoAnalysis()
  └─ JSON malformed → fixMalformedJson() → Retry
```

**10-Point Framework:**
1. **Product Identification**: What's being advertised
2. **IP Verification**: Zero-trust brand verification with multi-vector search
3. **Campaign Objective**: Awareness, consideration, conversion
4. **Target Audience**: Demographics, psychographics, behaviors
5. **Creative Strategy**: Visual style, storytelling approach
6. **Distribution Channels**: Platform indicators (TV, social, digital)
7. **Budget Indicators**: Production quality, talent, effects
8. **Messaging Strategy**: Key messages, tone, voice
9. **Competitive Positioning**: Differentiation, market position
10. **Success Metrics**: KPIs and measurement approach

**Zero-Trust IP Verification:**
```
For each brand mentioned:
  ↓
Google Search: "[brand] official website"
Google Search: "[brand] + [product category]"
  ↓
Analyze search results:
  ├─ Multiple credible results → Real brand ✓
  ├─ No results / suspicious → Fake brand ✗
  └─ Inconsistencies → Flag for review ⚠️
  ↓
Return verification object:
{
  "brandName": "...",
  "isVerified": true/false,
  "verificationNotes": "...",
  "searchResults": ["...", "..."]
}
```

**JSON Parsing with AI Repair:**
```
parseAnalysisResponse(text)
  ↓
  ├─ Valid JSON → Parse and return
  └─ Invalid JSON →
      ↓
      fixMalformedJson(text, originalPrompt)
      ↓
      AI repairs JSON syntax errors
      ↓
      Validate repaired JSON
      ↓
      ├─ Valid → Return
      └─ Still invalid → Throw error
```

---

#### Stage 3: Frame Extraction

```
extractedFrames() called
  ↓
For each scene in storyboard:
  - Extract timestamp (e.g., "01:23")
  - videoAnalyzerService.extractFrameAtTime(video, timestamp)
  - Use canvas API to capture frame
  - Convert to dataURL
  - Store in extractedFrames map
  ↓
Update UI with frames
```

**Frame Extraction Process:**
1. Create video element
2. Load video file
3. Seek to timestamp
4. Draw current frame to canvas
5. Export as PNG dataURL
6. Cache in state

**Error Handling:**
- Invalid timestamp → Skip frame
- Video load failure → Retry
- Canvas API failure → Fallback to placeholder

---

#### Stage 4: Concept Generation

```
generateConcepts(approachInstructions?) called
  ↓
videoAnalyzerService.generateAdConcept(
  storyboard,
  approachInstructions,
  imageModel
)
  ↓
AI generates 3 static ad concepts
  ↓
For each concept:
  - Generate concept definition (title, tagline, description)
  - Generate image using image model
  ↓
videoAnalyzerService.generateConceptImages(
  concepts,
  imageModel,
  onProgress
)
  ↓
Batch generate images (concurrency-controlled)
  ↓
setGeneratedConcepts(concepts with images)
```

**ZERO-TOLERANCE RULE:**
```
🚫 FORBIDDEN:
- NO end cards or logo slates
- NO text overlays or CTAs
- NO transitions or fades
- NO "coming soon" text

✅ REQUIRED:
- Focus ONLY on core creative frames
- Adapt most compelling scenes
- Preserve all visual elements
- Maintain authentic ad aesthetic
```

**Concept Structure:**
```typescript
interface AdIdea {
  conceptTitle: string;
  tagline: string;
  visualDescription: string;  // Extremely detailed
  keyElements: string[];
  colorPalette: string[];
  moodAndTone: string;
  targetingNotes: string;
  imageUrl?: string;  // Generated image
}
```

---

#### Stage 5: Scene Variation Generation

```
generateSceneVariations(scene, subjectImages, customPrompt?) called
  ↓
Build prompt from scene + subjects + customPrompt
  ↓
videoAnalyzerService.generateSceneVariation(
  scene,
  subjectImages,
  customPrompt,
  imageModel
)
  ↓
Generate image with subjects composited into scene
  ↓
Preserve scene composition, lighting, mood
  ↓
Return variation image
```

**Scene Variation Workflow:**
1. User selects scene from storyboard
2. (Optional) Uploads subject images to composite
3. (Optional) Enters custom instructions
4. Clicks "Generate Scene Variation"
5. AI generates image:
   - Maintains scene composition
   - Integrates subjects naturally
   - Preserves lighting/mood
   - Matches production quality

---

### Key Functions

**`handleVideoUpload(file)`**
- Upload video to Gemini File API
- Poll for processing completion
- Error handling with retry

**`analyzeVideo()`**
- Trigger 10-point analysis
- JSON parsing with repair
- Update analysis state

**`extractFrames()`**
- Extract all frames from storyboard
- Batch frame extraction
- Progress tracking

**`generateConcepts(approachInstructions?)`**
- Generate static ad concepts
- Optional strategic approach
- Batch image generation

**`generateSceneVariations(scene, subjects, customPrompt?)`**
- Generate variation of specific scene
- Composite subjects
- Apply custom instructions

**`retryAnalysis()`**
- Retry failed analysis
- Reset error state
- Use same or different model

## Service: videoAnalyzerService.ts (305 lines)

### Core Functions

**`generateAnalysis(videoFile, model, onProgress)`**
- Uploads video to Gemini
- Runs 10-point analysis
- Google Search integration
- Returns VideoAnalysis object

**`parseAnalysisResponse(text)`**
- Extracts JSON from response
- Handles markdown code blocks
- Validates against schema

**`fixMalformedJson(malformedJson, originalPrompt)`**
- AI-powered JSON repair
- Uses Gemini to fix syntax errors
- Validates repaired output

**`generateAdConcept(storyboard, approachInstructions, imageModel)`**
- Generates 3 static ad concepts
- Uses ZERO-TOLERANCE prompts
- Returns array of AdIdea

**`generateConceptImages(concepts, imageModel, onProgress)`**
- Batch generates images for concepts
- Concurrency-controlled
- Progress callbacks

**`extractFrameAtTime(videoFile, timestamp)`**
- Extracts single frame
- Canvas API usage
- Returns dataURL

**`extractFramesFromTimestamps(videoFile, timestamps, onProgress)`**
- Batch frame extraction
- Progress tracking
- Error handling per frame

## Prompts: videoAnalyzerPrompts.ts ⭐ CRITICAL

### systemInstructionForAnalysis
**100+ lines of heavily engineered prompts**

**DO NOT SIMPLIFY** - Every instruction is intentional.

**Key Sections:**
- 10-point analysis framework
- Zero-trust IP verification with multi-vector search
- Storyboard extraction with timestamps
- JSON schema enforcement
- Search integration requirements

**Used by**: `generateAnalysis()`

---

### getSystemInstructionForConcept()
**Concept generation with ZERO-TOLERANCE rules**

**Key Features:**
- Explicit forbidden elements (end cards, logos, text)
- Storyboard-faithful adaptation
- Detailed visual description requirements
- Good/bad example comparisons

**Used by**: `generateAdConcept()`

---

### sceneGenerationDefaultPrompt
**Scene variation template**

**Features:**
- Preserves scene composition
- Natural subject integration
- Maintains brand aesthetic

**Used by**: `generateSceneVariation()`

## Feature Toggles

### Enabling Video Analyzer

**GlobalSettingsModal:**
```typescript
localStorage.setItem('showBetaFeatures', 'true');
```

### Model Selection

**AnalysisSettings:**
- Analysis Model: Flash 1.5 8B / Flash 2.0 / Flash 2.0 Thinking / Pro 002
- Image Model: Gemini Flash / Nano Banana / Seedream / Flux

## Common Use Cases

### Basic Analysis
1. Upload video ad
2. Wait for processing (polling)
3. Click "Analyze Video"
4. Review 10-point analysis
5. Check IP verification (real vs fake brand)
6. Review storyboard

### Concept Generation
1. Complete basic analysis
2. Review storyboard frames
3. Click "Generate Concepts"
4. (Optional) Specify strategic approach
5. Review 3 generated concepts
6. Download favorites

### Scene Variations
1. Complete basic analysis
2. Select scene from storyboard
3. Upload subject images
4. Enter custom instructions
5. Generate scene variation

## Best Practices

### Video Upload
- **Format**: MP4 (best compatibility)
- **Length**: 15-90 seconds (optimal)
- **Quality**: 1080p minimum
- **Size**: <100MB (faster processing)

### Analysis Model Selection
- **Flash 1.5 8B**: Quick testing, good quality
- **Flash 2.0**: Production quality, balanced speed
- **Flash 2.0 Thinking**: Best quality, use for final analysis
- **Pro 002**: Highest quality, slowest (premium cases)

### Image Model Selection
- **Gemini Flash**: Fast iterations
- **Nano Banana**: High quality, versatile
- **Seedream**: Photorealistic, best for lifestyle
- **Flux**: Artistic, best for abstract concepts

### Prompt Engineering
- Use specific strategic approaches
- Reference storyboard elements
- Provide detailed visual descriptions
- Iterate based on results

## Troubleshooting

### Video Processing Stuck
- **Cause**: Large file or slow upload
- **Solution**: Wait longer, retry, or use smaller file

### JSON Parse Error
- **Cause**: Malformed AI response
- **Solution**: Automatic AI repair, or retry with different model

### IP Verification Failed
- **Cause**: Fake brand or misspelling
- **Solution**: Review search results, manually verify

### Frame Extraction Failed
- **Cause**: Invalid timestamp or video format
- **Solution**: Frames skipped, storyboard still usable

### Concept Includes End Card
- **Cause**: AI ignored ZERO-TOLERANCE rule
- **Solution**: Regenerate, report issue

## Limitations (Beta)

- **No video editing**: Can't trim/crop video
- **No custom storyboard**: Can't manually adjust timestamps
- **No concept editing**: Can't modify generated concepts
- **Single analysis per video**: Can't compare models

## Future Enhancements

- Video trimming/editing
- Custom storyboard timestamps
- Concept prompt editing
- Multi-model analysis comparison
- Export to presentation format
- A/B testing framework

## Related Documentation

- **hooks/useVideoAnalyzerStudio.ts**: Hook implementation (880 lines)
- **services/videoAnalyzerService.ts**: Service layer (305 lines)
- **prompts/videoAnalyzerPrompts.ts**: Prompt engineering (100+ lines) ⭐
- **.docs/VIDEO_ANALYZER_INTEGRATION_GUIDE.md**: Extended guide
- **components/CLAUDE.md**: General component patterns
