# Timeline Studio Components

**Production Studio** - Create video transitions and stories between image sequences

## Overview

Timeline Studio allows users to create narrative sequences by generating transition videos between image pairs, then stitching them into a complete timeline. It's designed for creating video stories, before/after sequences, and product demonstrations.

## Components (4 files)

### TimelineStudio.tsx
**Main component** - Timeline creation and video stitching

**Features:**
- Multi-image upload
- Create image pairs (Image 1 → Image 2)
- Custom transition prompt per pair
- Video generation per pair
- Reorder pairs (drag-and-drop)
- Stitch all videos into final timeline
- Preview stitched timeline
- Download final video

**Related Hook**: `hooks/useTimelineStudio.ts` (741 lines)

**Props from App.tsx:**
- `showToast`: Toast notification callback
- `openConfirmationDialog`: Confirmation modal

---

### TimelinePairCard.tsx
**Card component for timeline pair**

**Features:**
- Displays two images (source → target)
- Arrow indicating transition direction
- Custom prompt editor
- "Generate Transition" button
- Video preview (when generated)
- Play/pause controls
- Download individual transition
- Delete pair button
- Drag handle for reordering

**Props:**
- `pair`: TimelinePair object
- `video`: Video URL (if generated)
- `isGenerating`: Boolean
- `onGenerateVideo`: Callback to generate transition
- `onEditPrompt`: Callback to edit prompt
- `onDelete`: Callback to delete pair
- `onReorder`: Callback for drag-drop reordering

---

### TimelinePairLightbox.tsx
**Full-screen view for timeline pairs**

**Features:**
- Full-screen image comparison
- Side-by-side or overlay mode
- Slider to compare images
- Transition video playback (if generated)
- Navigation: Previous/Next pair
- Close button
- Keyboard navigation (arrow keys, ESC)

**Props:**
- `pairs`: Array of timeline pairs
- `currentIndex`: Index of pair to display
- `isOpen`: Boolean
- `onClose`: Callback
- `onNavigate`: Callback for prev/next

**Usage:**
- Click on pair in TimelineStudio → Opens lightbox
- Compare images before generating transition
- Review video transition in full screen

---

### StitchTester.tsx
**Testing interface for video stitching** (Debug/Development)

**Features:**
- Manual video URL input
- Test stitching with custom URLs
- Progress monitoring
- Error testing
- Download stitched test video

**Purpose**: Development tool to test video stitching without full timeline workflow

**Props:**
- Debug mode only (not shown in production UI)

## Hook: useTimelineStudio.ts (741 lines)

**See**: `hooks/CLAUDE.md` for detailed hook documentation

**Key State:**
- `studioImages`: Array of uploaded images
- `timelinePairs`: Array of { id, image1, image2, prompt }
- `pairVideos`: Map of pairId → video URL
- `videoProgress`: Map of pairId → progress state
- `stitchingProgress`: Stitching state
- `finalVideo`: Stitched timeline URL
- `pairOrder`: Array of pair IDs for sequencing

**Key Functions:**
- `handleImageUpload(files)`: Upload images
- `createPair(image1, image2)`: Create new pair
- `editPairPrompt(pairId, prompt)`: Customize transition prompt
- `generatePairVideo(pair)`: Generate single transition
- `generateAllVideos()`: Batch generate all transitions
- `reorderPairs(newOrder)`: Drag-drop reordering
- `stitchAllVideos()`: Stitch timeline into final video
- `deletePair(pairId)`: Remove pair from timeline
- `downloadFinalVideo()`: Download stitched timeline

## Services

### timelineStudioService.ts (102 lines)

**See**: `services/CLAUDE.md` for detailed service documentation

**Key Functions:**
- `prepareTimelineVideo(imageUrl1, imageUrl2, prompt, onProgress)`: Generate transition video
- `pollTimelineVideoStatus(workflowId, onProgress)`: Poll for completion

---

### videoStitcher.ts (65 lines)

**Key Function:**
- `stitchVideos(videoUrls, onProgress)`: Stitch multiple videos into one

**Process:**
1. POST array of video URLs to n8n webhook
2. Server-side FFmpeg stitches videos
3. Polling for completion
4. Returns stitched video URL

**Why Remote Stitching?**
- FFmpeg.wasm (client-side) is slow for large files
- Server-side FFmpeg is significantly faster
- Handles transcoding and format conversion

## Workflow

### Basic Timeline Creation
1. Upload 6-10 images
2. Click "Create Pair" on first two images
3. Enter transition prompt (e.g., "Smooth fade transition")
4. Repeat for remaining images (create 5 pairs)
5. Reorder pairs if needed (drag-and-drop)
6. Click "Generate All Transitions"
7. Each pair generates video (30-60s each)
8. When all complete, click "Stitch Timeline"
9. Final video generated (2-5 minutes for stitching)
10. Download and review timeline

### Advanced Timeline
1. Upload product evolution images (10 versions)
2. Create sequential pairs (V1→V2, V2→V3, ... V9→V10)
3. Custom prompts per transition:
   - "Morph transition showing evolution"
   - "Fade with feature highlights"
   - "Zoom transition focusing on changes"
4. Generate all transitions
5. Reorder pairs to tell story
6. Stitch final product evolution video

### Before/After Sequence
1. Upload before/after pairs (5 transformations)
2. Create pairs (before→after for each)
3. Prompt: "Dramatic reveal transition"
4. Generate transitions
5. Stitch into before/after compilation
6. Download for presentation

## Prompts

**Default Transition Prompt**:
```
"Smooth transition with gradual crossfade,
professional video production quality"
```

**Common Transition Types:**
- **Fade**: "Gentle crossfade transition"
- **Morph**: "Smooth morph between images"
- **Zoom**: "Zoom out from first image, zoom in to second"
- **Pan**: "Pan from left image to right image"
- **Wipe**: "Wipe transition revealing second image"
- **Slide**: "Slide transition from first to second"

**Narrative Transitions:**
- "Story progression with subtle fade"
- "Time lapse transition showing passage of time"
- "Seasonal change transition"
- "Evolution transition highlighting changes"

## Timeline Pair Management

**Creating Pairs:**
- Select two images → Create pair
- Auto-pair: Sequential images (1→2, 2→3, 3→4)
- Manual pair: Choose any two images

**Reordering Pairs:**
- Drag-and-drop to reorder
- Timeline sequence: Pair 1 → Pair 2 → Pair 3 → ...
- Final video follows pair order

**Editing Pairs:**
- Change prompt → Regenerate transition
- Swap images (reverse transition direction)
- Delete pair → Removes from timeline

## Stitching Process

**Input**: Array of video URLs (one per pair)

**Process:**
1. Upload video URLs to n8n webhook
2. Server downloads all videos
3. FFmpeg concatenates with crossfades
4. Applies consistent format/codec
5. Uploads stitched video to storage
6. Returns public URL

**Progress Tracking:**
- "Preparing videos..." (downloading)
- "Stitching timeline..." (FFmpeg processing)
- "Finalizing..." (uploading result)
- "Complete!" (ready to download)

**Typical Duration:**
- 3 pairs: ~30 seconds stitching
- 5 pairs: ~60 seconds stitching
- 10 pairs: ~2-3 minutes stitching

## Common Use Cases

### Product Evolution Story
1. Upload product versions (5-10)
2. Create sequential pairs
3. Prompt: "Evolution transition showing improvements"
4. Generate and stitch
5. Product evolution timeline video

### Before/After Compilation
1. Upload before/after images (multiple transformations)
2. Create before→after pairs
3. Prompt: "Dramatic reveal transition"
4. Stitch into compilation
5. Before/after showcase video

### Seasonal Changes
1. Upload same location at different seasons
2. Create season-to-season pairs
3. Prompt: "Seasonal transition with time lapse effect"
4. Stitch seasonal progression

### Tutorial Sequence
1. Upload step-by-step tutorial images
2. Create sequential pairs
3. Prompt: "Step transition with emphasis on changes"
4. Stitch into tutorial video

## Best Practices

**Image Selection:**
- Use similar aspect ratios (transitions smoother)
- Consistent lighting (reduces jarring changes)
- High resolution (better video quality)
- Related images (tells coherent story)

**Pair Creation:**
- Sequential pairs for narratives
- Logical flow (beginning → end)
- Not too many pairs (3-7 ideal for timelines)

**Prompt Writing:**
- Specific transition type
- Mention pacing (slow, fast, smooth)
- Reference what changes between images
- Keep concise (1-2 sentences)

**Stitching:**
- Generate all pairs before stitching
- Review each transition video
- Regenerate poor transitions before stitching
- Final stitch cannot be edited (must re-stitch)

## Troubleshooting

**Pair Video Generation Slow:**
- **Cause**: Each pair takes 30-60 seconds
- **Solution**: Be patient, generate in parallel

**Stitching Failed:**
- **Cause**: One or more videos invalid or missing
- **Solution**: Ensure all pairs have generated videos

**Final Video Doesn't Flow:**
- **Cause**: Incorrect pair order or mismatched transitions
- **Solution**: Reorder pairs, regenerate transitions with better prompts

**Stitched Video Too Long:**
- **Cause**: Too many pairs or long transition videos
- **Solution**: Reduce number of pairs or use shorter transitions

**Downloaded Video Corrupt:**
- **Cause**: Download interrupted or stitching incomplete
- **Solution**: Wait for complete stitching, re-download

## Limitations

- **No transition editing**: Can't adjust generated transitions
- **No video trimming**: Can't trim individual pair videos
- **No audio**: Videos are silent (no audio support)
- **Fixed format**: Output format determined by server
- **Re-stitch required**: Changing order requires full re-stitch

## Future Enhancements

- Transition type presets (fade, morph, wipe, etc.)
- Video trimming/editing
- Audio/music integration
- Custom crossfade duration
- Preview before stitching
- Partial re-stitching (don't re-stitch all)

## Technical Details

**Transition Video:**
- Duration: 4-5 seconds per transition
- Format: MP4, H.264
- Resolution: Matches input images

**Final Timeline:**
- Format: MP4, H.264
- Duration: (Number of pairs × 4-5 seconds)
- Crossfades between transitions

**Stitching:**
- Server-side FFmpeg
- Consistent codec/format conversion
- Crossfade blending between clips

## Related Documentation

- **hooks/useTimelineStudio.ts**: Hook implementation (741 lines)
- **services/timelineStudioService.ts**: Service layer (102 lines)
- **services/videoStitcher.ts**: Stitching logic (65 lines)
- **services/videoService.ts**: Shared video utilities
- **components/CLAUDE.md**: General component patterns
