# Image Studio Components

**Production Studio** - Advanced batch image variation generation

**Note**: Main component `ImageStudio.tsx` is located at `components/ImageStudio.tsx` (root level), while supporting components are in this directory.

## Overview

Image Studio is the most advanced studio with extensive batch processing, JSON import/export, prompt engineering tools, and multi-model support. It's designed for power users generating large volumes of image variations.

**Related Hook**: `hooks/useImageStudioLogic.ts` (648 lines - most complex hook)

## Components (9 files in this directory)

### ImageStudioConfirmationDialog.tsx
**Custom confirmation modal for batch operations**

**Features:**
- Custom styling for Image Studio
- Displays operation details (number of images, prompts, etc.)
- Confirm/Cancel workflow
- Used for destructive actions (clear all, delete batch, etc.)

**Props:**
- `isOpen`: Boolean
- `title`: String
- `message`: String (supports JSX for detailed info)
- `onConfirm`: Callback
- `onCancel`: Callback

---

### GeneratedImageDisplay.tsx
**Display for generated image results**

**Features:**
- Grid layout for generated images
- Image preview with hover effects
- Download button per image
- Metadata display (prompt, model used, dimensions)
- Lightbox integration (click to enlarge)

**Props:**
- `images`: Array of generated images
- `onDownload`: Download callback
- `onView`: Lightbox trigger
- `onDelete`: Delete image callback

---

### ImageUploader.tsx
**Multi-image upload interface** (Studio-specific variant)

**Features:**
- Drag-and-drop zone
- Browse button
- Multiple file selection
- File preview grid
- Remove individual files
- Clear all button
- File count display

**Different from root `ImageUploader.tsx`**: This variant is optimized for batch operations with more features.

---

### PromptEditor.tsx
**Advanced prompt editing interface**

**Features:**
- Textarea for prompt input
- **Translate button**: Auto-translate to English
- **Enhance button**: AI-powered prompt improvement
- **Variation button**: Generate prompt variations
- **List generation**: Batch generate prompts from template
- Character count
- Prompt templates
- Placeholder hints

**Props:**
- `value`: Current prompt text
- `onChange`: Text change callback
- `onTranslate`: Translation trigger
- `onEnhance`: Enhancement trigger
- `onGenerateVariations`: Variation trigger
- `disabled`: During generation

**Advanced Features:**
```typescript
// Translate non-English to English
const translatedPrompt = await translateToEnglish(prompt);

// Enhance prompt with AI
const enhancedPrompt = await enhancePrompt(prompt);

// Generate variations
const variations = await generatePromptVariation(basePrompt);

// Generate list from template
const prompts = await generatePromptList(template, count);
```

---

### GenerateButton.tsx
**Generation trigger button**

**Features:**
- Primary action button
- Disabled during generation
- Loading spinner when active
- Shows pending count during generation
- Validation (checks if images + prompts ready)

**Props:**
- `onClick`: Generate callback
- `disabled`: Boolean
- `isGenerating`: Boolean
- `pendingCount`: Number of images being generated

---

### ProgressBar.tsx
**Progress indicator for batch generation**

**Features:**
- Percentage progress bar
- Current/Total counter (e.g., "15 / 50")
- Estimated time remaining (if available)
- Cancel button (if cancellable)

**Props:**
- `current`: Number of completed
- `total`: Total number to generate
- `percentage`: Progress percentage (0-100)
- `onCancel`: Optional cancel callback

---

### AdvancedOptions.tsx
**Advanced generation settings panel**

**Sections:**

1. **Model Selection**
   - Gemini Flash (fast, free)
   - Nano Banana (high quality)
   - Seedream 4.0 (photorealistic)
   - Flux Kontext Pro (artistic)

2. **Aspect Ratio Presets**
   - Square (1:1)
   - Portrait (4:5)
   - Landscape (16:9)
   - Wide (21:9)
   - Ultrawide (32:9)
   - Custom (manual width × height)

3. **Image Dimensions**
   - Auto (model default)
   - HD (1280×720)
   - Full HD (1920×1080)
   - 2K (2560×1440)
   - 4K (3840×2160)
   - Custom

4. **Filename Templates**
   - Variables: `{set_id}`, `{original_filename}`, `{timestamp}`, `{index}`, `{prompt}`
   - Preview of generated filename
   - Examples provided

5. **EXIF Embedding**
   - Toggle to embed prompt in image metadata
   - Supports JPEG and PNG
   - Enables reproducibility

**Props:**
- `selectedModel`: Current image model
- `aspectRatio`: Current aspect ratio
- `customDimensions`: Custom width/height
- `filenameTemplate`: Template string
- `embedPromptInExif`: Boolean toggle
- `onModelChange`: Model selection callback
- `onAspectRatioChange`: Aspect ratio callback
- `onDimensionsChange`: Dimensions callback
- `onFilenameTemplateChange`: Template callback
- `onExifToggle`: EXIF toggle callback

**Model-Specific Warnings:**
- Seedream: Limited aspect ratio support (warns if unsupported)
- Flux: Recommended dimensions
- Nano Banana: Optimal settings

---

### CropChoiceModal.tsx
**Batch crop workflow dialog**

**Purpose**: Asks user if they want to crop uploaded images before generation

**Workflow:**
1. User uploads multiple images
2. Modal opens: "Crop all images or use originals?"
3. Options:
   - **Crop All**: Opens `MultiCropView`
   - **Use Original**: Skip cropping, use as-is
   - **Cancel**: Return to upload

**Props:**
- `isOpen`: Boolean
- `imageCount`: Number of images uploaded
- `onCropAll`: Callback to open MultiCropView
- `onUseOriginal`: Callback to proceed without cropping
- `onCancel`: Callback to cancel

---

### MultiCropView.tsx
**Batch image cropping interface**

**Features:**
- Displays one image at a time for cropping
- Progress indicator (Image N of M)
- Crop controls (zoom, pan, reset)
- Aspect ratio locked (based on generation settings)
- Navigation: Previous/Next
- Skip button (use original for this image)
- Confirm All button (when all cropped)

**Workflow:**
1. Display first image
2. User crops (or skips)
3. Click Next → Move to next image
4. Repeat until all processed
5. Click Confirm All → Returns to Image Studio with cropped images

**Props:**
- `images`: Array of images to crop
- `aspectRatio`: Locked aspect ratio
- `onComplete`: Callback with cropped images
- `onCancel`: Callback to cancel batch crop

## Main Component (Root Level)

### ImageStudio.tsx (at components/ImageStudio.tsx)

**Location**: `components/ImageStudio.tsx` (NOT in imageStudio/ subdirectory)

**Reason**: Legacy structure - Image Studio was first studio, placed at root level

**Features:**
- Integrates all subcomponents
- Manages workflow state
- Handles JSON import/export
- Coordinates batch operations

## Hook: useImageStudioLogic.ts (648 lines)

**See**: `hooks/CLAUDE.md` for detailed documentation

**Most Complex Hook** - Extensive features:
- Multi-image upload and management
- JSON prompt import/export
- Prompt translation, enhancement, variation
- Batch cropping workflow
- Multi-model generation
- EXIF embedding
- Custom filename templates
- Progress tracking

## Advanced Features

### JSON Import/Export

**Export**:
```json
{
  "version": "1.0",
  "prompts": [
    {
      "imageId": "img_123",
      "originalFilename": "photo.jpg",
      "prompt": "A beautiful sunset..."
    },
    ...
  ]
}
```

**Import**:
- Upload JSON file
- System matches images by filename
- Prompts auto-populated

**Use Case**: Repeatable workflows, sharing prompt sets

---

### Prompt Engineering Tools

**Translation** (`translateToEnglish`):
- Detects non-English prompts
- Translates to English for better results
- Batch translate all prompts

**Enhancement** (`enhancePrompt`):
- AI improves prompt quality
- Adds detail, specificity
- Maintains core concept

**Variation** (`generatePromptVariation`):
- Creates variations of prompt
- Maintains style/theme
- Generates multiple alternatives

**List Generation** (`generatePromptList`):
- Template: "A {subject} in {location}"
- Generates 10 variations
- Batch prompt creation

---

### EXIF Embedding

**Feature**: Embed prompt in image metadata

**Benefits:**
- Reproducibility (know exact prompt used)
- Archival (prompt travels with image)
- Attribution (track generation source)

**Implementation:**
- Uses Piexif library
- Embeds in EXIF UserComment field
- Works with JPEG and PNG

---

### Filename Templates

**Template**: `{original_filename}_{index}_{timestamp}`

**Variables:**
- `{set_id}`: Generation batch ID
- `{original_filename}`: Source image filename
- `{timestamp}`: Unix timestamp
- `{index}`: Image index in batch
- `{prompt}`: Sanitized prompt text (truncated)

**Example**: `sunset_1_1699564800.png`

## Workflow

### Basic Batch Generation
1. Upload 10-50 images
2. CropChoiceModal: Choose crop or original
3. If crop: MultiCropView → Crop each image
4. Enter prompts (one per image, or same for all)
5. Select model and aspect ratio
6. Click Generate
7. Progress bar shows completion
8. Download all with custom filenames

### JSON Workflow
1. Upload images
2. Click "Export Prompts to JSON"
3. Edit JSON file externally
4. Import JSON back
5. Prompts auto-populated
6. Generate batch

### Advanced Prompt Engineering
1. Upload images
2. Enter base prompts
3. Click "Translate All" (if non-English)
4. Click "Enhance All" → AI improves prompts
5. Review enhanced prompts
6. Generate with enhanced prompts

## Best Practices

**Image Selection:**
- Use consistent quality images
- Similar aspect ratios (or use crop workflow)
- High resolution for best results

**Prompt Strategy:**
- Specific prompts (better results than vague)
- Use enhancement for quick improvement
- Translate non-English for consistency

**Model Selection:**
- Gemini Flash: Fast iteration, testing
- Nano Banana: Production quality, versatile
- Seedream: Photorealistic, portraits
- Flux: Artistic, creative

**Batch Size:**
- Start small (10 images) to test
- Scale up to 50+ for production
- Monitor quota usage

## Troubleshooting

**JSON Import Failed:**
- **Cause**: Filename mismatch or invalid JSON
- **Solution**: Check filenames match exactly, validate JSON

**Prompt Enhancement Fails:**
- **Cause**: API quota or safety filter
- **Solution**: Retry or enhance manually

**EXIF Not Embedded:**
- **Cause**: Image format not supported
- **Solution**: Use JPEG or PNG (not WebP/GIF)

**Generation Slow:**
- **Cause**: Large batch size
- **Solution**: Reduce batch size or use faster model

## Related Documentation

- **hooks/useImageStudioLogic.ts**: Hook implementation (648 lines)
- **services/geminiService.ts**: Multi-model routing
- **services/imageUtils.ts**: EXIF embedding, filename generation
- **components/CLAUDE.md**: General component patterns
