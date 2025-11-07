# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Studio** is a comprehensive React web application providing multiple AI-powered creative studios. It's designed to run as a custom app in Google AI Studio and uses Google's Gemini API for content generation. The application provides a unified interface with cross-studio integration, allowing users to generate and transfer content between different creative tools.

**Core Studios:**
- Hair Studio: Virtual hairstyle try-on with realistic customization
- Baby Studio: AI-generated baby imagery from two parent photos
- Image Studio: Batch image variation generation with multiple AI models
- Video Studio: Convert static images into animated videos with custom prompts
- Timeline Studio: Create video transitions/stories between image sequences
- Ad Cloner: Deconstruct and generate variations of video advertisements (Beta)
- Video Analyzer: Analyze video ads to generate storyboards and concepts (In Development)

## Development Commands

### Setup and Development
```bash
# Install dependencies
npm install

# Set environment variable (required)
# Create .env.local file with:
# GEMINI_API_KEY=your_api_key_here

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture Overview

### High-Level Design

The application uses a **unified multi-studio hub pattern** where:
- **App.tsx** serves as the central hub managing global state (toasts, modals, image cropping)
- Each studio is rendered conditionally based on `appMode` state
- Studios are fully independent but can share resources through the central hub
- Cross-studio imports allow transferring generated images between studios

```
App.tsx (Global State Hub)
├── appMode: 'hairStudio' | 'babyStudio' | 'imageStudio' | 'videoStudio' | 'timelineStudio' | 'adCloner' | 'videoAnalyzer'
├── Shared Modals: ImageCropper, Lightbox, Help, Settings, Confirmation, Progress
├── Toast Notifications: Error/success messaging
└── Studio Component (routed based on appMode)
    ├── Custom Hook (state & business logic)
    ├── UI Components (renders)
    └── Service Layer (API & utilities)
```

### State Management Pattern

Each studio uses a **custom hook encapsulation** pattern:
- **Hook**: Contains all state, logic, and callbacks for the studio
- **Component**: Renders UI and calls hook functions
- **Services**: Handle API calls and utility functions

Example: Hair Studio
```
useHairStudio() hook:
  - State: croppedImage, generatedImages, pendingImageCount, selectedHairstyle, etc.
  - Callbacks: onCropConfirm(), generateHairstyles(), downloadImage(), etc.

HairStudio.tsx component:
  - Uses hook via const { croppedImage, generatedImages, ... } = useHairStudio(...)
  - Renders image upload, hairstyle gallery, download buttons

hairStudioService.ts:
  - buildHairPrompt(): Constructs Gemini prompt
  - generateHairstyles(): Orchestrates API calls
```

### Cross-Studio Architecture

**Shared Image Cropper System:**
- Single `ImageCropper.tsx` modal handles cropping for all studios
- `activeCropper` state tracks which studio initiated cropping
- `onCropConfirm` callback is studio-specific and updates the appropriate studio's state
- Supports multiple use cases: Hair upload, Baby dual-parent images, Ad Cloner regions, etc.

**Studio Interoperability:**
- Generated images can be imported from one studio to another
- Image transfer via `importToVideoStudio()` and similar functions
- Images converted to appropriate format for target studio
- Session IDs track generation batches for consistency

### Service Layer Architecture

**Core API Layer (geminiService.ts):**
- Centralized Gemini API client initialization and interactions
- File upload management (handles Gemini File API for videos)
- Response parsing with validation
- Error classification and handling
- Model selection logic

**Specialized Services:**
- `hairStudioService.ts`: Hair prompt construction, batch generation
- `babyStudioService.ts`: Two-image combination with style fusion
- `videoService.ts`: Video generation with polling, prompt enhancement
- `adClonerService.ts`: Ad deconstruction and variation generation
- `timelineStudioService.ts`: Timeline transitions and video stitching
- `imageUtils.ts`: Download, crop, format conversion
- `apiUtils.ts`: Concurrency control, retry logic, rate limiting
- `loggingService.ts`: User action tracking

**Critical Pattern - Concurrency Control:**
```typescript
processWithConcurrency(tasks, limit)
// Limits parallel API requests to avoid rate limiting
// Example: limit to 3 simultaneous Gemini requests
```

### Type System

Comprehensive TypeScript interfaces in `types.ts` and `constants.ts`:
- **Image Types**: `GeneratedImage`, `StudioImage`, `ImageStudioResultImage`
- **Studio-Specific Types**: `GenerationOptions`, `BabyGenerationOptions`
- **Video Types**: `ImageForVideoProcessing`, `TimelinePair`, `TimelinePairWithImages`
- **Ad Cloner Types**: `AdClonerGenerationResult`, `VariationState`
- **UI Types**: `Toast`, `ActiveCropper`, `DisplayImage` (union of all image types)

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Single App.tsx hub | Unified UX, centralized state, enables cross-studio features |
| Custom hooks per studio | Complete encapsulation, reusability, testability |
| Service layer abstraction | Separation of concerns, API reuse, easier mocking |
| Client-side FFmpeg | Video processing without server, works in AI Studio sandbox |
| CDN imports in index.html | Compatibility with AI Studio's restricted environment |
| TypeScript comprehensive | Type safety, IDE support, fewer runtime errors |
| Vite over Create React App | Faster dev server, smaller bundle, ES2022 target |
| Tailwind CSS + CDN | Responsive design, no build-time CSS processing needed |

## Important Implementation Patterns

### Image Upload Flow
```
1. User uploads image → handleImageUpload()
2. ImageCropper modal opens (appMode-specific type)
3. User confirms crop → onCropConfirm() called (studio-specific)
4. State updates in respective studio hook
5. UI re-renders with updated image
```

### Generation Flow (Hair Studio Example)
```
1. User selects hairstyles and settings
2. generateHairstyles() called
3. For each combination: build prompt → call geminiService.generateImage()
4. Responses added to generatedImages state
5. Gallery updates with new images
6. User can download or try another combination
```

### Error Handling Strategy
- **Safety filter errors** → "Image appears unsafe, try another"
- **Quota exceeded** → "API quota reached, try again later"
- **Network errors** → Retry with exponential backoff
- **JSON parse failures** → Store raw response for debugging
- **User-facing messages** → Concise, actionable guidance

### Feature Flags
- Ad Cloner toggles via `showBetaFeatures` in localStorage
- Video Analyzer integration controlled by documentation presence
- Settings modal allows toggling beta features and mock data mode

## Project Structure

```
components/          # 52+ React components organized by feature
├── HairStudio.tsx, BabyStudio.tsx, ImageStudio.tsx, etc.
├── adCloner/        # Ad Cloner specific components
├── imageStudio/     # Image Studio specific components
├── help/            # Help/documentation components
├── ImageCropper.tsx, Lightbox.tsx, ToastContainer.tsx, SettingsModal.tsx
└── (Various UI components)

hooks/              # 6 custom hooks (one per major studio)
├── useHairStudio.ts
├── useBabyStudio.ts
├── useImageStudioLogic.ts
├── useVideoStudio.ts
├── useTimelineStudio.ts
└── useAdCloner.ts

services/           # 11 service modules
├── geminiClient.ts, geminiService.ts  # Core API layer
├── hairStudioService.ts, babyStudioService.ts, etc.
├── imageUtils.ts, apiUtils.ts
└── loggingService.ts

prompts/            # System prompts for AI
└── adClonerSystemPrompt.ts

imageStudio/        # Standalone Image Studio sub-app
└── (Complete standalone copy with own package.json)

videoAnalyzer/      # Video Analyzer sub-app (in development)
└── (Documentation and integration guides)

App.tsx             # Main application hub
types.ts            # Comprehensive TypeScript interfaces
constants.ts        # Hairstyles, colors, baby options, etc.
```

## Common Development Tasks

### Adding a New Generation Option to Hair Studio
1. Add option to `HAIRSTYLES` or `HAIR_COLORS` constant
2. Update `GenerationOptions` type if needed
3. Update `buildHairPrompt()` to include new option in prompt
4. Test with mock data mode first (if enabled in SettingsModal)
5. Test with actual API call with various hairstyles

### Modifying Video Generation Prompt
1. Locate prompt in `videoService.ts` or specific studio service
2. Test prompt changes with `MOCK_DATA_ENABLED` to validate format
3. Remember: prompt must produce valid JSON for parsing
4. Check error messages in console if parsing fails

### Adding New Gemini Model
1. Add model ID to appropriate `*Model` type in `types.ts`
2. Add model metadata to relevant constants array
3. Add model-specific logic in `geminiService.generateImage()` if needed
4. Update SettingsModal to display new option
5. Test with mock data, then real API calls

### Debugging API Issues
- Check `loggingService.ts` logs in console
- Enable `logLevel: 'debug'` to see all API interactions
- Check Gemini API quota in Google Cloud Console
- Verify `.env.local` contains valid `GEMINI_API_KEY`
- Use Settings modal to switch between mock data and real API

## Important Files to Understand

**Core Application:**
- `App.tsx`: Main hub with state routing
- `types.ts`: All TypeScript interfaces
- `constants.ts`: Hairstyles, colors, options data

**API Integration:**
- `services/geminiService.ts`: Core API client (critical)
- `services/apiUtils.ts`: Concurrency and retry logic
- Each studio's service file (hairStudioService.ts, etc.)

**Shared Components:**
- `components/ImageCropper.tsx`: Unified image cropping
- `components/Lightbox.tsx`: Image gallery viewer
- `components/SettingsModal.tsx`: Model selection and feature flags

**Sub-applications:**
- `imageStudio/App.tsx`: Standalone Image Studio (separate project structure)
- `videoAnalyzer/`: Documentation for Video Analyzer integration

## Notes on Video Analyzer Integration

The `videoAnalyzer/` directory contains extensive documentation for integrating a video ad analysis feature. This is in development and has its own CLAUDE.md file with detailed implementation guidance. Current integration status is documented in `IMPLEMENTATION_CHECKLIST.md`.

## Environment Configuration

**Required Files:**
- `.env.local`: Must contain `GEMINI_API_KEY` for development
- Not tracked in git (listed in .gitignore)

**Vite Config:**
- `vite.config.ts` exposes `GEMINI_API_KEY` via `define` for client-side access
- ES2022 target with React 19 support
- Entry point: `index.tsx`

**TypeScript:**
- Path alias: `@/` resolves to project root
- Strict mode enabled
- Skip lib check for faster compilation

## Build and Deployment

**Local Development:**
```bash
npm run dev           # Hot reload on port 3000
```

**Production Build:**
```bash
npm run build         # Outputs to dist/
npm run preview       # Preview dist/ locally
```

**Deployment to AI Studio:**
- App is deployed to: https://ai.studio/apps/drive/1BGVS5m7mwSnLk_sRxStq_hVf2bUcGuor
- Deployment process documented in README.md
- Requires authentication with Google account

## Notes on Testing

- **No formal test framework configured** (no Jest/Vitest)
- **Manual testing required** for all features
- **Type checking via TypeScript** at compile time
- **Mock data mode** available in SettingsModal for development without API quota usage
- **Feature flags** and settings modal provide testing controls

## Testing Patterns

**Mock Data Development:**
1. Open SettingsModal
2. Toggle "Use mock data" option
3. Mock API responses loaded from `mockData.ts`
4. Useful for UI development without API quota consumption

**Real API Testing:**
1. Ensure `.env.local` has valid `GEMINI_API_KEY`
2. Disable mock data in SettingsModal
3. Monitor API quota in Google Cloud Console
4. Check console logs for detailed API interactions

## Performance Considerations

- **Concurrency limits**: Default 3 parallel API requests (configurable)
- **Image optimization**: Images downloaded are full quality (large file sizes)
- **Video processing**: FFmpeg runs client-side, CPU intensive
- **File uploads**: Gemini File API has size limits and cleanup requirements
- **Long operations**: Progress modal displays for generation/video processing

## Security Notes

- API key stored in `.env.local`, never committed
- Vite `define` injects key into client bundle (necessary for AI Studio)
- CORS handled by Gemini API
- User safety filters applied to generated images
- No server-side auth needed (API key-based auth)
