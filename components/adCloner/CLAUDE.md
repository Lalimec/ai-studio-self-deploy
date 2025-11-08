# Ad Cloner Studio (BETA)

**Status**: Beta feature - toggleable via GlobalSettingsModal

## Overview

Ad Cloner is a sophisticated beta studio that analyzes advertisements and generates variations while maintaining brand style and aesthetic. It uses AI-powered context research and multi-image composition to create new ad concepts.

## Purpose

**Generate ad variations with:**
- Preserved brand identity and style
- Different subjects/models
- Maintained composition and aesthetic
- Refinement capabilities

## Components (5 files)

### AdClonerStudio.tsx
**Main component** - Studio container and workflow orchestration

**Features:**
- Ad image upload
- Subject image upload (multiple)
- Settings modal trigger
- Results display
- Error handling

**Related Hook**: `hooks/useAdCloner.ts` (~650 lines)

---

### AdClonerUploader.tsx
**Upload interface** for ad and subject images

**Features:**
- Dual upload zones (ad + subjects)
- Drag-and-drop support
- Image preview
- Clear/remove functionality
- Subject image management (add/remove)

**Usage:**
```tsx
<AdClonerUploader
  adImage={adImage}
  subjectImages={subjectImages}
  onAdUpload={handleAdUpload}
  onSubjectUpload={handleSubjectUpload}
  onRemoveSubject={handleRemoveSubject}
/>
```

---

### AdClonerResults.tsx
**Display generated ad variations**

**Features:**
- Variation grid display
- Individual variation cards
- Refine/regenerate actions
- Download functionality

**Integrates with**: `VariationCard.tsx`

---

### VariationCard.tsx
**Individual variation display and actions**

**Features:**
- Image display
- Variation prompt
- **Refine button**: Add more subjects, modify variation
- **Regenerate button**: Retry failed generation
- **Download button**: Save variation
- Loading states (generating, refining)
- Error states with retry

**States:**
- `idle`: Ready
- `generating`: Creating variation
- `refining`: Applying refinements
- `error`: Failed generation

**Usage:**
```tsx
<VariationCard
  variation={variation}
  variationState={variationStates[variation.id]}
  onRefine={() => refineVariation(variation.id)}
  onRegenerate={() => regenerateVariation(variation.id)}
  onDownload={() => downloadImage(variation.imageUrl)}
/>
```

---

### SettingsModal.tsx
**Ad Cloner-specific model selection**

**Features:**
- **Text Model Selection**: Flash vs Pro (for context research)
- **Image Model Selection**: Gemini Flash vs Nano Banana (for generation)
- Saved to localStorage
- Per-studio settings (separate from global settings)

**Settings:**
```typescript
{
  textModel: 'flash' | 'pro',
  imageModel: 'geminiFlash' | 'nanoBanana'
}
```

## Hook: useAdCloner.ts (~650 lines)

### State Management

**Primary State:**
- `adImage`: Main ad image (AdImageState)
- `subjectImages`: Array of subject images
- `generationResult`: Complete ad analysis + variations
- `variationStates`: Map of variation ID → state (generating/refining/error)
- `settings`: Text/image model selection

**State Types:**
```typescript
interface AdImageState {
  file: File;
  dataUrl: string;
  croppedUrl?: string;
}

interface VariationState {
  status: 'idle' | 'generating' | 'refining' | 'error';
  errorMessage?: string;
}
```

### Workflow

#### 1. Upload Phase
```
User uploads ad image
  ↓
User uploads subject images (optional)
  ↓
Click "Analyze & Generate"
```

#### 2. Research Phase
```
adClonerService.researchAdContext(adImage)
  ↓
AI analyzes ad for:
  - Product/service
  - Brand style
  - Color palette
  - Target audience
  - Key visual elements
  ↓
Uses Google Search for context
  ↓
Returns structured analysis
```

#### 3. Generation Phase
```
adClonerService.generateAdPrompts(context, subjects, count=3)
  ↓
For each variation:
  - Generate prompt maintaining style
  - Incorporate subject images
  - Call geminiService.generateFigureImage()
  - Update variationStates
  ↓
Return variations with images
```

#### 4. Refinement Phase (Optional)
```
User clicks "Refine" on variation
  ↓
Modal: Add refinement instructions + new subjects
  ↓
adClonerService.refineAdImage(
  originalPrompt,
  refinementInstructions,
  newSubjects
)
  ↓
Generates refined variation
  ↓
Updates variation in-place
```

#### 5. Additional Variations
```
User clicks "Generate More"
  ↓
adClonerService.getNewAdVariations(
  context,
  existingVariations,
  additionalSubjects,
  count
)
  ↓
Avoids duplicating existing concepts
  ↓
Adds new variations to results
```

### Key Functions

**`uploadAd(file)`**
- Handles ad image upload
- Triggers crop if needed
- Sets adImage state

**`uploadSubjects(files)`**
- Handles multiple subject uploads
- Validates image formats
- Adds to subjectImages array

**`analyzeAndGenerate()`**
- Main generation trigger
- Calls research → generate flow
- Updates variationStates
- Error handling

**`refineVariation(variationId, instructions, newSubjects)`**
- Refines specific variation
- Maintains original concept
- Incorporates new instructions/subjects
- Updates variation state

**`regenerateVariation(variationId)`**
- Retries failed generation
- Uses same prompt
- Resets error state

**`getMoreVariations(count)`**
- Generates additional variations
- Avoids duplication
- Adds to existing results

## Service: adClonerService.ts (180 lines)

### Core Functions

**`researchAdContext(adImageBase64)`**
- AI-powered ad analysis
- Google Search integration
- Returns structured context object

**`generateAdPrompts(adContext, subjectImages, count)`**
- Generates variation prompts
- Maintains brand consistency
- Incorporates subjects
- Returns array of prompts

**`generateAdVariationImage(prompt, aspectRatio)`**
- Generates single variation
- Uses selected image model
- Returns base64 image

**`refineAdImage(originalPrompt, refinementInstructions, subjectImages)`**
- Refines existing variation
- Maintains core concept
- Applies user instructions
- Returns refined image

**`getNewAdVariations(adContext, existingVariations, additionalSubjects, count)`**
- Generates new concepts
- Avoids duplication (checks existing)
- Returns new variations

**`enhanceAdInstructions(instructions)`**
- Improves user refinement instructions
- Returns enhanced instructions

## Prompts: adClonerSystemPrompt.ts

### Key Prompts

**Ad Research Prompt:**
- Product identification
- Brand style analysis
- Color palette extraction
- Target audience inference
- Visual element cataloging

**Variation Generation Prompt:**
- Maintain brand identity
- Preserve visual style
- Incorporate subjects naturally
- Match composition quality

**Refinement Prompt:**
- Apply user instructions
- Maintain original concept
- Integrate new subjects
- Preserve brand consistency

## Feature Toggles

### Enabling Ad Cloner

**GlobalSettingsModal:**
```typescript
localStorage.setItem('showBetaFeatures', 'true');
```

**Access:**
- Opens Ad Cloner in studio selector
- Beta badge displayed
- All features available

### Model Selection

**Ad Cloner Settings Modal:**
- Text Model: Flash (fast) vs Pro (quality)
- Image Model: Gemini Flash (fast) vs Nano Banana (quality)

**Stored in:**
```typescript
const settings = {
  textModel: 'flash' | 'pro',
  imageModel: 'geminiFlash' | 'nanoBanana',
};
// Saved to localStorage
```

## Common Use Cases

### Basic Ad Variation
1. Upload ad image
2. Upload 2-3 subject images
3. Click "Analyze & Generate"
4. Review 3 variations
5. Download favorites

### Refined Variation
1. Generate initial variations
2. Select variation to refine
3. Add refinement instructions
4. Upload additional subjects (optional)
5. Generate refined version

### Additional Concepts
1. Review initial variations
2. Click "Generate More Variations"
3. Specify count (e.g., 3 more)
4. Review additional concepts

## Best Practices

### Image Selection
- **Ad Image**: Clear, high-quality ad (1:1 or 4:5 aspect ratio)
- **Subject Images**: Similar pose/angle as ad subjects
- **Quantity**: 2-5 subject images recommended

### Refinement Instructions
- Be specific (e.g., "Make background darker")
- Reference elements (e.g., "Position subject on left")
- One change at a time (multiple refinements better than one complex)

### Model Selection
- **Flash**: Fast iterations, good quality
- **Pro**: Best quality, slower (for final versions)
- **Nano Banana**: Highest image quality, use for final output

## Troubleshooting

### Variation Doesn't Match Style
- **Cause**: Insufficient context in ad analysis
- **Solution**: Use Pro text model for better research

### Subject Not Integrated Well
- **Cause**: Subject image pose/angle mismatch
- **Solution**: Upload subjects with similar framing as ad

### Generation Failed
- **Cause**: Safety filter or quota
- **Solution**: Click "Regenerate" or adjust prompt

### Refinement Not Applied
- **Cause**: Vague instructions
- **Solution**: Be more specific in refinement

## Limitations (Beta)

- **No batch refinement**: Refine one variation at a time
- **No variation history**: Can't undo refinements
- **No prompt editing**: Can't manually edit generated prompts
- **Fixed aspect ratios**: Uses ad image aspect ratio

## Future Enhancements

- Batch refinement
- Variation history with undo
- Manual prompt editing
- Custom aspect ratio per variation
- A/B testing suggestions
- Export to design tools

## Related Documentation

- **hooks/useAdCloner.ts**: Hook implementation
- **services/adClonerService.ts**: Service layer
- **prompts/adClonerSystemPrompt.ts**: Prompt engineering
- **components/CLAUDE.md**: General component patterns
