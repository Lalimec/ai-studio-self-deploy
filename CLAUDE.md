# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Studio** is a comprehensive React web application providing multiple AI-powered creative studios. It's designed to run as a custom app in Google AI Studio and can be deployed to Google Cloud Run with IAP authentication. The application uses multiple AI models including Google's Gemini API and external models via webhooks for content generation. It provides a unified interface with cross-studio integration, allowing users to generate and transfer content between different creative tools.

**Production Studios:**
- **Hair Studio**: Virtual hairstyle try-on with realistic customization (100+ hairstyles, colors, accessories)
- **Baby Studio**: AI-generated baby imagery from two parent photos with age/style options
- **Image Studio**: Advanced batch image variation generation with multiple AI models, JSON import/export, prompt enhancement, EXIF embedding
- **Video Studio**: Convert static images into animated videos with custom prompts (Seedance V1 Pro)
- **Timeline Studio**: Create video transitions/stories between image sequences with FFmpeg stitching

**Beta Studios** (toggleable via GlobalSettingsModal):
- **Ad Cloner**: Deconstruct and generate variations of advertisements with AI-powered context research and refinement
- **Video Analyzer**: Comprehensive video ad analysis with 10-point strategic framework, storyboard extraction, frame analysis, and static concept generation

**AI Models Supported:**
- Google Gemini (Flash, Pro) - Text and image generation
- Nano Banana - High-quality image generation via webhook
- Seedream 4.0 - Advanced image generation via webhook
- Flux Kontext Pro - Image generation via webhook
- Seedance V1 Pro - Video generation from images

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
├── Shared Modals: ImageCropper, EmbeddedImageCropper, Lightbox, HelpModal, GlobalSettingsModal, Confirmation, DownloadProgress
├── Toast Notifications: Error/success/warning messaging system
├── nanoBananaWebhookSettings: Per-studio webhook vs native API toggle
└── Studio Component (routed based on appMode)
    ├── Custom Hook (state & business logic)
    ├── UI Components (renders)
    └── Service Layer (API & utilities)
```

**New Global Features:**
- **GlobalSettingsModal**: Centralized settings for beta features, model selection, webhook toggles, and mock data mode
- **NanoBananaWebhookSettings**: Per-studio configuration to use n8n webhook or native Gemini API (stored in localStorage)
- **EmbeddedImageCropper**: Inline cropper component with ref API for programmatic control (in addition to modal ImageCropper)
- **Warning Toasts**: Toast system supports error/success/warning types for better UX

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

**Core API Layer:**
- `geminiClient.ts`: Simple GoogleGenAI instance initialization
- `geminiService.ts`: **CRITICAL** - Multi-model orchestration layer
  - `generateFigureImage()`: Routes to Gemini, Nano Banana, Seedream, or Flux based on model parameter
  - `translateToEnglish()`: Prompt translation for non-English inputs
  - `enhancePrompt()`: AI-powered prompt improvement
  - `generatePromptVariation()`: Creates prompt variations
  - `generatePromptList()`: Batch prompt generation with structured output
  - Webhook vs native API routing based on `nanoBananaWebhookSettings`
- `endpoints.ts`: Centralized endpoint configuration (Constance pattern)
  - Model definitions with metadata (tokens, dimensions, aspect ratios)
  - Request/response schema documentation
  - n8n webhook URLs for external models

**Studio-Specific Services:**
- `hairStudioService.ts` (280 lines): Hair prompt construction with pose/color/adornment logic, batch generation
- `babyStudioService.ts` (241 lines): Two-parent fusion prompts, baby generation with age/gender/style
- `videoService.ts` (257 lines): Image upload to public URL, Seedance video generation, polling with exponential backoff
- `timelineStudioService.ts` (102 lines): Timeline pair preparation, video generation for transitions
- `adClonerService.ts` (180 lines): **BETA** - Ad context research, prompt generation, variation refinement, image regeneration
- `videoAnalyzerService.ts` (305 lines): **BETA** - 10-point analysis, JSON parsing with AI repair, frame extraction, concept generation
- `videoStitcher.ts` (65 lines): Remote video stitching via n8n webhook with progress callbacks

**Utility Services:**
- `imageUtils.ts` (148 lines): File/blob/dataURL conversion, download functions, filename templates, **EXIF prompt embedding**
- `imageUploadService.ts` (37 lines): Upload images to Google Cloud Storage via webhook
- `apiUtils.ts` (61 lines): Generic concurrency controller, task runner with progress callbacks
- `loggingService.ts` (46 lines): **Cloud Logging integration** - Structured JSON logs, user ID tracking, GCP Cloud Monitoring support

**Critical Pattern - Concurrency Control:**
```typescript
processWithConcurrency(tasks, limit)
// Limits parallel API requests to avoid rate limiting
// Example: limit to 3 simultaneous Gemini requests
```

### Type System

Comprehensive TypeScript interfaces in `types.ts` (450+ lines) and `constants.ts`:

**Image & Generation Types:**
- `GeneratedImage`, `GeneratedBabyImage`, `StudioImage`, `ImageStudioResultImage`
- `GenerationOptions`, `BabyGenerationOptions`, `ImageForVideoProcessing`
- `ParentImageState`: Parent 1/2 image management for Baby Studio
- `AppFile`: File wrapper with unique IDs for batch operations

**Video & Timeline Types:**
- `TimelinePair`, `TimelinePairWithImages`: Timeline studio pair management
- `VideoProgress`: Tracks video generation/stitching progress

**Ad Cloner Types (Beta):**
- `AdImageState`, `AdSubjectImageState`: Image state for ad and subject images
- `AdClonerSettings`: Text model (flash/pro) and image model (gemini/nanoBanana) selection
- `AdClonerGenerationResult`: Complete ad analysis with variations
- `VariationState`: Per-variation state (generating, refining, error tracking)

**Video Analyzer Types (Beta):**
- `VideoAnalysis`: Complete analysis with 10-point framework
- `StoryboardScene`: Scene with timestamp, description, visual elements
- `AdIdea`: Static ad concept with tagline, imagery, targeting
- `ConceptApproach`: Strategic approach for concept generation
- `AnalysisModel`: Text models for analysis (flash-1.5-8b, flash-2.0, flash-2.0-thinking, pro-002)
- `ImageModel`: Image generation models (gemini, nanoBanana, seedream, flux)

**UI & Modal Types:**
- `Toast`: Notification with type (error/success/warning)
- `ActiveCropper`: Tracks which studio initiated cropping (hair, baby, baby_parent2, ad, adSubject, etc.)
- `DisplayImage`: Union type of all image types across studios
- `AppMode`: Union of all studio identifiers

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Single App.tsx hub | Unified UX, centralized state, enables cross-studio features |
| Custom hooks per studio | Complete encapsulation, reusability, testability |
| Service layer abstraction | Separation of concerns, API reuse, easier mocking |
| Multi-model routing in geminiService | Centralized model selection, easy to add new models |
| **Server-side API proxy** | **API key security, prevents client-side exposure, CORS handling** |
| **Service Worker + WS interceptor** | **Transparent HTTP/WebSocket proxying without code changes** |
| Client-side FFmpeg | Video processing without server, works in AI Studio sandbox |
| n8n webhook integration | Leverage external models (Nano Banana, Seedream, Flux) without direct API integration |
| CDN imports in index.html | Compatibility with AI Studio's restricted environment |
| TypeScript comprehensive | Type safety, IDE support, fewer runtime errors |
| Vite over Create React App | Faster dev server, smaller bundle, ES2022 target |
| Tailwind CSS + CDN | Responsive design, no build-time CSS processing needed |
| **Cloud Run + IAP deployment** | **Scalable hosting with domain-restricted authentication** |
| **Structured logging to Cloud Monitoring** | **Production observability, user analytics, error tracking** |

## Server-Side Proxy Architecture

**CRITICAL SECURITY FEATURE**: The application uses a server-side proxy to prevent API key exposure in the client bundle.

### Proxy Pattern (server/):

**Express Server (server.js - 376 lines):**
- HTTP proxy: `/api-proxy/**` → `generativelanguage.googleapis.com/**`
- WebSocket proxy: Same path pattern for streaming
- **API Key Injection**: Server-side only, never sent to client
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Exposes Google File API upload headers
- **Static Serving**: Serves frontend from `dist/` folder
- **Dynamic Injection**: Injects service-worker.js and websocket-interceptor.js into index.html at runtime

**Client-Side Interception:**
- `service-worker.js` (80+ lines): Intercepts HTTP requests to `generativelanguage.googleapis.com` and rewrites to `/api-proxy`
- `websocket-interceptor.js` (66 lines): Uses Proxy pattern to wrap WebSocket constructor and rewrite wss:// connections

**Benefits:**
- API key never exposed in client bundle or network traffic
- Works transparently with existing Gemini SDK code
- CORS issues handled server-side
- Rate limiting protects against abuse
- Compatible with Cloud Run and local development

### Deployment Pattern:

**Local Development:**
```bash
npm run dev          # Vite dev server (API key in .env.local, injected via define)
npm run preview      # Production preview without proxy
```

**Production (Cloud Run):**
```bash
npm run build        # Build frontend
cd server && npm start  # Express server with proxy
# OR use Docker for complete deployment
```

**Environment Variables:**
- `GEMINI_API_KEY` or `API_KEY`: Required for server
- Supports both variable names for compatibility

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

### Advanced Image Studio Features (useImageStudioLogic - 648 lines)

The Image Studio is the most complex studio with extensive batch processing capabilities:

**Batch Operations:**
- Upload multiple images (50+) for batch variation generation
- JSON prompt import/export for repeatable workflows
- Batch image cropping with CropChoiceModal workflow
- Concurrent generation with progress tracking

**Prompt Engineering:**
- **Prompt Translation**: Auto-translate non-English prompts to English before generation
- **Prompt Enhancement**: AI-powered prompt improvement using Gemini
- **Prompt Variation**: Generate multiple variations of a prompt
- **Prompt List Generation**: Batch generate prompts from a template

**Advanced Options:**
- Model selection: Gemini Flash, Nano Banana, Seedream, Flux
- Aspect ratio presets: Square, Portrait, Landscape, Wide, Ultrawide
- Custom dimensions with model-specific validation
- Filename templates with variables: `{set_id}`, `{original_filename}`, `{timestamp}`, `{index}`, `{prompt}`
- **EXIF Embedding**: Embed prompt in JPEG/PNG metadata for reproducibility

**Quality of Life:**
- Auto-set aspect ratio from uploaded images
- Model-specific warnings (e.g., Seedream aspect ratio limitations)
- Progress tracking with current/total counters
- Error handling with partial success recovery

### Video Analyzer Advanced Features (useVideoAnalyzerStudio - 880 lines)

**Most Complex Hook** - Implements a multi-stage video analysis workflow:

**Stage 1: Video Upload & Processing**
- Upload video file → Gemini File API
- Polling for file processing completion
- Automatic retry with exponential backoff

**Stage 2: Strategic Analysis (10-Point Framework)**
- Product identification with search
- **Zero-trust IP verification** (multi-vector search to detect fake brands)
- Campaign objective analysis
- Audience targeting breakdown
- Creative execution analysis
- Distribution channel identification
- JSON response parsing with AI-powered error recovery

**Stage 3: Storyboard Generation**
- Key frame identification with timestamps
- Automated frame extraction from video at specific times
- Scene description with visual elements
- Action/motion analysis

**Stage 4: Concept Generation**
- Static ad concept creation from storyboard
- Multiple concept approaches
- Scene-by-scene variation generation with subject composition
- **ZERO-TOLERANCE RULE**: No end cards, logo slates, or transitions (enforced in prompts)

**Error Handling:**
- JSON parsing errors repaired using AI
- Malformed JSON detection and recovery
- Retry logic for file processing
- User-friendly error messages with actionable guidance

### Feature Flags

**GlobalSettingsModal** provides centralized control:
- **Beta Features**: Toggle Ad Cloner and Video Analyzer visibility
- **Mock Data Mode**: Use mock responses for development without API quota
- **Model Selection**: Per-studio model preferences
- **Webhook Settings**: Toggle nanoBananaWebhook per studio (Hair, Baby, Image, AdCloner, VideoAnalyzer)

**localStorage Keys:**
- `showBetaFeatures`: Boolean toggle for beta studio visibility
- `nanoBananaWebhookSettings`: Object with per-studio webhook enable/disable
- Persists across sessions for consistent UX

## Project Structure

**For detailed directory-specific documentation, see CLAUDE.md files in each directory.**

```
/                           # Root directory
├── App.tsx                 # Main application hub (100+ lines)
├── types.ts                # Comprehensive TypeScript interfaces (450+ lines)
├── constants.ts            # Hairstyles, colors, baby options, presets (100+ lines)
├── index.tsx               # Application entry point
├── index.html              # HTML shell with CDN imports
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
├── Dockerfile              # Multi-stage Docker build for Cloud Run
├── metadata.json           # AI Studio app metadata
└── CLAUDE.md               # This file - main project guidance

components/                 # React components (59 files, ~15,000 lines)
├── (Shared - Root Level)   # See components/CLAUDE.md for details
│   ├── ImageCropper.tsx                # Global modal cropper
│   ├── EmbeddedImageCropper.tsx        # NEW: Inline cropper with ref API
│   ├── MultiCropView.tsx               # Batch cropping interface
│   ├── CropChoiceModal.tsx             # Crop workflow dialog
│   ├── Lightbox.tsx                    # Full-screen image viewer
│   ├── ToastContainer.tsx              # Toast notification system
│   ├── ConfirmationDialog.tsx          # Reusable confirmation modal
│   ├── HelpModal.tsx                   # Context-aware help system
│   ├── DownloadProgressModal.tsx       # Progress indicator
│   ├── GlobalSettingsModal.tsx         # NEW: Global app settings
│   ├── ImageGrid.tsx                   # Reusable grid layout
│   ├── ImageUploader.tsx               # Single image upload
│   ├── MultiImageUploader.tsx          # Multiple image upload
│   ├── UploaderZone.tsx                # Drag-drop zone
│   ├── SinglePromptEditor.tsx          # Prompt editing UI
│   ├── LoadingSpinner.tsx              # Loading indicator
│   ├── Icons.tsx                       # Custom icon components
│   └── ImageStudio.tsx                 # Image Studio main (note: not in subfolder)
│
├── hairStudio/             # Hair Studio (2 files)
│   ├── HairStudio.tsx
│   └── HairOptionsPanel.tsx
│
├── babyStudio/             # Baby Studio (2 files)
│   ├── BabyStudio.tsx
│   └── BabyOptionsPanel.tsx
│
├── videoStudio/            # Video Studio (1 file)
│   └── VideoStudio.tsx
│
├── timelineStudio/         # Timeline Studio (4 files)
│   ├── TimelineStudio.tsx
│   ├── TimelinePairCard.tsx
│   ├── TimelinePairLightbox.tsx
│   └── StitchTester.tsx
│
├── imageStudio/            # Image Studio (9 files)
│   ├── ImageStudioConfirmationDialog.tsx
│   ├── GeneratedImageDisplay.tsx
│   ├── ImageUploader.tsx
│   ├── PromptEditor.tsx
│   ├── GenerateButton.tsx
│   ├── ProgressBar.tsx
│   ├── AdvancedOptions.tsx
│   ├── CropChoiceModal.tsx
│   └── MultiCropView.tsx
│
├── adCloner/               # BETA: Ad Cloner (5 files) - See adCloner/CLAUDE.md
│   ├── AdClonerStudio.tsx
│   ├── AdClonerUploader.tsx
│   ├── AdClonerResults.tsx
│   ├── VariationCard.tsx
│   └── SettingsModal.tsx
│
├── videoAnalyzer/          # BETA: Video Analyzer (12 files) - See videoAnalyzer/CLAUDE.md
│   ├── VideoAnalyzerStudio.tsx
│   ├── VideoFileUpload.tsx
│   ├── AdAnalysisCard.tsx
│   ├── StoryboardCard.tsx
│   ├── AdIdeaCard.tsx
│   ├── ConceptApproachCard.tsx
│   ├── ConceptGenerationControls.tsx
│   ├── SceneGenerationControls.tsx
│   ├── AnalysisSettings.tsx
│   ├── AnalysisErrorCard.tsx
│   ├── MarkdownRenderer.tsx
│   ├── Loader.tsx
│   └── mockData.ts
│
└── help/                   # Help documentation (9 files)
    ├── GeneralHelp.tsx
    ├── HairStudioHelp.tsx
    ├── BabyStudioHelp.tsx
    ├── VideoStudioHelp.tsx
    ├── TimelineStudioHelp.tsx
    ├── ImageStudioHelp.tsx
    ├── AdClonerHelp.tsx
    ├── HelpSection.tsx
    └── CollapsibleSection.tsx

hooks/                      # Custom hooks (7 files, ~3,800 lines) - See hooks/CLAUDE.md
├── useHairStudio.ts                 # 456 lines
├── useBabyStudio.ts                 # ~400 lines
├── useImageStudioLogic.ts           # 648 lines (most complex)
├── useVideoStudio.ts                # 443 lines
├── useTimelineStudio.ts             # 741 lines
├── useAdCloner.ts                   # ~650 lines (beta)
└── useVideoAnalyzerStudio.ts        # 880 lines (largest, beta)

services/                   # Service modules (15 files, ~1,760 lines) - See services/CLAUDE.md
├── geminiClient.ts                  # 13 lines - Client initialization
├── geminiService.ts                 # 166 lines - CRITICAL multi-model orchestration
├── endpoints.ts                     # 158 lines - Centralized endpoint config
├── hairStudioService.ts             # 280 lines
├── babyStudioService.ts             # 241 lines
├── videoService.ts                  # 257 lines
├── timelineStudioService.ts         # 102 lines
├── adClonerService.ts               # 180 lines (beta)
├── videoAnalyzerService.ts          # 305 lines (beta) - Now uses inline base64 data
├── videoStitcher.ts                 # 65 lines
├── imageUtils.ts                    # 148 lines - EXIF embedding
├── imageUploadService.ts            # 37 lines
├── videoUploadService.ts            # 60 lines - NEW: Video upload to GCS
├── apiUtils.ts                      # 61 lines - Concurrency control
└── loggingService.ts                # 46 lines - Cloud Monitoring

prompts/                    # System prompts for AI (2 files) - See prompts/CLAUDE.md
├── adClonerSystemPrompt.ts
└── videoAnalyzerPrompts.ts          # 100+ lines - CRITICAL, heavily engineered

server/                     # Express.js API proxy (3 files) - See server/CLAUDE.md
├── server.js                        # 376 lines - Production server
├── package.json                     # Dependencies
└── public/
    ├── service-worker.js            # 80+ lines - HTTP intercept
    └── websocket-interceptor.js     # 66 lines - WebSocket intercept

.docs/                      # Comprehensive documentation (12 files, ~220KB)
├── CLAUDE.md                        # Duplicate of root (legacy)
├── DEPLOYMENT.md                    # Multi-platform deployment guide
├── SETUP_INSTRUCTIONS.md            # Initial setup
├── QUICK_DEPLOY_REFERENCE.md        # Quick reference
├── GITHUB_ACTIONS_SETUP.md          # CI/CD setup
├── IAP_SETUP.md                     # Identity-Aware Proxy for domain restriction
├── API_INTEGRATION_GUIDE.md         # Gemini API integration (Turkish)
├── DATA_PROCESSING_GUIDE.md         # Data processing workflows
├── IMPLEMENTATION_CHECKLIST.md      # Feature implementation checklist
├── VIDEO_ANALYZER_INTEGRATION_GUIDE.md  # Video Analyzer integration
├── UI_COMPONENTS_GUIDE.md           # Component architecture guide
└── SYSTEM_PROMPTS_REFERENCE.md      # Prompt engineering reference

.github/                    # GitHub Actions CI/CD
└── workflows/
    └── deploy.yml                   # Cloud Run deployment workflow (132 lines)
```

**Project Statistics:**
- **Total Lines**: ~20,500+ lines of TypeScript/TSX
- **Components**: 59 files
- **Hooks**: 7 files
- **Services**: 15 files
- **Studios**: 7 (5 production, 2 beta)

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

### Must-Read for New Contributors

**Core Application Architecture:**
- `App.tsx`: Main hub with state routing, modal management, nanoBananaWebhookSettings
- `types.ts`: All TypeScript interfaces (450+ lines) - **READ FIRST**
- `constants.ts`: Hairstyles, colors, baby options, aspect ratio presets

**Critical Services (Read in Order):**
1. `services/endpoints.ts`: Centralized endpoint config, model metadata
2. `services/geminiService.ts`: **CRITICAL** - Multi-model orchestration, webhook routing
3. `services/apiUtils.ts`: Concurrency control, rate limiting
4. `services/geminiClient.ts`: Simple client initialization

**Studio Services (Read as Needed):**
- `services/hairStudioService.ts`: Hair prompt engineering
- `services/babyStudioService.ts`: Two-parent fusion logic
- `services/videoService.ts`: Seedance video generation with polling
- `services/adClonerService.ts`: **BETA** - Ad variation generation
- `services/videoAnalyzerService.ts`: **BETA** - 10-point analysis, JSON repair

**Utility Services:**
- `services/imageUtils.ts`: EXIF embedding, filename templates, conversion utilities
- `services/loggingService.ts`: Cloud Monitoring integration

**Server-Side Proxy (Production Deployment):**
- `server/server.js`: Express proxy with rate limiting
- `server/public/service-worker.js`: HTTP request interception
- `server/public/websocket-interceptor.js`: WebSocket interception

**Prompt Engineering:**
- `prompts/videoAnalyzerPrompts.ts`: **CRITICAL** - Heavily engineered multi-stage prompts
- `prompts/adClonerSystemPrompt.ts`: Ad variation prompts

**Shared Components (Most Used):**
- `components/ImageCropper.tsx`: Global modal cropper
- `components/EmbeddedImageCropper.tsx`: Inline cropper with ref API
- `components/GlobalSettingsModal.tsx`: Beta features, webhook toggles
- `components/Lightbox.tsx`: Image viewer
- `components/HelpModal.tsx`: Context-aware help

**Studio Entry Points:**
- `components/hairStudio/HairStudio.tsx` + `hooks/useHairStudio.ts`
- `components/babyStudio/BabyStudio.tsx` + `hooks/useBabyStudio.ts`
- `components/ImageStudio.tsx` + `hooks/useImageStudioLogic.ts` (648 lines, most complex)
- `components/videoStudio/VideoStudio.tsx` + `hooks/useVideoStudio.ts`
- `components/timelineStudio/TimelineStudio.tsx` + `hooks/useTimelineStudio.ts`
- `components/adCloner/AdClonerStudio.tsx` + `hooks/useAdCloner.ts` (beta)
- `components/videoAnalyzer/VideoAnalyzerStudio.tsx` + `hooks/useVideoAnalyzerStudio.ts` (880 lines, largest)

## Notes on Video Analyzer Integration

The `.docs/` directory contains extensive documentation for the Video Analyzer feature and other project documentation. This includes implementation guides, API integration details, and deployment instructions. The Video Analyzer components are located in `components/videoAnalyzer/` with mock data available for development.

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

### Local Development

**Frontend Development:**
```bash
npm install          # Install dependencies
npm run dev          # Vite dev server on http://localhost:5173
                     # API key from .env.local injected via vite.config.ts
```

**Production Preview:**
```bash
npm run build        # Build to dist/
npm run preview      # Preview production build locally
```

**Server Development (with proxy):**
```bash
npm run build        # Build frontend first
cd server && npm install
npm start            # Express server on port 3000 with API proxy
```

### Production Deployment

**GitHub Actions CI/CD (.github/workflows/deploy.yml):**
- **Trigger**: Push to main with `#deploy` in commit message OR manual trigger
- **Process**:
  1. Build frontend (`npm run build`)
  2. Build Docker image (multi-stage Dockerfile)
  3. Push to Google Artifact Registry
  4. Deploy to Cloud Run service `ai-studio-v2`
- **Deployment**:
  - Region: `us-central1`
  - Authentication: **Required** (IAP protected)
  - Memory: 512Mi, CPU: 1, Max Instances: 10

**Required GitHub Secrets:**
- `GCP_PROJECT_ID`: Google Cloud project ID
- `GCP_SA_KEY`: Service account JSON key (base64 encoded)
- `GEMINI_API_KEY`: Gemini API key for server

**Docker Deployment:**
```bash
docker build -t ai-studio .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key ai-studio
```

**Identity-Aware Proxy (IAP) Setup:**
- Domain restriction: @lyrebirdstudio.net (configurable)
- OAuth consent screen configured
- Cloud Run requires authentication (`--no-allow-unauthenticated`)
- See `.docs/IAP_SETUP.md` for full setup guide

**Current Deployments:**
- **AI Studio**: https://ai.studio/apps/drive/1BGVS5m7mwSnLk_sRxStq_hVf2bUcGuor
- **Cloud Run**: https://ai-studio-v2-[hash]-uc.a.run.app (IAP protected)

### Deployment Documentation

Comprehensive guides available in `.docs/`:
- `DEPLOYMENT.md`: Multi-platform deployment (Cloud Run, GCS, Vercel, Netlify)
- `GITHUB_ACTIONS_SETUP.md`: CI/CD configuration
- `IAP_SETUP.md`: Identity-Aware Proxy for domain restriction
- `QUICK_DEPLOY_REFERENCE.md`: Quick reference commands

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

### API Key Security

**Development (Local):**
- API key stored in `.env.local`, never committed (in .gitignore)
- Vite `define` injects key into client bundle for local development
- **Security tradeoff**: Key visible in bundle, acceptable for local dev only

**Production (Cloud Run with Proxy):**
- **API key NEVER sent to client** - stored server-side only
- Service worker intercepts all Gemini API requests → `/api-proxy`
- Express server injects API key server-side before forwarding to Gemini
- **Client bundle does NOT contain API key**
- Rate limiting: 100 requests per 15 minutes per IP
- See "Server-Side Proxy Architecture" section for full details

### Authentication & Authorization

**Identity-Aware Proxy (IAP):**
- Cloud Run deployment requires authentication
- Domain restriction: @lyrebirdstudio.net (configurable)
- OAuth consent screen configured for organization
- Prevents public access to production deployment

### Content Safety

- Google Gemini safety filters applied to all generations
- User-facing error messages for safety filter violations
- Prompt engineering to avoid unsafe content generation
- EXIF prompt embedding for content traceability

### Data Privacy

- **No user data persistence**: All generation happens in-memory
- User ID tracking via sessionStorage (session-scoped only)
- Structured logs sent to Cloud Monitoring (no PII)
- Images stored temporarily for download, then cleared
- No database, no persistent storage of user images

### External Integrations

- **n8n webhooks**: Used for Nano Banana, Seedream, Flux, Seedance
- Webhooks use HTTPS with bearer token authentication
- Image upload to Google Cloud Storage uses signed URLs
- All external requests use HTTPS
