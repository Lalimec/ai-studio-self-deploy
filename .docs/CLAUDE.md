# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Video Ad Analyzer** application built with React, TypeScript, and Vite. It uses Google's Gemini API (including Imagen and Gemini 2.5 models) to analyze video advertisements, generate storyboards, and create static ad concepts from video content. The app is designed to run in Google AI Studio with custom API key handling.

## Development Commands

### Setup and Development
```bash
# Install dependencies
npm install

# Set environment variable (required)
# Create .env.local file with:
# GEMINI_API_KEY=your_api_key_here

# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables
- `GEMINI_API_KEY`: Required for all API operations. Set in `.env.local` file (not tracked in git)
- The Vite config exposes this as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` in the app

## Architecture Overview

### Core Application Flow

The app follows a two-phase workflow controlled by tabs:

1. **Analyze & Storyboard Phase** (`activeTab: 'analyze'`)
   - User uploads video ad
   - Video is uploaded to Gemini File API
   - Gemini analyzes video using structured prompt (10-point analysis framework)
   - Returns: comprehensive analysis, concept approaches, overall style prompt, and detailed storyboard with per-frame prompts
   - Frames are automatically extracted from the video at key timestamps

2. **Generate Concepts Phase** (`activeTab: 'generate'`)
   - User can generate static ad concepts based on the video analysis
   - Optional: upload subject images for image editing (Nano Banana model)
   - Concepts are generated as faithfully adapted "creative core frames" from the storyboard
   - Images can be generated from concepts using Imagen or Gemini image models

### Key State Management Patterns

- **AppState**: `'idle' | 'analyzing' | 'analyzed' | 'generating'` - tracks the overall workflow state
- **Video Analysis**: Stored in `videoAnalysis` state after successful analysis. Contains:
  - `analysis`: 10-point strategic breakdown
  - `concept_approaches`: recommended static ad approaches
  - `storyboard`: array of key frames with timestamps and generation prompts
  - `overall_video_style_prompt`: holistic video style description
- **Processed Video**: `processedVideo` stores the File API URI/mimeType for retry scenarios
- **Frame Extraction**: `extractedFrames` array holds base64 data URLs of frames extracted at storyboard timestamps

### API Integration (`services/geminiService.ts`)

#### Core Functions
- `analyzeVideo()`: Uploads video to File API, waits for ACTIVE state, then calls analysis
- `generateAnalysis()`: Uses already-uploaded video to generate structured JSON analysis
- `generateAdConcept()`: Converts video analysis into static ad concept(s) using storyboard data
- `generateImage()`: Handles both Imagen (text-to-image) and Gemini 2.5 Flash Image (image editing) generation

#### Important Implementation Details
- **File Upload Pattern**: Videos must be uploaded via File API and polled until state is `ACTIVE`
- **JSON Parsing**: Custom `parseAnalysisResponse()` extracts JSON from markdown code blocks and validates required keys
- **Error Handling**: `JsonParseError` class preserves raw response for debugging/retry
- **Model Selection**:
  - Analysis: `gemini-2.5-pro` (default) or `gemini-2.5-flash`
  - Image Generation: `imagen-4.0-ultra-generate-001`, `imagen-4.0-generate-001`, `imagen-4.0-fast-generate-001`, or `gemini-2.5-flash-image-preview` (Nano Banana - requires base images)

### Component Architecture

#### Primary Components
- `App.tsx`: Main application container with tab-based routing and state orchestration
- `FileUpload.tsx`: Video/image upload with preview and drag-drop
- `StoryboardCard.tsx`: Displays storyboard with frame gallery, allows per-scene image generation
- `AdIdeaCard.tsx`: Displays generated ad concepts with image generation controls
- `SettingsModal.tsx`: Model selection and configuration

#### Scene Variation Generation
- `SceneGenerationControls.tsx`: Controls for generating variations of storyboard scenes
- **Key Feature**: Users can upload a subject image and generate variations where the subject is composited into each storyboard frame
- Uses `sceneGenerationDefaultPrompt` to guide Gemini on seamlessly integrating subjects
- Can generate single scene or all scenes at once

### API Key Handling (AI Studio Integration)

The app uses a custom `window.aistudio` API for key selection:
- `window.aistudio.hasSelectedApiKey()`: Check if key is configured
- `window.aistudio.openSelectKey()`: Open key selection dialog
- In development (when `window.aistudio` is undefined), the app assumes a key is available

### Critical Implementation Rules

#### Video Analysis
- The system instruction in `geminiService.ts` (`systemInstructionForAnalysis`) is extremely detailed and must be preserved
- It enforces:
  - 10-point strategic analysis framework
  - Zero-trust IP verification (searches for context)
  - Key frame storyboard (not every frame)
  - Two prompts per frame: `still_prompt` and `video_prompt`
- **Do not simplify or remove sections of this prompt** - it's carefully tuned

#### Concept Generation
- The `generateAdConcept` system instruction has a **ZERO-TOLERANCE RULE**: concepts must NOT be based on end cards, tutorial screens, or logo slates
- Must be "faithful adaptations" of creative core frames
- Exactly ONE concept is generated per call (array of 1)

#### Frame Extraction Logic
- Frames are extracted at timestamps slightly after the storyboard timestamp (1/3 into the scene duration) to avoid transition artifacts
- Uses canvas API to capture frames from video element
- Runs automatically when `videoAnalysis` changes

## Type Definitions (`types.ts`)

Key types:
- `VideoAnalysis`: Top-level analysis result
- `StoryboardScene`: Individual storyboard frame with prompts
- `AdIdea`: Generated static ad concept
- `ImageModel` and `AnalysisModel`: Model selection types

## Common Development Patterns

### Adding New Analysis Fields
1. Update `VideoAnalysis` interface in `types.ts`
2. Update `systemInstructionForAnalysis` prompt to include new field
3. Update `parseAnalysisResponse()` validation in `geminiService.ts`
4. Add UI display in appropriate component

### Adding New Image Models
1. Add model ID to `ImageModel` type in `types.ts`
2. Add entry to `imageModels` array with `requiresImage` flag
3. Handle model-specific generation logic in `generateImage()` function

### Testing with Mock Data
- Set `isMockDataEnabled` to `true` in SettingsModal
- Uses data from `mockData.ts` instead of API calls
- Useful for UI development without consuming API quota

## Important Notes

- **No test suite exists**: Manual testing required
- **No linting configured**: Follow existing code style
- **Tailwind CSS**: Styling uses inline Tailwind classes (no separate CSS files)
- **Path alias**: `@/` resolves to project root (configured in `vite.config.ts` and `tsconfig.json`)
- **React 19 and React DOM 19**: Uses latest React features
- **API key errors**: Handle via `handleApiKeyError()` function which resets `hasSelectedApiKey` state
