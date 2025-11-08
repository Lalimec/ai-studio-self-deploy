# Video Studio Components

**Production Studio** - Convert static images into animated videos

## Overview

Video Studio uses Seedance V1 Pro API to generate short animated videos from static images with custom motion prompts. It supports batch processing and progress tracking.

## Components (1 file)

### VideoStudio.tsx
**Main and only component** - Complete video generation workflow

**Features:**
- Multi-image upload
- Custom prompt per image
- Video generation with polling
- Progress tracking per image
- Video preview
- Batch download
- Import from other studios

**Related Hook**: `hooks/useVideoStudio.ts` (443 lines)

**Props from App.tsx:**
- `showToast`: Toast notification callback
- `openConfirmationDialog`: Confirmation modal
- `importedImageForVideo`: Cross-studio import (from Hair/Baby/Image Studio)

## Hook: useVideoStudio.ts (443 lines)

**See**: `hooks/CLAUDE.md` for detailed hook documentation

**Key State:**
- `studioImages`: Array of uploaded images
- `videoProgress`: Map of imageId → progress state
- `generatedVideos`: Map of imageId → video URL
- `videoPrompts`: Map of imageId → custom prompt
- `isGenerating`: Global generation state

**Key Functions:**
- `handleImageUpload(files)`: Upload and prepare images
- `editPrompt(imageId, prompt)`: Customize prompt per image
- `generateVideo(image)`: Start video generation
- `pollVideoProgress(image)`: Poll until complete
- `downloadVideo(videoUrl, filename)`: Download completed video
- `deleteImage(imageId)`: Remove image from studio
- `handleImportedImage()`: Process cross-studio imports

## Service: videoService.ts (257 lines)

**See**: `services/CLAUDE.md` for detailed service documentation

**Key Functions:**

**`prepareImageForVideo(imageDataUrl)`**
- Uploads image to Google Cloud Storage (via webhook)
- Returns public URL (required for Seedance API)

**`generateVideoForImage(imageUrl, prompt, onProgress)`**
- Triggers Seedance video generation
- Returns `workflowId` for polling

**`pollVideoStatus(workflowId, onProgress)`**
- Polls for video completion
- Exponential backoff (1s, 2s, 4s, 8s, ...)
- Calls `onProgress` callback with status updates
- Returns video URL when complete

**`enhanceVideoPrompt(prompt)`**
- AI-powered prompt improvement
- Adds motion details, camera movements
- Returns enhanced prompt

## Workflow

### Basic Video Generation
1. Upload image(s)
2. (Optional) Edit prompt for each image
3. Click "Generate Video" on image
4. System uploads image to public URL
5. Triggers Seedance API
6. Polling starts (status updates every 1-8s)
7. Progress shown: pending → processing → completed
8. Video URL returned
9. Download or preview video

### Batch Video Generation
1. Upload 5-10 images
2. Customize prompts (or use default)
3. Click "Generate All Videos"
4. Each image processed independently
5. Progress tracked per image
6. Videos complete at different times
7. Download all when complete

### Cross-Studio Import
1. Generate image in Hair/Baby/Image Studio
2. Click "Import to Video Studio" on image
3. Image automatically loaded in Video Studio
4. Edit prompt if needed
5. Generate video

## Prompts

**Default Prompt** (if user doesn't customize):
```
"Subtle animation with gentle movement, smooth camera motion,
cinematic quality, professional video production"
```

**Enhanced Prompts** (via AI):
- Adds specific camera movements (pan, zoom, dolly)
- Describes motion type (slow/fast, smooth/dynamic)
- Adds cinematic effects (depth of field, lighting changes)
- Specifies duration and pacing

**Example Enhanced Prompt**:
```
"Slow camera pan from left to right, gentle zoom in,
smooth motion with cinematic depth of field,
soft lighting changes creating atmospheric mood,
professional video production quality, 4-5 seconds duration"
```

## Progress States

**Polling States:**
1. **`pending`**: Video generation queued
2. **`processing`**: AI creating video (30-90 seconds typically)
3. **`completed`**: Video ready, URL available
4. **`failed`**: Generation error

**Progress Indicators:**
- Spinner icon (processing)
- Percentage (if available from API)
- Status text ("Generating video...")
- Error message (if failed)

## Common Use Cases

### Animate Portrait
1. Upload portrait photo
2. Prompt: "Slow zoom in, subtle smile, gentle head tilt"
3. Generate
4. Download animated portrait

### Product Showcase
1. Upload product photo
2. Prompt: "360 degree rotation, smooth and professional"
3. Generate
4. Download product video

### Batch Animation
1. Upload 10 variations of product
2. Same prompt for all: "Gentle rotation, cinematic lighting"
3. Generate all
4. Download for A/B testing

### Cross-Studio Workflow
1. Generate hairstyle in Hair Studio
2. Import to Video Studio
3. Prompt: "Hair flowing in gentle breeze, camera slowly zooms"
4. Generate animated hairstyle demo

## Best Practices

**Image Selection:**
- High resolution (720p+ recommended)
- Clear subject
- Good lighting
- Simple background (complex backgrounds may not animate well)

**Prompt Writing:**
- Be specific about motion type
- Specify camera movement
- Mention duration if important
- Use cinematic terms (pan, zoom, dolly, crane)
- Keep it concise (1-2 sentences)

**Generation:**
- Generate one first to test prompt
- Adjust prompt based on result
- Then batch generate similar images
- Monitor API quota (video generation expensive)

**Video Quality:**
- Input image quality affects video quality
- Higher resolution → better video
- Clear subjects animate better
- Avoid overly complex scenes

## Troubleshooting

**Video Generation Stuck:**
- **Cause**: API processing delay or failure
- **Solution**: Wait up to 2 minutes, then retry if no progress

**Video Quality Poor:**
- **Cause**: Low resolution input image
- **Solution**: Use higher resolution image (1080p+)

**Motion Not As Expected:**
- **Cause**: Vague or conflicting prompt
- **Solution**: Be more specific, use one motion type per prompt

**Generation Failed:**
- **Cause**: API quota, safety filter, or technical error
- **Solution**: Check error message, retry, or contact support

**Downloaded Video Won't Play:**
- **Cause**: Incomplete download or unsupported codec
- **Solution**: Re-download, use VLC or modern browser

## Limitations

- **Video length**: Fixed duration (4-5 seconds typical)
- **No editing**: Can't trim or adjust generated video
- **Single motion**: Complex multi-motion prompts may not work well
- **API dependent**: Requires external Seedance API (not free)

## Future Enhancements

- Video length control (custom duration)
- Motion type presets (pan, zoom, rotate)
- Video trimming/editing
- Multiple motion sequences
- Audio/music integration
- Batch download progress

## Technical Details

**Video Format:**
- Output: MP4
- Codec: H.264
- Resolution: Matches input (typically 720p-1080p)
- Frame rate: 24-30 fps
- Duration: 4-5 seconds

**API Integration:**
- Uses Seedance V1 Pro via n8n webhook
- Polling interval: Exponential backoff (1s → 16s max)
- Max polling time: ~2 minutes before timeout
- Concurrent generation: Multiple videos can process simultaneously

**Image Upload:**
- Images uploaded to Google Cloud Storage
- Public URL generated (temporary, expires after use)
- URL passed to Seedance API

## Related Documentation

- **hooks/useVideoStudio.ts**: Hook implementation (443 lines)
- **services/videoService.ts**: Service layer (257 lines)
- **services/imageUploadService.ts**: Image upload to GCS
- **components/CLAUDE.md**: General component patterns
