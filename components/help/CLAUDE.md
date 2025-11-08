# Help Components

**Purpose**: Context-aware help documentation system for all studios

## Overview

The help system provides comprehensive in-app documentation for each studio with collapsible sections, code examples, tips, and troubleshooting guides. It's designed to be context-aware, showing relevant help based on the current studio.

## Components (9 files)

### HelpModal.tsx
**Main help modal wrapper** (Located in components/ root)

**Features:**
- Modal dialog container
- Renders appropriate help component based on `appMode`
- Close button
- Keyboard shortcut (ESC to close)
- Responsive design (full-screen on mobile)

**Props:**
- `isOpen`: Boolean
- `appMode`: Current studio ('hairStudio', 'babyStudio', etc.)
- `onClose`: Callback

**Routing Logic:**
```typescript
switch (appMode) {
  case 'hairStudio': return <HairStudioHelp />;
  case 'babyStudio': return <BabyStudioHelp />;
  case 'imageStudio': return <ImageStudioHelp />;
  case 'videoStudio': return <VideoStudioHelp />;
  case 'timelineStudio': return <TimelineStudioHelp />;
  case 'adCloner': return <AdClonerHelp />;
  case 'videoAnalyzer': return <VideoAnalyzerHelp />;
  default: return <GeneralHelp />;
}
```

---

### GeneralHelp.tsx
**General application help**

**Sections:**
1. **Getting Started**
   - Overview of AI Studio
   - Studio selection
   - Basic navigation

2. **Common Features**
   - Image upload and cropping
   - Toast notifications
   - Downloads
   - Cross-studio imports

3. **Settings**
   - Global settings modal
   - Beta features toggle
   - Model selection
   - Mock data mode

4. **Troubleshooting**
   - Common errors
   - API quota issues
   - Browser compatibility

5. **Keyboard Shortcuts**
   - ESC: Close modals
   - Arrow keys: Navigate images in lightbox

---

### HairStudioHelp.tsx
**Hair Studio documentation**

**Sections:**
1. **Overview**
   - What is Hair Studio
   - Use cases

2. **Getting Started**
   - Upload your photo
   - Crop for best results
   - Select hairstyles and colors

3. **Hairstyle Categories**
   - Male styles
   - Female styles
   - Avant-garde
   - Short/shaved

4. **Color Options**
   - Natural colors
   - Bold colors
   - Complex colors (ombre, balayage)
   - Multi-color combinations

5. **Advanced Options**
   - Accessories (female)
   - Beards (male)
   - Pose/angle selection

6. **Tips & Best Practices**
   - Photo quality
   - Selection strategy
   - Batch generation

7. **Troubleshooting**
   - Results don't match
   - Face not preserved
   - Generation failed

8. **Examples**
   - Code snippets for common operations
   - Example workflows

---

### BabyStudioHelp.tsx
**Baby Studio documentation**

**Sections:**
1. **Overview**
   - Two-parent AI baby generation
   - Feature blending

2. **Getting Started**
   - Upload parent photos
   - Crop both parents
   - Select baby options

3. **Baby Options**
   - Age ranges (newborn to young child)
   - Gender selection
   - Composition and background
   - Clothing styles
   - Actions and poses

4. **Tips & Best Practices**
   - Parent photo selection
   - Cropping strategy
   - Realistic vs creative options

5. **Troubleshooting**
   - Baby doesn't look like parents
   - Age looks wrong
   - Gender not as selected

6. **Examples**
   - Predict future baby
   - Multiple ages
   - Creative variations

---

### ImageStudioHelp.tsx
**Image Studio documentation** (Most comprehensive)

**Sections:**
1. **Overview**
   - Advanced batch processing
   - Multi-model support

2. **Getting Started**
   - Upload images (single or batch)
   - Enter prompts
   - Select model and settings

3. **Advanced Features**
   - JSON import/export
   - Prompt translation
   - Prompt enhancement
   - Prompt variations
   - Batch cropping

4. **Model Selection**
   - Gemini Flash (fast, free)
   - Nano Banana (high quality)
   - Seedream (photorealistic)
   - Flux (artistic)

5. **Aspect Ratio & Dimensions**
   - Presets (square, portrait, landscape)
   - Custom dimensions
   - Model-specific limitations

6. **Filename Templates**
   - Template variables
   - Examples
   - Best practices

7. **EXIF Embedding**
   - What is EXIF
   - Why embed prompts
   - How to enable

8. **JSON Workflow**
   - Export prompts
   - Edit externally
   - Import back
   - Use cases

9. **Tips & Best Practices**
   - Image selection
   - Prompt writing
   - Batch strategies

10. **Troubleshooting**
    - JSON import failed
    - EXIF not embedded
    - Generation slow

---

### VideoStudioHelp.tsx
**Video Studio documentation**

**Sections:**
1. **Overview**
   - Image-to-video generation
   - Seedance integration

2. **Getting Started**
   - Upload images
   - Edit prompts
   - Generate videos

3. **Prompt Writing**
   - Motion types
   - Camera movements
   - Cinematic terms
   - Examples

4. **Progress Tracking**
   - Polling states
   - Progress indicators
   - Error handling

5. **Tips & Best Practices**
   - Image quality
   - Prompt specificity
   - Batch generation

6. **Troubleshooting**
   - Generation stuck
   - Poor quality
   - Motion not as expected

---

### TimelineStudioHelp.tsx
**Timeline Studio documentation**

**Sections:**
1. **Overview**
   - Timeline creation workflow
   - Video stitching

2. **Getting Started**
   - Upload images
   - Create pairs
   - Generate transitions

3. **Timeline Pairs**
   - Creating pairs
   - Reordering
   - Editing prompts

4. **Transition Prompts**
   - Common transition types
   - Narrative transitions
   - Examples

5. **Stitching Process**
   - How stitching works
   - Progress tracking
   - Final video format

6. **Tips & Best Practices**
   - Image selection
   - Pair creation strategy
   - Prompt writing

7. **Troubleshooting**
   - Stitching failed
   - Video doesn't flow
   - Download issues

---

### AdClonerHelp.tsx
**Ad Cloner documentation** (Beta)

**Sections:**
1. **Overview**
   - Ad variation generation
   - Beta feature notice

2. **Getting Started**
   - Upload ad image
   - Upload subject images
   - Generate variations

3. **Workflow**
   - Context research
   - Variation generation
   - Refinement process

4. **Settings**
   - Text model selection
   - Image model selection
   - Quality vs speed tradeoff

5. **Advanced Features**
   - Variation refinement
   - Additional subjects
   - Regeneration

6. **Tips & Best Practices**
   - Ad selection
   - Subject images
   - Refinement strategy

7. **Troubleshooting**
   - Variation doesn't match style
   - Subject not integrated
   - Generation failed

---

### HelpSection.tsx
**Reusable section component**

**Features:**
- Section heading
- Content wrapper
- Consistent styling
- Spacing and typography

**Props:**
- `title`: Section heading
- `children`: Section content (JSX)

**Usage:**
```tsx
<HelpSection title="Getting Started">
  <p>Content here...</p>
  <ul>
    <li>Step 1</li>
    <li>Step 2</li>
  </ul>
</HelpSection>
```

---

### CollapsibleSection.tsx
**Collapsible section component**

**Features:**
- Expandable/collapsible content
- Click to expand
- Smooth animation
- Arrow icon (up/down)
- Remembers state (optional)

**Props:**
- `title`: Section heading
- `children`: Content to show/hide
- `defaultOpen`: Boolean (default collapsed)
- `onToggle`: Optional callback

**Usage:**
```tsx
<CollapsibleSection title="Advanced Topics" defaultOpen={false}>
  <p>Advanced content that's hidden by default...</p>
</CollapsibleSection>
```

**Behavior:**
- Click title → Toggle expand/collapse
- Arrow icon indicates state
- Smooth height transition
- Accessible (keyboard navigation)

## Help Content Structure

### Standard Section Pattern

All studio help files follow this pattern:

```tsx
export function StudioHelp() {
  return (
    <div className="help-content">
      <HelpSection title="Overview">
        <p>Brief description of studio...</p>
      </HelpSection>

      <CollapsibleSection title="Getting Started" defaultOpen={true}>
        <ol>
          <li>Step 1...</li>
          <li>Step 2...</li>
        </ol>
      </CollapsibleSection>

      <CollapsibleSection title="Advanced Features">
        <p>Detailed features...</p>
      </CollapsibleSection>

      <HelpSection title="Tips & Best Practices">
        <ul>
          <li>Tip 1...</li>
        </ul>
      </HelpSection>

      <HelpSection title="Troubleshooting">
        <div className="troubleshooting-item">
          <strong>Issue:</strong> Description
          <br />
          <strong>Solution:</strong> Fix
        </div>
      </HelpSection>
    </div>
  );
}
```

## Content Guidelines

### Writing Help Content

**Tone:**
- Friendly and approachable
- Clear and concise
- Action-oriented (use verbs)

**Structure:**
- Start with overview
- Getting started section always first
- Progress from basic to advanced
- End with troubleshooting

**Formatting:**
- Use numbered lists for sequential steps
- Use bullet lists for non-sequential items
- Bold important terms
- Code blocks for technical details

**Examples:**
- Include at least 2-3 use case examples
- Show before/after workflows
- Provide code snippets when relevant

### Code Examples

**Format:**
```tsx
<CollapsibleSection title="Example: Batch Generation">
  <pre><code>{`
// Example code here
const result = await generateImages(prompts);
  `}</code></pre>
  <p>Explanation of example...</p>
</CollapsibleSection>
```

**Best Practices:**
- Keep examples short (< 10 lines)
- Use realistic values
- Add explanatory comments
- Show expected output

## Common Help Patterns

### Step-by-Step Workflow

```tsx
<ol>
  <li>Upload your photo</li>
  <li>Crop to focus on face</li>
  <li>Select 2-3 hairstyles</li>
  <li>Choose colors</li>
  <li>Click "Generate"</li>
  <li>Download results</li>
</ol>
```

### Troubleshooting Item

```tsx
<div className="troubleshooting-item">
  <p><strong>Issue:</strong> Generated image doesn't match selected style</p>
  <p><strong>Cause:</strong> Prompt ambiguity or model limitation</p>
  <p><strong>Solution:</strong> Try regenerating or use more specific options</p>
</div>
```

### Feature Description

```tsx
<HelpSection title="Feature Name">
  <p><strong>What it does:</strong> Brief description</p>
  <p><strong>How to use:</strong> Step by step</p>
  <p><strong>Use cases:</strong> Examples</p>
  <p><strong>Limitations:</strong> Known limitations</p>
</HelpSection>
```

## Updating Help Content

### When to Update

- New feature added → Add to relevant help file
- Bug fixed → Update troubleshooting section
- Workflow changed → Update getting started
- New best practice discovered → Add to tips

### How to Update

1. Locate relevant help file (e.g., `HairStudioHelp.tsx`)
2. Find appropriate section
3. Add new content following existing pattern
4. Test in app (open help modal)
5. Ensure formatting consistent

### Testing Checklist

- [ ] Help modal opens correctly
- [ ] Content displays properly
- [ ] Collapsible sections work
- [ ] Links (if any) work
- [ ] Formatting consistent
- [ ] Mobile responsive
- [ ] Keyboard navigation works

## Future Enhancements

- Search within help content
- Video tutorials embedded
- Interactive demos
- Contextual help (tooltips)
- External link to full documentation
- Feedback button ("Was this helpful?")

## Related Documentation

- **components/HelpModal.tsx**: Modal wrapper (in components/ root)
- **components/CLAUDE.md**: General component patterns
- **.docs/**: Extended project documentation
