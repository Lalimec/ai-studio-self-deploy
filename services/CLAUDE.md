# Services Directory

This directory contains the service layer for the AI Studio application - handling API calls, business logic, and utility functions.

## Directory Purpose

**Services provide:**
- API integration with Gemini and external models
- Business logic separated from UI components
- Utility functions for image/data processing
- Concurrency control and rate limiting
- Error handling and retry logic
- Logging and monitoring integration

**Total**: 15 service files, ~1,760 lines of TypeScript

## Service Files Overview

### Core API Services

#### geminiClient.ts (13 lines)
**Purpose**: Simple GoogleGenAI client initialization

**Exports:**
```typescript
export const genAI = new GoogleGenAI(API_KEY);
```

**Note**: This is a thin wrapper. The real API orchestration happens in `geminiService.ts`.

**API Key Source:**
- Development: `import.meta.env.GEMINI_API_KEY` (from `.env.local` via Vite)
- Production: Server-side environment variable (not in client bundle)

---

#### geminiService.ts (166 lines) ⭐ **CRITICAL**
**Purpose**: Multi-model orchestration layer - routes requests to Gemini or external models

**Key Functions:**

1. **`generateFigureImage(prompt, model, imageOptions)`**
   - **Most important function** - handles all image generation
   - Routes to Gemini, Nano Banana, Seedream, or Flux based on `model` parameter
   - Checks `nanoBananaWebhookSettings` to decide webhook vs native API
   - Returns base64 image data

   **Model Routing:**
   ```typescript
   if (model === 'geminiFlash') {
     // Use native Gemini API
     return await generateViaGeminiAPI(prompt, imageOptions);
   } else if (model === 'nanoBanana' || model === 'seedream' || model === 'flux') {
     // Check webhook settings
     const useWebhook = nanoBananaWebhookSettings[studioName];
     if (useWebhook) {
       return await callWebhook(prompt, model, imageOptions);
     } else {
       return await generateViaGeminiAPI(prompt, imageOptions);
     }
   }
   ```

2. **`translateToEnglish(text)`**
   - Translates non-English prompts to English
   - Uses Gemini Flash for translation
   - Returns translated text

3. **`enhancePrompt(prompt)`**
   - AI-powered prompt improvement
   - Uses Gemini to expand and enhance user prompts
   - Returns enhanced prompt string

4. **`generatePromptVariation(basePrompt)`**
   - Creates variations of a prompt
   - Maintains core concept while varying details
   - Returns variant prompt

5. **`generatePromptList(templatePrompt, count)`**
   - Batch generate multiple prompts
   - Uses structured output (JSON)
   - Returns array of prompts

**Error Handling:**
- Safety filter violations → User-friendly message
- Quota exceeded → Actionable guidance
- Network errors → Retry with exponential backoff
- JSON parsing errors → Logs raw response

**Dependencies:**
- `geminiClient.ts` for API client
- `endpoints.ts` for model metadata and webhook URLs
- Uses `nanoBananaWebhookSettings` from localStorage

---

#### endpoints.ts (158 lines) ⭐ **IMPORTANT**
**Purpose**: Centralized endpoint configuration (Constance pattern)

**Structure:**
```typescript
export const ENDPOINTS = {
  TEXT_MODELS: {
    flash: { id: 'gemini-2.0-flash-exp', maxTokens: 8192, ... },
    pro: { id: 'gemini-1.5-pro-latest', maxTokens: 8192, ... },
    // ...
  },

  IMAGE_MODELS: {
    geminiFlash: { name: 'Gemini Flash', dimensions: { ... }, ... },
    nanoBanana: { name: 'Nano Banana', webhookUrl: '...', ... },
    seedream: { name: 'Seedream 4.0', webhookUrl: '...', ... },
    flux: { name: 'Flux Kontext Pro', webhookUrl: '...', ... },
  },

  VIDEO_GENERATION: '...',  // Seedance webhook
  VIDEO_STITCHING: '...',   // n8n video stitch webhook
  IMAGE_UPLOAD: '...',      // Google Cloud Storage upload
};
```

**Model Metadata:**
- Model IDs and names
- Token limits
- Supported dimensions
- Aspect ratio constraints
- Webhook URLs
- Request/response schemas (in comments)

**Use Cases:**
- Model selection in UI (Image Studio, Ad Cloner)
- Validation (check if aspect ratio supported)
- API routing decisions
- Documentation reference

---

### Studio-Specific Services

#### hairStudioService.ts (280 lines)
**Purpose**: Hair Studio prompt engineering and generation

**Key Functions:**

1. **`buildHairPrompt(options)`**
   - Constructs detailed prompts for hair generation
   - Handles hairstyle, color, pose, gender
   - Adds male beards or female accessories
   - Complex logic for natural descriptions

   **Example Output:**
   ```
   "High-quality studio portrait photograph of a person with:
   - Hairstyle: Long layered hair with subtle waves
   - Hair color: Rich chestnut brown with caramel highlights
   - Additional feature: Delicate pearl headband
   - Angle: Three-quarter view facing camera
   Professional lighting, clean background..."
   ```

2. **`generateHairstyles(options, imageSrc, showToast)`**
   - Orchestrates batch generation
   - Creates all combinations (hairstyle × color × pose)
   - Uses `processWithConcurrency` for rate limiting
   - Returns array of `GeneratedImage` objects
   - Progress tracking via callbacks

**Complexity:**
- Handles 100+ hairstyle options
- Complex color descriptions (multicolor gradients)
- Gender-specific features (beards, accessories)
- Pose/angle variations

**Used by**: `hooks/useHairStudio.ts`

---

#### babyStudioService.ts (241 lines)
**Purpose**: Baby generation with two-parent fusion

**Key Functions:**

1. **`buildBabyPrompt(parent1, parent2, options)`**
   - Two-image fusion prompt
   - Analyzes parent features (hair, eyes, skin tone)
   - Creates baby with blended characteristics
   - Adds age, clothing, background, action

   **Example Output:**
   ```
   "Generate a photorealistic baby photo:
   - Age: 8-12 months old
   - Features: Blend of parent features from both images
   - Hair: Soft brown hair with natural texture
   - Composition: Close-up with natural lighting
   - Background: Cozy nursery setting
   - Clothing: Soft cotton onesie in pastel blue
   - Action: Smiling and reaching toward camera..."
   ```

2. **`generateBabyImages(parent1, parent2, options, count, showToast)`**
   - Generates multiple baby variations
   - Uses both parent images
   - Concurrency-controlled generation
   - Returns array of `GeneratedBabyImage`

**Complexity:**
- Two-image input handling
- Feature blending logic
- Age-specific descriptions (newborn vs toddler)
- Gender handling (can specify or let AI decide)

**Used by**: `hooks/useBabyStudio.ts`

---

#### videoService.ts (257 lines)
**Purpose**: Video generation and polling

**Key Functions:**

1. **`prepareImageForVideo(imageDataUrl)`**
   - Uploads image to public URL (via webhook)
   - Required for Seedance API (needs publicly accessible image)
   - Returns public URL

2. **`generateVideoForImage(imageUrl, prompt, onProgress)`**
   - Triggers Seedance video generation
   - Returns `workflowId` for polling

3. **`pollVideoStatus(workflowId, onProgress)`**
   - Polls for video completion
   - Exponential backoff (1s, 2s, 4s, 8s, ...)
   - Calls `onProgress` callback with status
   - Returns video URL when complete

   **Polling States:**
   - `pending`: Initial state
   - `processing`: Video generating
   - `completed`: Video ready
   - `failed`: Error occurred

4. **`enhanceVideoPrompt(prompt)`**
   - Uses AI to improve video prompts
   - Adds motion details, camera movements
   - Returns enhanced prompt

**Workflow:**
```
1. Upload image → prepareImageForVideo()
2. Start generation → generateVideoForImage()
3. Poll until complete → pollVideoStatus()
4. Download video from returned URL
```

**Used by**: `hooks/useVideoStudio.ts`, `hooks/useTimelineStudio.ts`

---

#### timelineStudioService.ts (102 lines)
**Purpose**: Timeline video generation and transitions

**Key Functions:**

1. **`prepareTimelineVideo(imageUrl1, imageUrl2, prompt, onProgress)`**
   - Generates transition video between two images
   - Uses Seedance API
   - Similar to `videoService.ts` but for transitions

2. **`pollTimelineVideoStatus(workflowId, onProgress)`**
   - Polls for timeline video completion
   - Exponential backoff
   - Returns video URL

**Pattern:** Very similar to `videoService.ts`, specialized for timeline pairs

**Used by**: `hooks/useTimelineStudio.ts`

---

#### adClonerService.ts (180 lines) - BETA
**Purpose**: Ad Cloner variation generation and refinement

**Key Functions:**

1. **`researchAdContext(adImageBase64)`**
   - AI-powered context research
   - Analyzes ad for product, brand, style
   - Uses Google Search (via Gemini)
   - Returns structured analysis object

2. **`generateAdPrompts(adContext, subjectImages, count)`**
   - Generates variation prompts
   - Maintains ad style while varying subjects
   - Returns array of prompts

3. **`generateAdVariationImage(prompt, aspectRatio)`**
   - Generates single ad variation
   - Uses Nano Banana or Gemini
   - Returns base64 image

4. **`refineAdImage(originalPrompt, refinementInstructions, subjectImages)`**
   - Refines existing variation
   - Adds new subject images
   - Maintains original concept
   - Returns refined image

5. **`getNewAdVariations(adContext, existingVariations, additionalSubjects, count)`**
   - Generates additional variations
   - Avoids duplicating existing concepts
   - Returns new variations

6. **`enhanceAdInstructions(instructions)`**
   - Improves user refinement instructions
   - Returns enhanced instructions

**Complexity:**
- Multi-image composition (ad + subjects)
- Context research with search
- Variation state management
- Refinement workflow

**Used by**: `hooks/useAdCloner.ts`

---

#### videoAnalyzerService.ts (305 lines) - BETA
**Purpose**: Video ad analysis and concept generation

**IMPORTANT CHANGE**: Now uses inline base64 data instead of File API to bypass upload/processing issues

**Video Size Limit**: 50MB maximum (enforced to ensure inline data works reliably)

**Key Functions:**

1. **`analyzeVideo(videoFile, model, onProgress)`** - Main entry point
   - Checks video size (max 50MB)
   - Converts video to base64 inline data
   - Calls `generateAnalysisWithInlineData()`
   - Returns analysis + processed file info

2. **`generateAnalysisWithInlineData(videoFile, model, onProgress)`** - NEW
   - Converts video file to base64 data URL
   - Uses inline data approach (bypasses File API entirely)
   - Sends base64 directly to Gemini with analysis prompt
   - Avoids File API upload/processing/polling complexity
   - Returns structured `VideoAnalysis` object

3. **`generateAnalysis(processedFileInfo, model, onProgress)`** - Legacy (File API)
   - Still available for reference but NOT used by default
   - Uses File API URI approach
   - Kept for backwards compatibility

   **Analysis Framework:**
   1. Product identification
   2. IP verification (zero-trust multi-vector search)
   3. Campaign objective
   4. Target audience
   5. Creative execution
   6. Distribution channels
   7. Budget indicators
   8. Messaging strategy
   9. Competitive positioning
   10. Success metrics

2. **`parseAnalysisResponse(text)`**
   - Extracts JSON from Gemini response
   - Handles markdown code blocks
   - Validates against schema
   - Returns parsed `VideoAnalysis`

3. **`fixMalformedJson(malformedJson, originalPrompt)`**
   - **AI-powered JSON repair**
   - Uses Gemini to fix syntax errors
   - Validates repaired JSON
   - Returns fixed object or null

4. **`generateAdConcept(storyboard, approachInstructions, imageModel)`**
   - Generates static ad concept from storyboard
   - Uses ZERO-TOLERANCE RULE (no end cards, no logo slates)
   - Returns array of `AdIdea` objects with images

5. **`generateConceptImages(concepts, imageModel, onProgress)`**
   - Batch generates images for concepts
   - Concurrency-controlled
   - Progress tracking
   - Returns concepts with generated images

**Frame Extraction Utilities:**
- `extractFrameAtTime(videoFile, timestamp)`: Extracts single frame
- `extractFramesFromTimestamps(videoFile, timestamps, onProgress)`: Batch frame extraction

**Complexity:**
- Most complex service (~305 lines)
- Multi-stage workflow (upload → analyze → extract → generate)
- JSON parsing with error recovery
- Frame extraction from video
- Heavily relies on system prompts

**Used by**: `hooks/useVideoAnalyzerStudio.ts`

---

#### videoStitcher.ts (65 lines)
**Purpose**: Remote video stitching via n8n webhook

**Key Functions:**

1. **`stitchVideos(videoUrls, onProgress)`**
   - Sends array of video URLs to n8n webhook
   - Webhook stitches videos using FFmpeg server-side
   - Polls for completion
   - Returns stitched video URL

   **Workflow:**
   ```
   1. POST videoUrls to webhook
   2. Webhook returns workflowId
   3. Poll for completion (similar to video generation)
   4. Download stitched video
   ```

**Why Remote Stitching?**
- FFmpeg.wasm is slow for large files
- Server-side FFmpeg is faster
- n8n workflow handles transcoding and stitching

**Used by**: `hooks/useTimelineStudio.ts`

---

### Utility Services

#### downloadService.ts (~400 lines) ⭐ **CENTRALIZED DOWNLOAD**
**Purpose**: Unified download functionality for all studios (DRY principle)

**Architecture Philosophy:**
- **Single source of truth** for all download operations
- **Eliminates code duplication** across studios
- **Consistent error handling** and progress tracking
- **Unicode-friendly** filename handling

**Key Functions:**

1. **`downloadFile(options)`**
   - Simple file download via browser download API
   - Handles URL or Blob sources
   - Automatic cleanup of object URLs

2. **`downloadImageWithMetadata(options)`**
   - Downloads image with EXIF prompt embedding
   - Optionally creates accompanying .txt metadata file
   - Used by: Image Studio (single download)

3. **`downloadBulkImages(options)`** ⭐ **Most Used**
   - Bulk download of images in ZIP format
   - Supports EXIF embedding, metadata files, videos
   - Progress tracking with callbacks
   - Used by: Hair Studio, Baby Studio, Image Studio (bulk)

4. **`downloadZip(options)`**
   - Generic ZIP creation and download
   - Supports nested folders
   - Progress tracking
   - Used by: Ad Cloner

**Type System:**
```typescript
interface DownloadWithMetadataOptions {
    imageUrl?: string;
    imageBlob?: Blob;
    imageBase64?: string;
    filename: string;
    prompt?: string;
    metadata?: Record<string, any>;
    embedInImage?: boolean;
}

interface BulkImageDownloadOptions {
    images: Array<{
        imageUrl/imageBlob/imageBase64
        filename, prompt, metadata
        videoUrl, videoFilename
    }>;
    zipFilename: string;
    folderName?: string;
    progressCallback?: ProgressCallback;
    embedPrompts?: boolean;
    includeMetadataFiles?: boolean;
}
```

**Progress Tracking:**
- 0-50%: Processing files (fetching, EXIF embedding)
- 50-100%: ZIP compression
- Callback format: `{ visible: boolean, message: string, progress: 0-100 }`

**Used By:**
- `useImageStudioLogic.ts` - Single & bulk downloads with EXIF
- `useHairStudio.ts` - ZIP with image + video + metadata
- `useBabyStudio.ts` - ZIP with parents + babies + videos
- `useAdCloner.ts` - ZIP with nested folders & variations

---

#### imageUtils.ts (148 lines)
**Purpose**: Image processing utilities

**Key Functions:**

1. **`fileToBase64(file)`**
   - Converts File to base64 string
   - Returns Promise<string>

2. **`blobToBase64(blob)`**
   - Converts Blob to base64
   - Used for cropped images

3. **`base64ToBlob(base64, mimeType)`**
   - Converts base64 to Blob
   - For downloads

4. **`sanitizeFilename(name)` 🌐** ⭐ **UNICODE-FRIENDLY**
   - **NEW**: Preserves non-Latin characters (Arabic, Chinese, Cyrillic, etc.)
   - **OLD**: Stripped all non-ASCII → caused download failures
   - **Removes**: Only filesystem-reserved chars (< > : " / \ | ? *)
   - **Keeps**: All Unicode letters, numbers, hyphens, underscores, dots
   - **Fallback**: Returns 'untitled' if sanitized name is empty

5. **`embedPromptInJpeg(dataUrl, prompt)` 🌐** ⭐ **UNICODE-SAFE**
   - **CRITICAL FIX**: Handles emojis & Unicode in prompts
   - **OLD BUG**: `btoa()` crashed on non-Latin1 characters
   - **NEW**: Properly encodes UTF-8 bytes for EXIF UserComment
   - Uses "UNICODE\0" character code prefix (EXIF spec)
   - Converts bytes to Latin1-safe string for piexif library
   - **Fallback**: Returns original image if embedding fails

6. **`embedPromptInPng(blob, prompt)` 🌐** ⭐ **UNICODE-SAFE**
   - **CRITICAL FIX**: Now uses PNG iTXt chunk (was tEXt)
   - **tEXt**: Latin-1 only (old implementation)
   - **iTXt**: Full UTF-8 support (new implementation)
   - Supports compression flags, language tags
   - Inserts chunk before IEND (PNG spec)
   - **Fallback**: Returns original image if embedding fails

7. **`dataURLToBlob(dataURL)`**
   - Extracts Blob from data URL
   - Handles `data:image/png;base64,...` format

8. **`downloadImage(base64OrUrl, filename)`**
   - Triggers browser download
   - Creates temporary anchor element
   - Supports both base64 and URLs

6. **`generateFilename(template, variables)`** ⭐ **NEW**
   - Filename template with placeholders
   - Variables: `{set_id}`, `{original_filename}`, `{timestamp}`, `{index}`, `{prompt}`
   - Returns formatted filename

   **Example:**
   ```typescript
   generateFilename(
     '{original_filename}_{index}',
     { original_filename: 'photo', index: 1 }
   ) // → 'photo_1.png'
   ```

7. **`embedPromptInExif(imageBlob, prompt)`** ⭐ **NEW**
   - Embeds prompt in JPEG/PNG EXIF metadata
   - Uses Piexif library
   - Returns new Blob with EXIF data
   - **Use case**: Traceability, reproducibility

**Used by**: All studios for image downloads and processing

---

#### imageUploadService.ts (37 lines)
**Purpose**: Upload images to Google Cloud Storage

**Key Functions:**

1. **`uploadImageFromDataUrl(dataUrl, filename)`**
   - Uploads image to GCS via webhook
   - Returns public URL
   - **Used by**: Video generation (needs public URLs for Seedance)

**Workflow:**
```
1. Convert dataUrl to File object
2. Create FormData with file
3. POST to webhook
4. Webhook uploads to GCS
5. Returns public URL
```

**Note**: Webhook handles GCS authentication server-side

---

#### videoUploadService.ts (60 lines) - NEW
**Purpose**: Upload videos to Google Cloud Storage

**Key Functions:**

1. **`uploadVideoToGCS(videoFile)`**
   - Uploads video to GCS via n8n webhook
   - Converts video file to data URL (base64)
   - Returns public GCS URL
   - **Used by**: Video-related features that need public video URLs

**Workflow:**
```
1. Convert video File to data URL (base64)
2. Create JSON payload: { file_url: dataUrl, filename: videoFile.name }
3. POST to Constance.endpoints.videoUpload webhook
4. Webhook uploads to GCS
5. Returns public GCS URL in response.file_url
```

**Error Handling:**
- Throws error with status code if upload fails
- Attempts to parse error message from response
- Validates response contains file_url

**Use Cases:**
- Upload videos for processing by external APIs
- Share videos via public URLs
- Store videos for long-term access

**Note**: Webhook handles GCS authentication and bucket management server-side

---

#### apiUtils.ts (61 lines) ⭐ **CRITICAL**
**Purpose**: Concurrency control and batch processing

**Key Functions:**

1. **`processWithConcurrency<T>(tasks, limit)`**
   - Generic concurrency controller
   - Limits parallel API requests to avoid rate limiting
   - **Default limit**: 3 concurrent requests

   **Usage:**
   ```typescript
   const tasks = prompts.map(prompt => () => geminiService.generateFigureImage(prompt, ...));
   const results = await processWithConcurrency(tasks, 3);
   ```

   **How it works:**
   - Executes `limit` tasks in parallel
   - When one completes, starts next task
   - Continues until all tasks complete
   - Returns array of results

2. **`runConcurrentTasks<T>(tasks, onProgress, limit)`**
   - Similar to `processWithConcurrency` but with progress callbacks
   - Calls `onProgress(current, total)` after each task
   - Returns results array

**Why Critical?**
- Prevents rate limiting (429 errors)
- Ensures consistent performance
- Used by ALL batch generation operations
- **Do not remove or bypass** - it's a safeguard

**Used by**: All studio services for batch operations

---

#### loggingService.ts (46 lines)
**Purpose**: Cloud Logging integration

**Key Functions:**

1. **`logUserAction(action, details)`**
   - Logs user actions to Cloud Logging
   - Structured JSON logs for GCP Cloud Monitoring
   - Generates user ID from sessionStorage
   - **Production-ready** for log-based metrics

   **Example:**
   ```typescript
   logUserAction('hair_generation', {
     hairstyle: 'Long Layered',
     color: 'Blonde',
     count: 3,
   });
   ```

   **Log Format:**
   ```json
   {
     "timestamp": "2024-01-15T10:30:00.000Z",
     "userId": "user_abc123",
     "action": "hair_generation",
     "details": { ... },
     "userAgent": "Mozilla/5.0 ...",
   }
   ```

**User ID Generation:**
- Stored in `sessionStorage` as `ai_studio_user_id`
- Generated once per session
- Enables user-specific analytics

**Use Cases:**
- Track feature usage
- Identify popular studios
- Monitor error rates
- A/B testing
- Usage analytics

**Integration:**
- Logs sent to `console.log()` in structured format
- Cloud Run captures console logs → Cloud Logging
- Create log-based metrics in GCP for monitoring

**Used by**: All studio hooks for action tracking

---

## Service Integration Patterns

### Hook → Service → API

**Standard Flow:**
```
User interaction
  ↓
Component calls hook function
  ↓
Hook calls studio service (e.g., hairStudioService.generateHairstyles)
  ↓
Studio service calls geminiService.generateFigureImage
  ↓
geminiService routes to Gemini or webhook
  ↓
Response parsed and returned
  ↓
Studio service processes response
  ↓
Hook updates state
  ↓
Component re-renders
```

### Concurrency Pattern

**ALL batch operations use concurrency control:**
```typescript
// Studio service
export async function generateBatch(prompts, showToast) {
  const tasks = prompts.map(prompt => async () => {
    try {
      return await geminiService.generateFigureImage(prompt, ...);
    } catch (error) {
      showToast(error.message, 'error');
      return null;
    }
  });

  const results = await processWithConcurrency(tasks, 3);
  return results.filter(Boolean); // Remove null results
}
```

**Key Points:**
- Limit to 3 concurrent requests
- Individual error handling per task
- Continue processing even if some fail
- Return partial results

### Error Handling Pattern

**Consistent error handling across all services:**
```typescript
try {
  const result = await apiCall();
  return result;
} catch (error) {
  if (error.message.includes('SAFETY')) {
    throw new Error('Image blocked by safety filter. Try different prompt.');
  } else if (error.message.includes('QUOTA')) {
    throw new Error('API quota exceeded. Please try again later.');
  } else {
    throw new Error(`Generation failed: ${error.message}`);
  }
}
```

**Error Types:**
- Safety filters → User-friendly guidance
- Quota exceeded → Wait and retry
- Network errors → Automatic retry (up to 3 times)
- JSON parsing → Log raw response, attempt repair

---

## Service Dependencies

### External APIs

1. **Google Gemini API** (`generativelanguage.googleapis.com`)
   - Text generation (Flash, Pro models)
   - Image generation (Imagen)
   - Video analysis
   - Translation, enhancement

2. **n8n Webhooks** (various endpoints)
   - Nano Banana image generation
   - Seedream image generation
   - Flux image generation
   - Seedance video generation
   - Video stitching
   - Image upload to GCS

3. **Google Cloud Storage** (via webhook)
   - Image uploads for public URLs

### Internal Dependencies

```
geminiService.ts
  ↓ depends on
├── geminiClient.ts (API client)
├── endpoints.ts (model config)
└── apiUtils.ts (concurrency)

Studio Services
  ↓ depend on
├── geminiService.ts (image gen)
├── apiUtils.ts (concurrency)
└── imageUtils.ts (processing)

Hooks
  ↓ depend on
├── Studio Services
├── imageUtils.ts
└── loggingService.ts
```

---

## Common Service Tasks

### Add New AI Model

1. **Add to `endpoints.ts`:**
   ```typescript
   IMAGE_MODELS: {
     newModel: {
       name: 'New Model',
       webhookUrl: 'https://...',
       supportedDimensions: { ... },
       // ...
     },
   },
   ```

2. **Update `geminiService.ts`:**
   ```typescript
   if (model === 'newModel') {
     return await callWebhook(prompt, model, imageOptions);
   }
   ```

3. **Update `types.ts`:**
   ```typescript
   export type ImageModel = 'gemini' | 'nanoBanana' | 'seedream' | 'flux' | 'newModel';
   ```

4. **Test with mock data first**

### Add New Studio Service

1. Create file: `services/myStudioService.ts`
2. Implement prompt builder: `buildMyPrompt(options)`
3. Implement generation: `generateMyContent(options, showToast)`
4. Use `processWithConcurrency` for batch operations
5. Export functions for hook to use
6. Add logging calls: `logUserAction('my_action', details)`

### Modify Existing Prompt

1. Locate prompt builder (e.g., `buildHairPrompt`)
2. Update prompt template
3. Test with console.log to verify prompt
4. Test generation with real API
5. Verify results match expectations
6. Update tests (if added in future)

### Debug API Issues

1. **Check console logs** - `loggingService` outputs structured logs
2. **Enable verbose logging** in geminiService.ts (uncomment debug lines)
3. **Test with mock data** to isolate UI from API issues
4. **Check endpoint config** in endpoints.ts
5. **Verify API key** in .env.local or server environment
6. **Check quota** in Google Cloud Console
7. **Test webhook directly** with curl/Postman

---

## Performance Optimization

### Concurrency Tuning

**Default limit is 3** - can be adjusted based on:
- API rate limits
- Network bandwidth
- User experience (balance speed vs responsiveness)

**To change:**
```typescript
// In studio service
const results = await processWithConcurrency(tasks, 5); // Increase to 5
```

### Caching (Future Enhancement)

**Not currently implemented**, but consider:
- Cache translated prompts (avoid re-translation)
- Cache enhanced prompts (same base → same result)
- Cache model metadata (avoid repeated endpoint lookups)

### Request Optimization

**Current optimizations:**
- Batch operations use concurrency control
- Exponential backoff for polling
- Request deduplication (not implemented yet)

---

## Testing Patterns

**No formal testing framework**, but follow:

1. **Unit testing** - Test individual functions:
   - `buildHairPrompt()` with various options
   - `generateFilename()` with different templates
   - `parseAnalysisResponse()` with valid/invalid JSON

2. **Integration testing** - Test service → API:
   - Generate single image
   - Generate batch
   - Handle errors
   - Test polling

3. **Mock data testing** - Use mock responses:
   - Bypass API calls
   - Test error handling
   - Verify parsing logic

---

## Security Considerations

### API Key Protection

**Development:**
- API key in `.env.local` (gitignored)
- Vite injects via `define` (visible in bundle)
- **Acceptable for local dev only**

**Production:**
- API key server-side only (in Express server)
- Service worker intercepts requests
- Key injected server-side before forwarding to Gemini
- **Never visible in client bundle**

### Input Validation

**All services validate inputs:**
- Check required fields
- Validate image formats
- Sanitize prompts (remove XSS attempts)
- Check file sizes

### Rate Limiting

**Server-side rate limiting** (in `server/server.js`):
- 100 requests per 15 minutes per IP
- Protects against abuse
- Prevents quota exhaustion

**Client-side concurrency control:**
- Limits parallel requests
- Prevents accidental rate limit violations

---

## Related Documentation

- **Root CLAUDE.md**: High-level project overview
- **components/CLAUDE.md**: Component architecture
- **hooks/CLAUDE.md**: Hook patterns and usage
- **server/CLAUDE.md**: Server-side proxy architecture
- **prompts/CLAUDE.md**: Prompt engineering guidelines
- **endpoints.ts**: Model configuration reference (in code comments)
