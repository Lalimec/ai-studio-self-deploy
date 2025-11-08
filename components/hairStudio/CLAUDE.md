# Hair Studio Components

**Production Studio** - Virtual hairstyle try-on with realistic customization

## Overview

Hair Studio allows users to upload their photo and try on 100+ hairstyles with various colors, accessories, and poses.

## Components (2 files)

### HairStudio.tsx
**Main component** - Studio container and workflow

**Features:**
- Image upload with crop
- Hairstyle gallery (organized by category)
- Color selection panel
- Pose/angle options
- Batch generation (multiple combinations)
- Download individual or all

**Related Hook**: `hooks/useHairStudio.ts` (456 lines)

**Props from App.tsx:**
- `showToast`: Toast notification callback
- `openImageCropper`: Crop modal trigger
- `openLightbox`: Image viewer trigger
- `openConfirmationDialog`: Confirmation modal
- `importToVideoStudio`: Cross-studio import

---

### HairOptionsPanel.tsx
**Options selection panel**

**Sections:**
1. **Hairstyle Selection**
   - Categories: Male, Female, Avant-Garde, Short/Shaved
   - 100+ hairstyle options with previews
   - Multi-select checkboxes

2. **Hair Color Selection**
   - Natural colors (blonde, brown, black, etc.)
   - Bold colors (red, blue, green, etc.)
   - Complex colors (ombre, balayage, highlights)
   - Multi-color combinations

3. **Accessories** (Female only)
   - Headbands, clips, bows, flowers
   - Conditional display based on gender

4. **Beards** (Male only)
   - Various beard styles
   - Conditional display based on gender

5. **Pose/Angle Selection**
   - Front view
   - Three-quarter view
   - Profile view
   - Multiple angles

**Props:**
- `selectedHairstyles`: Array of selected hairstyle IDs
- `selectedColors`: Array of selected color IDs
- `selectedPose`: Selected pose/angle
- `selectedAccessory`: Female accessory (optional)
- `selectedBeard`: Male beard (optional)
- `onHairstyleChange`: Callback for hairstyle selection
- `onColorChange`: Callback for color selection
- `onPoseChange`: Callback for pose selection

**Behavior:**
- Hairstyle/color selection generates combinations (hairstyle × color)
- Disabled state during generation
- Clear all button

## Hook: useHairStudio.ts (456 lines)

**See**: `hooks/CLAUDE.md` for detailed hook documentation

**Key State:**
- `croppedImage`: User's cropped photo
- `generatedImages`: Array of generated hairstyle images
- `pendingImageCount`: Number of images being generated
- `selectedHairstyles`, `selectedColors`, `selectedPose`, etc.

**Key Functions:**
- `onCropConfirm(dataUrl)`: Process cropped image
- `generateHairstyles()`: Batch generate combinations
- `handleDownload(image)`: Download single image
- `handleDownloadAll()`: Bulk download
- `prepareForVideo(image)`: Import to Video Studio
- `regenerateHairstyle(image)`: Retry specific combination

## Service: hairStudioService.ts (280 lines)

**See**: `services/CLAUDE.md` for detailed service documentation

**Key Functions:**
- `buildHairPrompt(options)`: Constructs detailed prompt with hairstyle, color, pose
- `generateHairstyles(options, imageSrc, showToast)`: Orchestrates batch generation

**Prompt Engineering:**
- Detailed hairstyle descriptions
- Complex color descriptions (multicolor gradients)
- Gender-specific features (beards, accessories)
- Pose/angle variations
- Professional photography style

## Constants

**Defined in**: `constants.ts`

**HAIRSTYLES** (~100 options):
```typescript
{
  male: {
    classic: ['Crew Cut', 'Side Part', 'Slicked Back', ...],
    modern: ['Undercut', 'Fade', 'Textured Crop', ...],
    long: ['Man Bun', 'Long Flowing', 'Shoulder Length', ...],
  },
  female: {
    short: ['Pixie Cut', 'Bob', 'Lob', ...],
    medium: ['Layered', 'Wavy', 'Curly', ...],
    long: ['Straight', 'Beach Waves', 'Mermaid', ...],
  },
  avantGarde: ['Mohawk', 'Asymmetric', 'Color Blocks', ...],
  shortShaved: ['Buzz Cut', 'Shaved Sides', ...],
}
```

**HAIR_COLORS**:
```typescript
{
  natural: ['Blonde', 'Brown', 'Black', 'Auburn', 'Gray', ...],
  bold: ['Platinum', 'Fire Red', 'Electric Blue', 'Violet', ...],
  complex: ['Ombre', 'Balayage', 'Highlights', 'Lowlights', ...],
  multicolor: ['Rainbow', 'Pastel Mix', 'Split Dye', ...],
}
```

## Workflow

### Basic Generation
1. User uploads photo
2. ImageCropper opens (aspect ratio 1:1)
3. User confirms crop
4. User selects 2-3 hairstyles
5. User selects 1-2 colors
6. User selects pose
7. Click "Generate Hairstyles"
8. System generates all combinations (hairstyle × color)
9. Results displayed in grid
10. Download individual or all

### Advanced Usage
- Select accessories (female) or beards (male)
- Generate multiple poses (front + profile)
- Regenerate specific failed images
- Import to Video Studio for video generation

## Common Use Cases

**Try Multiple Styles:**
1. Upload photo
2. Select 5-10 hairstyles from different categories
3. Select 2-3 colors
4. Generate → Review 15-30 variations
5. Download favorites

**Color Experimentation:**
1. Upload photo
2. Select 1 favorite hairstyle
3. Select 5-10 different colors
4. Generate → Compare colors
5. Download best match

**Complete Makeover:**
1. Upload photo
2. Select hairstyles from all categories
3. Select bold + natural colors
4. Add accessories/beards
5. Generate large batch
6. Download top picks

## Best Practices

**Photo Upload:**
- Front-facing photo (clear face)
- Good lighting
- Neutral expression
- Hair pulled back (shows face shape)
- High resolution (better results)

**Selection Strategy:**
- Start with 2-3 hairstyles to test
- Don't select too many at once (long generation time)
- Mix categories (short + long) for variety
- Pair natural + bold colors

**Generation:**
- Limit to 10-15 combinations at once
- Use concurrency (controlled by service layer)
- Monitor progress (pending count)
- Regenerate failed images

## Troubleshooting

**Generated Image Doesn't Match:**
- **Cause**: Pose/angle mismatch with original photo
- **Solution**: Try different pose option

**Color Not Accurate:**
- **Cause**: Complex color descriptions can vary
- **Solution**: Use simpler natural colors, or regenerate

**Face Not Preserved:**
- **Cause**: Crop too tight or too loose
- **Solution**: Recrop with more/less face area

**Generation Failed:**
- **Cause**: Safety filter or quota
- **Solution**: Click regenerate icon on failed image

## Limitations

- **No real-time preview**: Must generate to see result
- **No manual editing**: Can't adjust generated image
- **Fixed combinations**: Can't mix hairstyle parts
- **Single person**: Works best with one clear face

## Future Enhancements

- Real-time preview (fast model)
- Manual hairstyle customization
- Face shape recommendations
- Side-by-side comparison view
- Save favorites to gallery

## Related Documentation

- **hooks/useHairStudio.ts**: Hook implementation
- **services/hairStudioService.ts**: Service layer
- **constants.ts**: Hairstyle and color definitions
- **components/CLAUDE.md**: General component patterns
