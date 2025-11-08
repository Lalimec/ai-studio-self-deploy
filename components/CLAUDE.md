# Components Directory

This directory contains all React components for the AI Studio application, organized by studio and functionality.

## Directory Structure

```
components/
├── (Shared Components - Root Level)
├── hairStudio/
├── babyStudio/
├── videoStudio/
├── timelineStudio/
├── imageStudio/
├── adCloner/          # BETA
├── videoAnalyzer/     # BETA
└── help/
```

**Total**: 59 component files, ~15,000 lines of TSX

## Shared Components (Root Level)

These components are used across multiple studios and provide core functionality for the application.

### Image Handling Components

#### ImageCropper.tsx
**Purpose**: Global modal image cropper used across all studios

**Key Features:**
- Modal dialog with ReactCrop integration
- Aspect ratio control (passed as prop)
- Zoom slider (exponential scale for fine control)
- Pan support with mouse/touch
- Reset crop button
- Cancel/Confirm workflow

**Usage Pattern:**
```tsx
<ImageCropper
  isOpen={!!activeCropper}
  imageDataUrl={imageToCrop}
  onClose={onCropCancel}
  onConfirm={onCropConfirm}
  aspectRatio={aspectRatio}
  activeCropper={activeCropper} // 'hair' | 'baby' | 'ad' | etc.
/>
```

**Important**: The `onConfirm` callback is studio-specific and updates the appropriate studio's state.

#### EmbeddedImageCropper.tsx
**Purpose**: Inline cropper component with ref API for programmatic control

**NEW FEATURE** - Differs from ImageCropper:
- Embedded inline (not modal)
- Exposed via ref for external control
- Used in Ad Cloner for subject image cropping
- Programmatic crop confirmation

**Usage Pattern:**
```tsx
const cropperRef = useRef<EmbeddedImageCropperRef>(null);

<EmbeddedImageCropper
  ref={cropperRef}
  imageDataUrl={imageDataUrl}
  aspectRatio={1}
  onCropComplete={(croppedImage) => setCroppedSubject(croppedImage)}
/>

// Programmatically trigger crop
cropperRef.current?.confirmCrop();
```

#### MultiCropView.tsx
**Purpose**: Batch image cropping interface for Image Studio

**Features:**
- Display multiple images in grid
- Crop each image individually
- Progress tracking (N of M cropped)
- Navigate between images
- Batch confirm workflow

**Workflow:**
1. User selects multiple images
2. CropChoiceModal asks if they want to crop
3. If yes → MultiCropView opens
4. User crops each image sequentially
5. Batch confirm updates all images

#### Lightbox.tsx
**Purpose**: Full-screen image viewer with navigation

**Features:**
- Full-screen modal overlay
- Previous/Next navigation
- Image counter (N of M)
- Download button
- Close on ESC or click outside
- Keyboard navigation (arrow keys)

**Used by:** All studios for viewing generated images

### Modal Components

#### CropChoiceModal.tsx
**Purpose**: Dialog asking if user wants to crop images

**Workflow:**
- Appears when multiple images uploaded to Image Studio
- Options: "Crop All" or "Use Original"
- If "Crop All" → Opens MultiCropView
- If "Use Original" → Uses images as-is

#### ConfirmationDialog.tsx
**Purpose**: Reusable confirmation modal

**Props:**
- `isOpen`: Boolean
- `title`: String
- `message`: String
- `onConfirm`: Callback
- `onCancel`: Callback
- `confirmText`: String (default: "Confirm")
- `cancelText`: String (default: "Cancel")

**Used for:** Destructive actions, important decisions

#### HelpModal.tsx
**Purpose**: Context-aware help system

**Features:**
- Displays help content based on current `appMode`
- Loads appropriate help component (HairStudioHelp, BabyStudioHelp, etc.)
- Collapsible sections
- Code examples
- Tips and best practices

**Help Components:** See `help/` directory

#### GlobalSettingsModal.tsx
**Purpose**: Centralized application settings

**NEW FEATURE** - Provides:
- **Beta Features Toggle**: Show/hide Ad Cloner and Video Analyzer
- **Mock Data Mode**: Use mock responses for development
- **Model Selection**: Per-studio model preferences
- **Webhook Settings**: Toggle nanoBananaWebhook per studio (Hair, Baby, Image, AdCloner, VideoAnalyzer)

**localStorage Keys:**
- `showBetaFeatures`: Boolean
- `nanoBananaWebhookSettings`: Object with per-studio booleans

#### DownloadProgressModal.tsx
**Purpose**: Display progress for long operations

**Features:**
- Progress bar (percentage)
- Current operation description
- Cancel button (if cancellable)
- Used for downloads, video stitching, batch generation

### Upload Components

#### ImageUploader.tsx
**Purpose**: Single image upload component

**Features:**
- Drag-and-drop support
- Click to browse
- File type validation (image/*)
- Preview uploaded image
- Clear button

**Used by:** Hair Studio, Baby Studio, Ad Cloner

#### MultiImageUploader.tsx
**Purpose**: Multiple image upload component

**Features:**
- Upload multiple files at once
- Drag-and-drop support
- File list display
- Individual file removal
- Batch clear

**Used by:** Image Studio, Timeline Studio

#### UploaderZone.tsx
**Purpose**: Drag-and-drop upload zone (reusable component)

**Features:**
- Highlighted on drag-over
- Click to browse fallback
- Customizable placeholder text
- File type filtering

### UI Components

#### ToastContainer.tsx
**Purpose**: Toast notification system

**Features:**
- Error/success/warning toast types
- Auto-dismiss after 5 seconds
- Manual dismiss button
- Stacked toasts
- Different colors per type (red/green/yellow)

**Toast Type:**
```typescript
type Toast = {
  id: string;
  message: string;
  type: 'error' | 'success' | 'warning';
};
```

#### ImageGrid.tsx
**Purpose**: Reusable grid layout for images

**Features:**
- Responsive grid (adjusts to screen size)
- Click to view in Lightbox
- Download button per image
- Hover effects
- Loading states

#### LoadingSpinner.tsx
**Purpose**: Loading indicator

**Variants:**
- Inline spinner (small)
- Full-screen spinner (large)
- With message

#### Icons.tsx
**Purpose**: Custom SVG icon components

**Icons:**
- `HairStudioIcon`
- `BabyIcon`
- `ImageIcon`
- `VideoIcon`
- `TimelineIcon`
- `AdClonerIcon`
- `VideoAnalyzerIcon`

**Usage:** Studio navigation, buttons

### Prompt & Text Components

#### SinglePromptEditor.tsx
**Purpose**: Prompt editing UI component

**Features:**
- Textarea for prompt input
- Character count
- Placeholder text
- Auto-resize

**Used by:** Video Studio, Timeline Studio

## Studio-Specific Components

### ImageStudio.tsx (Root Level - Not in Subfolder)

**Location**: `components/ImageStudio.tsx` (directly in components/)

**Note**: Unlike other studios, Image Studio main component is at root level, with subcomponents in `imageStudio/` subfolder.

**Key Features:**
- Most complex studio (648-line hook)
- Batch image upload and generation
- JSON prompt import/export
- Model selection UI
- Advanced options panel
- Progress tracking

**Related Hook**: `hooks/useImageStudioLogic.ts`

### imageStudio/ Subdirectory

**Files:**
1. `ImageStudioConfirmationDialog.tsx` - Custom confirmation for batch operations
2. `GeneratedImageDisplay.tsx` - Display generated images with download
3. `ImageUploader.tsx` - Upload interface (studio-specific variant)
4. `PromptEditor.tsx` - Advanced prompt editing with enhancement buttons
5. `GenerateButton.tsx` - Generation trigger button
6. `ProgressBar.tsx` - Progress indicator
7. `AdvancedOptions.tsx` - Advanced settings (aspect ratio, dimensions, filename templates)
8. `CropChoiceModal.tsx` - Crop workflow dialog
9. `MultiCropView.tsx` - Multi-image cropping

### hairStudio/

**Files:**
1. `HairStudio.tsx` - Main component
2. `HairOptionsPanel.tsx` - Options selection panel

**Features:**
- 100+ hairstyle options
- Hair color selection
- Male beards, female accessories
- Pose/angle options
- Batch generation (multiple combinations)

**Related Hook**: `hooks/useHairStudio.ts`

### babyStudio/

**Files:**
1. `BabyStudio.tsx` - Main component
2. `BabyOptionsPanel.tsx` - Options selection panel

**Features:**
- Dual parent image upload
- Baby age selection (newborn to 3 years)
- Gender selection
- Composition/background options
- Clothing styles
- Actions/poses

**Related Hook**: `hooks/useBabyStudio.ts`

### videoStudio/

**Files:**
1. `VideoStudio.tsx` - Main component

**Features:**
- Image upload for video source
- Prompt editor with enhancement
- Video generation with polling
- Progress tracking
- Video preview and download

**Related Hook**: `hooks/useVideoStudio.ts`

### timelineStudio/

**Files:**
1. `TimelineStudio.tsx` - Main component
2. `TimelinePairCard.tsx` - Card for timeline pair
3. `TimelinePairLightbox.tsx` - Full-screen view for pairs
4. `StitchTester.tsx` - Testing interface for video stitching

**Features:**
- Upload multiple images
- Create image pairs for transitions
- Custom prompts per pair
- Video generation for each pair
- Stitch videos into final timeline
- Preview stitched video

**Related Hook**: `hooks/useTimelineStudio.ts`

### adCloner/ (BETA)

**See**: `components/adCloner/CLAUDE.md` for detailed documentation

**Files:**
1. `AdClonerStudio.tsx` - Main component
2. `AdClonerUploader.tsx` - Ad and subject image upload
3. `AdClonerResults.tsx` - Display ad variations
4. `VariationCard.tsx` - Individual variation card with refine/regenerate
5. `SettingsModal.tsx` - Ad Cloner-specific settings

**Features:**
- Upload ad image + subject images
- AI-powered ad context research
- Generate ad variations
- Refine variations with additional images
- Per-variation state management
- Multi-model support

**Related Hook**: `hooks/useAdCloner.ts`

### videoAnalyzer/ (BETA)

**See**: `components/videoAnalyzer/CLAUDE.md` for detailed documentation

**Files:**
1. `VideoAnalyzerStudio.tsx` - Main component
2. `VideoFileUpload.tsx` - Video upload
3. `AdAnalysisCard.tsx` - 10-point analysis display
4. `StoryboardCard.tsx` - Storyboard with frames
5. `AdIdeaCard.tsx` - Static ad concept display
6. `ConceptApproachCard.tsx` - Concept approach display
7. `ConceptGenerationControls.tsx` - Concept generation UI
8. `SceneGenerationControls.tsx` - Scene variation UI
9. `AnalysisSettings.tsx` - Model selection
10. `AnalysisErrorCard.tsx` - Error display with retry
11. `MarkdownRenderer.tsx` - Renders markdown content
12. `Loader.tsx` - Loading state
13. `mockData.ts` - Mock data for development

**Features:**
- Video upload and processing
- 10-point strategic analysis
- Storyboard generation with frame extraction
- Static ad concept generation
- Scene variation generation
- JSON error recovery

**Related Hook**: `hooks/useVideoAnalyzerStudio.ts` (880 lines, largest)

### help/

**Purpose**: Help documentation components for each studio

**Files:**
1. `GeneralHelp.tsx` - General app help
2. `HairStudioHelp.tsx` - Hair Studio guide
3. `BabyStudioHelp.tsx` - Baby Studio guide
4. `VideoStudioHelp.tsx` - Video Studio guide
5. `TimelineStudioHelp.tsx` - Timeline Studio guide
6. `ImageStudioHelp.tsx` - Image Studio guide
7. `AdClonerHelp.tsx` - Ad Cloner guide
8. `HelpSection.tsx` - Reusable section component
9. `CollapsibleSection.tsx` - Collapsible content component

**Pattern**: Each help component provides comprehensive documentation, examples, tips, and troubleshooting for its studio.

## Component Integration Patterns

### Hook Integration

**All studio components follow this pattern:**

```tsx
function StudioComponent() {
  const {
    // State
    images,
    generatedResults,
    isGenerating,

    // Callbacks
    onImageUpload,
    onGenerate,
    onDownload,

    // Handlers
    handleCropConfirm,
    handleImageClear,
  } = useStudioHook({
    showToast,
    openModal,
    // ... other callbacks from App.tsx
  });

  return (
    <div>
      {/* Render UI using state and callbacks */}
    </div>
  );
}
```

**Key Points:**
- Hook encapsulates ALL business logic
- Component is pure presentation layer
- Callbacks passed from App.tsx via props
- State managed in hook, not component

### Modal Management

**Global modals managed in App.tsx:**
```tsx
// App.tsx
const [activeCropper, setActiveCropper] = useState<ActiveCropper | null>(null);
const [lightboxImages, setLightboxImages] = useState<DisplayImage[]>([]);

// Passed to studios as callbacks
const openImageCropper = (type: ActiveCropper, imageDataUrl: string) => {
  setActiveCropper(type);
  setImageToCrop(imageDataUrl);
};

const openLightbox = (images: DisplayImage[], startIndex: number) => {
  setLightboxImages(images);
  setLightboxIndex(startIndex);
};
```

### Toast Pattern

**Toast notifications:**
```tsx
// App.tsx
const [toasts, setToasts] = useState<Toast[]>([]);

const showToast = (message: string, type: 'error' | 'success' | 'warning' = 'success') => {
  const id = Date.now().toString();
  setToasts(prev => [...prev, { id, message, type }]);
};

// Passed to all studio hooks
const hookProps = {
  showToast,
  // ...
};
```

## Important Component Relationships

### Image Cropping Flow

```
User uploads image
  ↓
Studio component calls onImageUpload (from hook)
  ↓
Hook calls openImageCropper (from App.tsx)
  ↓
App.tsx sets activeCropper state
  ↓
ImageCropper modal opens
  ↓
User crops and confirms
  ↓
onCropConfirm called (studio-specific callback)
  ↓
Hook updates studio state with cropped image
  ↓
Component re-renders with cropped image
```

### Image Generation Flow

```
User configures options and clicks Generate
  ↓
Component calls onGenerate (from hook)
  ↓
Hook calls service layer (e.g., hairStudioService.generateHairstyles)
  ↓
Service calls geminiService.generateFigureImage
  ↓
geminiService routes to appropriate model (Gemini/NanoBanana/Seedream/Flux)
  ↓
Response parsed and added to generatedImages state
  ↓
Component re-renders with new images
  ↓
User can view in Lightbox or download
```

### Cross-Studio Import

```
User clicks "Import to Video Studio" on generated image
  ↓
Hook calls importToVideoStudio(image)
  ↓
App.tsx setAppMode('videoStudio')
  ↓
App.tsx setImportedImageForVideo(image)
  ↓
VideoStudio component receives imported image
  ↓
Video Studio hook processes imported image
```

## Best Practices

### When Adding New Component

1. **Determine if shared or studio-specific**
   - Shared → Place in `components/` root
   - Studio-specific → Place in `components/{studioName}/`

2. **Follow naming conventions**
   - PascalCase for component files
   - Descriptive names (e.g., `AdClonerUploader`, not `Uploader`)

3. **Use TypeScript interfaces**
   - Define props interface
   - Export interface if reusable
   - Use types from `types.ts`

4. **Separation of concerns**
   - Component: Presentation only
   - Hook: Business logic and state
   - Service: API calls and utilities

5. **Consistent styling**
   - Use Tailwind CSS classes
   - Follow existing patterns
   - Responsive design (mobile-first)

### When Modifying Component

1. **Read the hook first** - Understand state and callbacks
2. **Check all usages** - Search for component imports
3. **Test all studios** - Changes to shared components affect all studios
4. **Update types** - If props change, update TypeScript interfaces
5. **Check mobile** - Test responsive behavior

## Common Component Tasks

### Add New Shared Modal

1. Create component file: `components/MyModal.tsx`
2. Add state to `App.tsx`: `const [isMyModalOpen, setIsMyModalOpen] = useState(false)`
3. Add open callback: `const openMyModal = () => setIsMyModalOpen(true)`
4. Pass callback to studios via hook props
5. Render modal in `App.tsx`: `<MyModal isOpen={isMyModalOpen} onClose={...} />`

### Add New Studio

1. Create directory: `components/myStudio/`
2. Create main component: `MyStudio.tsx`
3. Create hook: `hooks/useMyStudio.ts`
4. Create service: `services/myStudioService.ts`
5. Add to `appMode` type in `types.ts`
6. Add to `App.tsx` switch statement
7. Create help component: `help/MyStudioHelp.tsx`
8. Create icon: Add to `Icons.tsx`

### Add Option to Existing Studio

1. Update constants in `constants.ts`
2. Update types in `types.ts` if needed
3. Update options panel component (e.g., `HairOptionsPanel.tsx`)
4. Update service prompt builder (e.g., `buildHairPrompt()`)
5. Test generation with new option

## Component Dependencies

### External Libraries

- **React**: Core framework (v19)
- **ReactCrop**: Image cropping (`react-image-crop`)
- **Tailwind CSS**: Styling (CDN)
- **Lucide React**: Icons (optional, mostly custom icons)

### Internal Dependencies

- **types.ts**: TypeScript interfaces
- **constants.ts**: Preset data (hairstyles, colors, etc.)
- **hooks/**: Custom hooks for business logic
- **services/**: API calls and utilities

## Testing Patterns

**No formal testing framework**, but follow these manual testing practices:

1. **Component rendering**: Check all states (loading, error, success)
2. **User interactions**: Click all buttons, upload images, edit prompts
3. **Error states**: Test with invalid inputs, network errors
4. **Responsive design**: Test on mobile, tablet, desktop
5. **Cross-studio**: Test imports, shared modals, navigation

## Performance Considerations

- **Large image lists**: Use virtual scrolling for 50+ images (not implemented yet)
- **Image optimization**: Images displayed at full resolution (consider lazy loading)
- **Component re-renders**: Memoization not heavily used (React 19 handles well)
- **FFmpeg processing**: CPU-intensive, runs in web worker (Timeline Studio)

## Related Documentation

- **Root CLAUDE.md**: High-level project overview
- **hooks/CLAUDE.md**: Hook patterns and usage
- **services/CLAUDE.md**: Service layer architecture
- **components/adCloner/CLAUDE.md**: Ad Cloner beta feature
- **components/videoAnalyzer/CLAUDE.md**: Video Analyzer beta feature
