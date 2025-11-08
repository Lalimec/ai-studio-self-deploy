# Baby Studio Components

**Production Studio** - AI-generated baby imagery from two parent photos

## Overview

Baby Studio uses advanced AI to blend features from two parent images and generate realistic baby photos with customizable age, gender, style, and settings.

## Components (2 files)

### BabyStudio.tsx
**Main component** - Dual-parent upload and baby generation

**Features:**
- Two separate image upload zones (Parent 1 & Parent 2)
- Independent cropping for each parent
- Baby generation options panel
- Generated baby image gallery
- Download individual or all babies

**Related Hook**: `hooks/useBabyStudio.ts` (~400 lines)

**Props from App.tsx:**
- `showToast`: Toast notification callback
- `openImageCropper`: Crop modal trigger
- `openLightbox`: Image viewer trigger
- `importToVideoStudio`: Cross-studio import

**Unique Feature**: Dual-parent image management with separate crop flows

---

### BabyOptionsPanel.tsx
**Options selection panel for baby generation**

**Sections:**

1. **Age Selection**
   - Newborn (0-3 months)
   - Infant (3-8 months)
   - Baby (8-12 months)
   - Toddler (1-2 years)
   - Young child (2-3 years)

2. **Gender Selection**
   - Boy
   - Girl
   - Let AI decide

3. **Composition/Background**
   - Close-up portrait
   - Three-quarter view
   - Full body
   - Outdoor setting
   - Indoor setting
   - Studio backdrop

4. **Clothing Style**
   - Casual (onesie, t-shirt)
   - Formal (dress, suit)
   - Seasonal (winter, summer)
   - Sleepwear
   - Naked (artistic, newborn style)

5. **Action/Pose**
   - Sleeping
   - Smiling
   - Laughing
   - Playing
   - Crawling
   - Standing
   - Sitting

**Props:**
- `selectedAge`: Selected age range
- `selectedGender`: Boy/Girl/Auto
- `selectedComposition`: Background/framing
- `selectedClothing`: Clothing style
- `selectedAction`: Pose/action
- `onAgeChange`: Age selection callback
- `onGenderChange`: Gender selection callback
- (etc. for other options)

**Behavior:**
- All options required before generation
- Disabled during generation
- Reset button clears all selections

## Hook: useBabyStudio.ts (~400 lines)

**See**: `hooks/CLAUDE.md` for detailed hook documentation

**Key State:**
- `parent1`: { file, dataUrl, croppedUrl }
- `parent2`: { file, dataUrl, croppedUrl }
- `generatedBabyImages`: Array of generated baby images
- `pendingImageCount`: Generation progress
- `selectedOptions`: Age, gender, style, background, action

**Key Functions:**
- `onCropConfirmParent1(dataUrl)`: Process Parent 1 crop
- `onCropConfirmParent2(dataUrl)`: Process Parent 2 crop
- `generateBabies()`: Trigger generation (requires both parents)
- `handleDownload(image)`: Download single baby image
- `handleDownloadAll()`: Bulk download
- `clearParent1()`, `clearParent2()`: Reset parents

**Unique Logic:**
- Manages two separate image upload/crop flows
- Validation: Both parents required before generation
- Separate `activeCropper` types: 'baby' (parent 1) and 'baby_parent2'

## Service: babyStudioService.ts (241 lines)

**See**: `services/CLAUDE.md` for detailed service documentation

**Key Functions:**
- `buildBabyPrompt(parent1, parent2, options)`: Two-image fusion prompt
- `generateBabyImages(parent1, parent2, options, count, showToast)`: Batch generation

**Prompt Engineering:**
- Two-image analysis and feature blending
- Age-specific descriptions (newborn vs toddler very different)
- Gender handling (specific or let AI decide)
- Clothing and action integration
- Background/composition details

**Complexity:**
- Must reference both parent images
- Blends features (hair color, eye color, skin tone, facial structure)
- Age-appropriate rendering
- Natural baby proportions and expressions

## Constants

**Defined in**: `constants.ts`

**BABY_AGES**:
```typescript
[
  { id: 'newborn', label: 'Newborn (0-3 months)', description: '...' },
  { id: 'infant', label: 'Infant (3-8 months)', description: '...' },
  { id: 'baby', label: 'Baby (8-12 months)', description: '...' },
  { id: 'toddler', label: 'Toddler (1-2 years)', description: '...' },
  { id: 'young_child', label: 'Young Child (2-3 years)', description: '...' },
]
```

**BABY_OPTIONS**:
```typescript
{
  compositions: ['Close-up', 'Three-quarter', 'Full body', ...],
  backgrounds: ['Outdoor', 'Indoor', 'Studio', 'Nursery', ...],
  clothing: ['Casual onesie', 'Formal dress', 'Seasonal', ...],
  actions: ['Sleeping', 'Smiling', 'Laughing', 'Playing', ...],
}
```

## Workflow

### Basic Generation
1. Upload Parent 1 photo
2. Crop Parent 1 (1:1 aspect ratio)
3. Upload Parent 2 photo
4. Crop Parent 2 (1:1 aspect ratio)
5. Select baby age
6. Select gender (or auto)
7. Select composition/background
8. Select clothing
9. Select action/pose
10. Click "Generate Baby Images"
11. System generates 3-5 baby variations
12. Review and download favorites

### Advanced Usage
- Generate multiple age ranges (newborn + toddler)
- Try different genders
- Experiment with backgrounds and clothing
- Import to Video Studio for animated baby

## Common Use Cases

**Predict Future Baby:**
1. Upload couple's photos
2. Select realistic age (6-12 months)
3. Let AI decide gender
4. Use natural clothing and background
5. Generate smiling/playing poses

**Multiple Ages:**
1. Upload parent photos once
2. Generate newborn version
3. Change age to infant, regenerate
4. Change age to toddler, regenerate
5. Compare progression

**Creative Variations:**
1. Upload parent photos
2. Try multiple backgrounds (outdoor, studio, etc.)
3. Try different clothing styles
4. Generate artistic/creative poses

## Best Practices

**Parent Photo Selection:**
- Clear, front-facing photos (both parents)
- Good lighting
- Neutral expressions
- Similar photo quality for both parents
- High resolution

**Cropping:**
- Include full face
- Leave some space around head
- Crop both parents similarly (same framing)
- Avoid tight crops

**Option Selection:**
- Start with realistic age (6-12 months popular)
- Use "Let AI decide" gender for first try
- Natural backgrounds and clothing for realistic results
- Smiling/playing actions look most natural

**Generation:**
- Generate 3-5 at once (see variation)
- Don't generate too many (quota usage)
- Review results, regenerate with adjusted options

## Troubleshooting

**Baby Doesn't Look Like Parents:**
- **Cause**: Photos too different quality/angle
- **Solution**: Use more similar parent photos

**Age Looks Wrong:**
- **Cause**: AI interpretation of age range
- **Solution**: Try adjacent age range or more specific action

**Gender Not As Selected:**
- **Cause**: Strong features from one parent
- **Solution**: Regenerate, or use "Let AI decide"

**Unnatural Results:**
- **Cause**: Extreme option combinations
- **Solution**: Use more natural/realistic combinations

## Limitations

- **Two parents required**: Can't generate from single parent
- **No manual feature selection**: Can't specify exact features
- **Age interpretation**: AI interprets age ranges subjectively
- **No editing**: Can't adjust generated baby

## Future Enhancements

- Single parent mode (blend with stock features)
- Feature selection (choose specific traits)
- Age progression (baby → child → teen)
- Multiple baby generation (siblings)
- Video generation (animated baby)

## Related Documentation

- **hooks/useBabyStudio.ts**: Hook implementation
- **services/babyStudioService.ts**: Service layer
- **constants.ts**: Baby age and option definitions
- **components/CLAUDE.md**: General component patterns
