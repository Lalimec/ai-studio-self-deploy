# Prompts Directory

This directory contains system prompts and prompt templates for AI model interactions.

## Purpose

**Critical for AI Quality**: These prompts are heavily engineered to ensure consistent, high-quality results from AI models.

**Prompts provide:**
- Structured instructions for complex AI tasks
- Consistency across generations
- Quality control (safety, accuracy)
- JSON schema enforcement
- Multi-stage workflow orchestration

**Total**: 2 files, ~100+ lines of critical prompt engineering

## Files

### adClonerSystemPrompt.ts

**Purpose**: System prompts for Ad Cloner variation generation

**Contains:**
- Prompts for ad context research
- Variation generation instructions
- Refinement prompts
- Subject composition guidance

**Key Features:**
- Maintains ad style consistency
- Instructs variation while preserving brand identity
- Handles multi-subject composition

**Used by**: `services/adClonerService.ts`

**Example Prompt Structure:**
```typescript
export const AD_RESEARCH_PROMPT = `
Analyze this advertisement image and provide:
1. Product/service identification
2. Brand style and aesthetic
3. Target audience indicators
4. Key visual elements
5. Color palette and mood
...
`;
```

---

### videoAnalyzerPrompts.ts (100+ lines) ⭐ **CRITICAL**

**Purpose**: Heavily engineered prompts for Video Analyzer multi-stage workflow

**DO NOT MODIFY WITHOUT CAREFUL CONSIDERATION** - These prompts are the result of extensive testing and iteration.

#### 1. systemInstructionForAnalysis

**Purpose**: 10-point strategic analysis framework

**Structure:**
```typescript
export const systemInstructionForAnalysis = `
You are an expert advertising strategist and analyst...

Analyze this video advertisement and provide a comprehensive 10-point analysis:

### STRATEGIC FOUNDATION

**1. Product/Service Identification:**
- Identify the primary product/service being advertised
- Note key features and benefits highlighted
- Identify category (e.g., fashion, tech, food, etc.)

**2. IP & Brand Verification (ZERO-TRUST APPROACH):**
⚠️ CRITICAL: Perform multi-vector verification to detect potentially fake brands

VERIFICATION STEPS:
a) Search for "[brand name] official website"
b) Search for "[brand name] + [product category]"
c) Check for inconsistencies (logo, spelling, domain)
d) Flag if: No search results, suspicious domains, misspellings

REAL BRAND INDICATORS:
✓ Multiple credible search results
✓ Official website found
✓ Recognized social media presence
✓ News/press coverage

FAKE BRAND INDICATORS:
✗ Zero or minimal search results
✗ Suspicious domain names
✗ Misspellings or logo variations
✗ No official online presence

**OUTPUT REQUIRED:**
{
  "brandName": "...",
  "isVerified": true/false,
  "verificationNotes": "...",
  "searchResults": ["...", "..."]
}

**3. Campaign Objective:**
...

### AUDIENCE & TARGETING

**4. Primary Target Audience:**
...

### CREATIVE EXECUTION

**5. Creative Strategy:**
...

### [Additional sections: Distribution, Budget, Messaging, Competitive Positioning, Success Metrics]

### STORYBOARD & KEY FRAMES

**10. Visual Storyboard:**
Identify 4-6 key frames that best represent the ad's narrative flow.

For each frame, provide:
{
  "timestamp": "MM:SS",
  "description": "...",
  "visualElements": ["...", "..."],
  "action": "..."
}

### OUTPUT FORMAT

Return ONLY valid JSON matching this schema:
{
  "product": { ... },
  "ipVerification": { ... },
  "campaignObjective": "...",
  "targetAudience": { ... },
  "creativeStrategy": { ... },
  "distribution": { ... },
  "budgetIndicators": "...",
  "messaging": { ... },
  "competitivePositioning": "...",
  "successMetrics": ["...", "..."],
  "storyboard": [
    {
      "timestamp": "00:05",
      "description": "...",
      "visualElements": ["...", "..."],
      "action": "..."
    },
    ...
  ]
}
`;
```

**Key Features:**

1. **Zero-Trust IP Verification:**
   - Multi-vector search to detect fake brands
   - Explicit verification criteria
   - Flags suspicious indicators
   - Required JSON output for verification

2. **Comprehensive Analysis Framework:**
   - 10 distinct analytical dimensions
   - Structured output requirements
   - Actionable insights

3. **Storyboard Extraction:**
   - Timestamp-based key frame identification
   - Visual element cataloging
   - Action/motion description

4. **JSON Schema Enforcement:**
   - Strict output format
   - Validates against schema in `videoAnalyzerService.ts`

**Used by**: `videoAnalyzerService.generateAnalysis()`

---

#### 2. getSystemInstructionForConcept()

**Purpose**: Static ad concept generation from storyboard

**ZERO-TOLERANCE RULES:**
```typescript
export function getSystemInstructionForConcept(
  storyboard: StoryboardScene[],
  approachInstructions?: string
) {
  return `
### CRITICAL RULES - ZERO TOLERANCE:

🚫 FORBIDDEN ELEMENTS:
- NO end cards or logo slates
- NO text overlays or CTAs
- NO transitions or fades
- NO brand logos as standalone elements
- NO countdown timers
- NO "coming soon" or promotional text

✅ REQUIRED ELEMENTS:
- Focus ONLY on the core creative frames
- Adapt the most visually compelling scenes
- Preserve all visual elements from storyboard
- Maintain authentic ad aesthetic
- Show product/subject in context

### YOUR TASK:

Based on this video ad storyboard, generate 3 distinct static ad concepts.

**Storyboard:**
${JSON.stringify(storyboard, null, 2)}

${approachInstructions ? `
**Strategic Approach:**
${approachInstructions}
` : ''}

### CONCEPT REQUIREMENTS:

Each concept should:
1. **Adapt core creative frames** (NOT end cards or transitions)
2. **Preserve visual language** (colors, style, mood from video)
3. **Feature product/subject prominently**
4. **Tell a story** in a single frame
5. **Be platform-agnostic** (works for any social media)

### OUTPUT FORMAT:

Return JSON array of 3 concepts:
[
  {
    "conceptTitle": "...",
    "tagline": "...",
    "visualDescription": "...",
    "keyElements": ["...", "..."],
    "colorPalette": ["...", "..."],
    "moodAndTone": "...",
    "targetingNotes": "..."
  },
  ...
]

### VISUAL DESCRIPTION REQUIREMENTS:

Be EXTREMELY detailed and specific:
- Describe exact positioning of all elements
- Specify lighting (direction, quality, color temperature)
- Detail textures and materials
- Describe depth and perspective
- Include environmental context
- Specify any visual effects or styling

**Example of GOOD visual description:**
"Close-up product shot from slightly above (30° angle). The [product] is centered on a textured concrete surface with soft dappled sunlight creating dramatic shadows at 10 o'clock. Background is softly blurred urban environment with warm bokeh. Product is lit with soft key light from upper left, creating gentle highlights on [specific surface]. Muted earth tone color palette with pops of [brand color]. Shallow depth of field (f/2.8) isolates product from background."

**Example of BAD visual description:**
"Nice photo of the product on a table."

REMEMBER: NO end cards, NO logos as standalone, NO text overlays!
`;
}
```

**Key Features:**

1. **Zero-Tolerance Rule Enforcement:**
   - Explicit forbidden elements
   - Clear required elements
   - Prevents common AI mistakes (logo slates, end cards)

2. **Storyboard-Faithful Adaptation:**
   - Uses actual frames from video
   - Preserves visual language
   - Maintains brand consistency

3. **Detailed Visual Descriptions:**
   - Examples of good/bad descriptions
   - Forces specificity (prevents vague prompts)
   - Ensures high-quality image generation

4. **JSON Schema with Targeting:**
   - Structured output
   - Platform-agnostic concepts
   - Includes targeting notes for media buying

**Used by**: `videoAnalyzerService.generateAdConcept()`

---

#### 3. sceneGenerationDefaultPrompt

**Purpose**: Default prompt for scene variation generation with subject composition

```typescript
export const sceneGenerationDefaultPrompt = `
Generate a variation of this scene from the video ad storyboard.

**Original Scene:**
[Timestamp: {timestamp}]
{description}

**Visual Elements to Preserve:**
{visualElements}

**Subject Images Provided:**
{subjectCount} subject image(s) to composite into the scene

### INSTRUCTIONS:

1. **Preserve Scene Composition:**
   - Maintain overall layout and framing
   - Keep background/environment consistent
   - Preserve lighting and mood

2. **Integrate Subjects:**
   - Naturally composite provided subjects into scene
   - Match lighting and perspective
   - Ensure subjects fit contextually

3. **Maintain Ad Aesthetic:**
   - Keep brand visual language
   - Preserve color palette
   - Match production quality

### OUTPUT:

Generate a single image that adapts this scene with the provided subjects.
Focus on natural integration and visual consistency.
`;
```

**Key Features:**
- Template with variable substitution
- Preserves scene context
- Natural subject integration
- Maintains brand consistency

**Used by**: `videoAnalyzerService.generateSceneVariation()`

---

## Prompt Engineering Principles

### 1. Specificity Over Brevity

**Bad:**
```typescript
const prompt = "Analyze this video ad";
```

**Good:**
```typescript
const prompt = `
You are an expert advertising strategist.

Analyze this video ad and provide:
1. Product identification with features
2. Brand verification using Google Search
3. Target audience demographics
4. Creative strategy and execution
5. Campaign objectives

Return structured JSON matching this schema:
{ ... }
`;
```

**Why**: AI models perform better with detailed, structured instructions.

---

### 2. JSON Schema Enforcement

**Pattern:**
```typescript
const prompt = `
... instructions ...

OUTPUT FORMAT (CRITICAL):

Return ONLY valid JSON matching this schema:
{
  "field1": "string",
  "field2": ["array", "of", "strings"],
  "field3": {
    "nested": "object"
  }
}

Do NOT include markdown formatting, code blocks, or explanatory text.
Return raw JSON only.
`;
```

**Why**: Ensures parseable responses, reduces errors.

---

### 3. Zero-Tolerance Rules

**Pattern:**
```typescript
const prompt = `
### FORBIDDEN - ZERO TOLERANCE:

🚫 NEVER include:
- End cards
- Logo slates
- Text overlays
- Transitions

✅ ALWAYS include:
- Core creative frames
- Product in context
- Authentic ad aesthetic

Violation of forbidden elements will result in regeneration.
`;
```

**Why**: Prevents common AI mistakes, ensures quality.

---

### 4. Examples in Prompts

**Pattern:**
```typescript
const prompt = `
... instructions ...

### EXAMPLES:

**GOOD Example:**
"Close-up product shot from 30° angle, soft dappled sunlight..."

**BAD Example:**
"Nice photo of product."

Follow the GOOD example pattern.
`;
```

**Why**: Guides AI toward desired output format/quality.

---

### 5. Multi-Vector Verification

**Pattern:**
```typescript
const prompt = `
VERIFICATION STEPS:
1. Search for "[brand] official website"
2. Search for "[brand] + [category]"
3. Check for inconsistencies
4. Flag if no results or suspicious

REAL INDICATORS:
✓ Multiple credible results
✓ Official website found

FAKE INDICATORS:
✗ Zero results
✗ Suspicious domains
`;
```

**Why**: Prevents hallucinations, ensures factual accuracy.

---

## When to Modify Prompts

### DO Modify When:
- ✅ Adding new features (new analysis dimensions)
- ✅ Fixing specific output issues (e.g., always returns logos)
- ✅ Improving JSON schema (add new fields)
- ✅ Enhancing quality (add examples, stricter rules)

### DO NOT Modify When:
- ❌ "Simplifying" prompts (brevity reduces quality)
- ❌ Removing "redundant" instructions (repetition is intentional)
- ❌ Changing JSON schema without updating parser
- ❌ Removing zero-tolerance rules (they prevent common failures)

---

## Testing Prompt Changes

### 1. Test with Mock Data First

```typescript
// In videoAnalyzer mockData.ts
const testAnalysis = await generateAnalysis(mockVideo, 'flash');
console.log(testAnalysis);
```

### 2. Verify JSON Parsing

```typescript
try {
  const parsed = JSON.parse(response);
  // Check schema matches
} catch (error) {
  console.error('JSON parse failed:', error);
}
```

### 3. Test Edge Cases

- Empty storyboard
- No search results (fake brand)
- Malformed video
- Very long/short videos

### 4. A/B Test Prompt Variants

- Save old prompt as `promptV1`
- Create new prompt as `promptV2`
- Compare outputs side-by-side
- Keep better version

---

## Common Prompt Tasks

### Add New Analysis Dimension

1. **Update `systemInstructionForAnalysis`:**
   ```typescript
   **11. New Dimension:**
   Describe what to analyze...

   Provide:
   - Point 1
   - Point 2
   ```

2. **Update JSON schema:**
   ```typescript
   {
     ...
     "newDimension": "..."
   }
   ```

3. **Update TypeScript interface in `types.ts`:**
   ```typescript
   export interface VideoAnalysis {
     // ...
     newDimension: string;
   }
   ```

4. **Update UI to display new field**

---

### Fix JSON Parsing Issues

1. **Add stricter format instructions:**
   ```typescript
   Return ONLY raw JSON.
   Do NOT wrap in markdown code blocks.
   Do NOT add explanatory text.
   Start response with { and end with }
   ```

2. **Add example output:**
   ```typescript
   EXAMPLE OUTPUT:
   {"field": "value"}
   ```

3. **Implement fallback parsing** (see `videoAnalyzerService.parseAnalysisResponse`)

---

### Improve Prompt Quality

1. **Add specific examples:**
   - Show good vs bad outputs
   - Provide templates

2. **Add validation rules:**
   - Required fields
   - Format constraints
   - Length requirements

3. **Add zero-tolerance rules:**
   - Explicitly forbid unwanted behaviors
   - Use emoji/formatting for emphasis

---

## Prompt Performance Tips

### 1. Front-Load Critical Instructions

```typescript
// Bad - critical instruction at end
const prompt = `
Long instructions...
[10 paragraphs]
...
IMPORTANT: Return JSON only.
`;

// Good - critical instruction at top
const prompt = `
CRITICAL: Return ONLY valid JSON. No markdown, no explanations.

Long instructions...
`;
```

**Why**: AI attention is higher at start of prompt.

---

### 2. Use Formatting for Emphasis

```typescript
const prompt = `
### 🚫 FORBIDDEN - ZERO TOLERANCE:
- No end cards
- No logos

### ✅ REQUIRED:
- Core frames
- Product context
`;
```

**Why**: Visual formatting helps AI parse important sections.

---

### 3. Repeat Critical Constraints

```typescript
const prompt = `
Return JSON only. [instruction section]

... 10 paragraphs ...

REMINDER: Return ONLY JSON, no markdown.
`;
```

**Why**: Repetition reinforces constraints, prevents drift.

---

## Related Documentation

- **services/CLAUDE.md**: Services that use these prompts
- **.docs/SYSTEM_PROMPTS_REFERENCE.md**: Extended prompt engineering guide
- **components/videoAnalyzer/CLAUDE.md**: Video Analyzer feature documentation
- **Root CLAUDE.md**: Project overview with prompt importance
