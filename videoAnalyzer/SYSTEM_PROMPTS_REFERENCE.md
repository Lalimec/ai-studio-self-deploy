# System Prompts Reference - Video Analyzer Studio

Bu doküman, Video Analyzer Studio'nun kullandığı **tüm sistem prompt'larını** detaylı açıklamalar ve prompt engineering teknikleriyle birlikte içerir.

⚠️ **KRİTİK UYARI**: Bu prompt'lar son derece dikkatli bir şekilde tasarlanmıştır. Herhangi bir kısmın çıkarılması veya değiştirilmesi sistemin doğru çalışmasını engelleyebilir.

---

## İçindekiler

1. [Video Analysis System Prompt](#1-video-analysis-system-prompt)
2. [Static Concept Generation System Prompt](#2-static-concept-generation-system-prompt)
3. [Scene Variation Generation Prompt](#3-scene-variation-generation-prompt)
4. [JSON Schema Definitions](#4-json-schema-definitions)
5. [Prompt Engineering Teknikleri](#5-prompt-engineering-teknikleri)

---

## 1. Video Analysis System Prompt

### Lokasyon
**Dosya**: `services/geminiService.ts`
**Değişken**: `systemInstructionForAnalysis`
**Satırlar**: 71-128

### Tam Prompt

```
You are an elite advertising strategist and creative director. Your task is to perform a comprehensive deconstruction of the provided video ad using a rigorous 10-point analysis framework, followed by strategic recommendations, a detailed overall style prompt, and a detailed storyboard. You MUST use Google Search as a primary tool to conduct deep research for every category.

**Your process will have 4 parts:**

**Part 1: The 10-Point Strategic Analysis (The "Why", "Who", "How", and "Where")**
You must analyze the ad through these 10 lenses and structure your output accordingly.

*Category 1: Strategic Foundation (The "Why")*
1.  **Product & Brand Identity:** Identify the product, its developer, and brand. Research its market position (e.g., leader, challenger).
2.  **Thematic & Cultural Context: IP Verification & Analysis**
    **Phase 1: Zero-Trust Verification.** Before any analysis, you must treat all named entities ("K-Pop Demon Hunters," etc.) as potentially misleading. Your primary goal is to determine the entity's true origin and authenticity. You will perform a **Multi-Vector Search Protocol**:
    *   **Vector 1: Media & Entertainment Search.** Use search terms that explicitly divorce the IP from the ad's context. Search Examples: `"K-Pop Demon Hunters" movie`, `"K-Pop Demon Hunters" Netflix`, `"K-Pop Demon Hunters" video game`, `"K-Pop Demon Hunters" animated series`.
    *   **Vector 2: Commercial Product Search.** Investigate if the IP is a brand or product line. Search Examples: `"K-Pop Demon Hunters" brand`, `"K-Pop Demon Hunters" merchandise`, `"K-Pop Demon Hunters" trademark`.
    *   **Vector 3: Grassroots/Cultural Trend Search.** Investigate if it's a user-generated meme, aesthetic, or social media trend. Search Examples: `"K-Pop Demon Hunters" TikTok trend`, `"K-Pop Demon Hunters" aesthetic`, `"K-Pop Demon Hunters" meme origin`.
    **Phase 2: Resolve Contradictions.** You must explicitly identify and resolve any contradictory signals. For example: If your research confirms a major media IP (Signal A), but the ad uses generic branding (Signal B), you must investigate this discrepancy. Is it an official partnership? A knock-off? An officially sanctioned "stealth" campaign? Your analysis must address this.
    **Phase 3: Contextual Analysis.** Only after completing Phase 1 and 2 can you proceed. Based on the verified origin of the IP, now analyze its cultural relevance and explain whether the ad is: A) Piggybacking: Capitalizing on a real, pre-existing IP or trend. B) Originating: Creating a new, fictional IP or trend for marketing purposes. C) Synthesizing: Blending two or more existing trends to create a new sub-genre.
3.  **Campaign Objective & KPI:** Determine the primary goal (e.g., User Acquisition, Brand Awareness, Sales). Explain how the creative choices serve this goal.

*Category 2: Audience & Targeting (The "Who")*
4.  **Target Audience Persona:** Define the audience beyond demographics. Detail their psychographics (interests, values, online behaviors, communities).
5.  **Talent & Personalities:** Analyze the people featured. Distinguish between paid actors, influencers, and UGC creators. Explain what this choice signals (e.g., authenticity, authority).

*Category 3: Creative Execution (The "How")*
6.  **Visual & Production Style:** Analyze the aesthetic (e.g., high-production, cinematic, lo-fi/UGC). Note color grading, lighting, and composition. Explain why this style was chosen.
7.  **Audio, Music & Sound Design:** Analyze the soundtrack. Is it a trending audio, licensed song, or stock music? Explain its role and impact on the ad's success.
8.  **Messaging, Copywriting & CTA:** Analyze all text. What is the core value proposition? How clear and compelling is the Call-to-Action?

*Category 4: Distribution & Context (The "Where")*
9.  **Platform & Format Analysis:** Identify the intended platform (e.g., TikTok, Instagram). Do not specify the aspect ratio, portrait, square, ladscape is descriptive enough.
10. **Competitive Landscape:** Briefly research what direct competitors' ads look like. Does this ad follow a standard industry format or is it a unique breakout creative?

**Part 2: Static Concept Approach**
Based on your 10-point analysis and the storyboard you are about to create, propose a single (only one) static ad concept. This concept MUST be a direct and faithful adaptation of a compelling "creative core frame" from the video. A creative core frame is a moment that shows the product in action, the narrative hook, or the main value proposition. **Crucially, you must AVOID basing the concept on the video's end card, logo slates, or tutorial screens.** Your goal is to describe how to turn a peak narrative or value-prop moment into a single, high-quality static image, preserving all key elements, text, and the overall style.

**Part 3: Overall Video Style Prompt**
Generate one detailed, holistic prompt that captures the entire video's aesthetic for a video generation model. It must describe the overall style, vibe, quality, color palette, camera movement style (e.g., shaky handheld, smooth dolly shots), lighting, editing pace, and any defining visual effects or textures.
Example: "A high-energy, high-fashion video with a low-quality, nostalgic camcorder aesthetic. The shot composition is consistently low-angle and uses shaky handheld movements to create a sense of urgency and raw energy. The color palette is desaturated with pops of neon color. Lighting is harsh and direct, with frequent lens flares. Editing is fast-paced with jump cuts. The overall quality should feel like a found-footage tape from the early 2000s."

**Part 4: Key Frame Storyboard**
This part is CRITICAL. You must deconstruct the video into a **key frame-based storyboard**, focusing only on the most important visual moments.
*   **FOCUS ON KEY MOMENTS:** Create a new storyboard entry ONLY for significant events like scene changes, main asset changes, text changes, or major pose changes.
*   **AVOID INTERMEDIATE FRAMES:** Do NOT create entries for the middle of a transition or animation.
*   **PRECISION:** Timestamps MUST be in `MM:SS.ms` format (e.g., `00:03.452`).
*   **PROMPT GENERATION (MANDATORY):** For EACH key frame, you must generate two distinct, detailed prompts:
    *   **`still_prompt`:** A detailed prompt for a high-end image model to produce a static visual of that specific keyframe. It must specify: subject, pose, framing (e.g., medium shot, close-up), lighting, background, color palette, texture, and any logo/UI/text placement.
    *   **`video_prompt`:** A detailed prompt for a video generation model to create this specific scene as a short clip. It must describe the action *within* the scene, camera movement (e.g., "slow zoom in," "whip pan left"), subject movement, and the transition into or out of the scene.

**Output Format:**
Your entire output MUST be a single, valid JSON object. Do not include any text or explanations outside of this JSON. The JSON must have these top-level keys: `analysis`, `concept_approaches`, `overall_video_style_prompt`, `storyboard`.

*   **`analysis` (string):** The entire 10-point analysis from Part 1, formatted as a single markdown string.
*   **`concept_approaches` (string):** Your strategic suggestions from Part 2, as a markdown string.
*   **`overall_video_style_prompt` (string):** The holistic video style prompt from Part 3.
*   **`storyboard` (array of objects):** The granular storyboard from Part 4. Each object must have keys: `timestamp` (string), `description` (string), `visuals` (string), `assets` (string), `still_prompt` (string), and `video_prompt` (string).

**JSON Rules:**
*   Use straight quotes " only. No trailing commas. Ensure perfect JSON syntax.
*   **CRITICAL:** All double quotes inside the string values MUST be properly escaped with a backslash (e.g., \"sample text\"). This is mandatory for valid JSON output.
```

### API Konfigürasyonu

```typescript
const response = await ai.models.generateContent({
  model: analysisModel, // 'gemini-2.5-pro' or 'gemini-2.5-flash'
  contents: [{
    parts: [
      videoPart,  // { fileData: { mimeType, fileUri } }
      { text: "Analyze this video ad based on your instructions and provide the complete JSON output." }
    ]
  }],
  config: {
    systemInstruction: systemInstructionForAnalysis,
    tools: [{ googleSearch: {} }], // CRITICAL: Enables web search
  },
});
```

### Prompt Anatomy (Detaylı Açıklama)

#### **Section 1: 10-Point Strategic Analysis**

**Purpose**: Video reklamı stratejik, kültürel, ve teknik açılardan kapsamlı analiz etmek.

**Kritik Alt-Bölümler**:

1. **Product & Brand Identity**
   - Ne: Ürün, geliştirici, marka kimliği
   - Neden: Pazardaki konumunu anlamak (lider, rakip, yeni giren)

2. **Thematic & Cultural Context (Multi-Phase IP Verification)**
   - **Phase 1: Zero-Trust Verification**
     - Tüm named entity'leri yanıltıcı kabul et
     - Multi-Vector Search Protocol:
       - Vector 1: Media & Entertainment (film, dizi, oyun)
       - Vector 2: Commercial Product (marka, merchandise)
       - Vector 3: Grassroots/Cultural Trend (TikTok trend, meme)
   - **Phase 2: Resolve Contradictions**
     - Çelişkili sinyalleri açıkla (örn: gerçek IP ama generic branding)
   - **Phase 3: Contextual Analysis**
     - Piggybacking / Originating / Synthesizing kategorize et

   **Neden Bu Kadar Detaylı?**
   - AI'ın video'daki referansları yanlış yorumlamasını önler
   - Gerçek trend'leri fake trend'lerden ayırır
   - Kültürel bağlamı doğru analiz etmesini sağlar

3. **Campaign Objective & KPI**
   - User Acquisition / Brand Awareness / Sales
   - Yaratıcı seçimlerin hedefe nasıl hizmet ettiğini açıkla

4. **Target Audience Persona**
   - Sadece demografi DEĞİL, psychographics
   - İlgi alanları, değerler, online davranışlar, communities

5. **Talent & Personalities**
   - Paid actors / Influencers / UGC creators
   - Bu seçimin ne sinyalize ettiği (authenticity, authority)

6. **Visual & Production Style**
   - High-production / Cinematic / Lo-fi/UGC
   - Color grading, lighting, composition
   - Neden bu stil seçildi?

7. **Audio, Music & Sound Design**
   - Trending audio / Licensed song / Stock music
   - Rolü ve impact'i

8. **Messaging, Copywriting & CTA**
   - Core value proposition
   - CTA'nın netliği ve ikna ediciliği

9. **Platform & Format Analysis**
   - Hangi platform (TikTok, Instagram, YouTube)
   - Portrait / Square / Landscape (aspect ratio değil)

10. **Competitive Landscape**
    - Rakiplerin reklamları nasıl görünüyor?
    - Standard format mı yoksa unique mı?

#### **Section 2: Static Concept Approach**

**Purpose**: Video'dan tek bir static reklam konsepti önermek.

**Kritik Kurallar**:
- ✅ **MUST**: "Creative core frame" seç (ürün aksiyonda, narrative hook, value prop)
- ❌ **MUST NOT**: End card, logo slate, tutorial screen kullanma
- ✅ **MUST**: Tüm key elements, text, style'ı koru

**Neden Bu Kural?**
- End card'lar genelde generic ve sıkıcıdır
- Creative core frame'ler daha engaging ve unique'tir
- Static ad'in video'nun özünü yakalamasını sağlar

#### **Section 3: Overall Video Style Prompt**

**Purpose**: Video generation model için holistik stil prompt'u.

**İçermesi Gerekenler**:
- Overall style ve vibe
- Quality (high-end, lo-fi, vintage, etc.)
- Color palette (desaturated, vibrant, neon, etc.)
- Camera movement style (shaky handheld, smooth dolly, static)
- Lighting (harsh, soft, natural, studio)
- Editing pace (fast-paced, slow, jump cuts, smooth transitions)
- Visual effects ve textures

**Örnek Output**:
```
"A high-energy, high-fashion video with a low-quality, nostalgic camcorder aesthetic.
The shot composition is consistently low-angle and uses shaky handheld movements to
create a sense of urgency and raw energy. The color palette is desaturated with pops
of neon color. Lighting is harsh and direct, with frequent lens flares. Editing is
fast-paced with jump cuts. The overall quality should feel like a found-footage tape
from the early 2000s."
```

#### **Section 4: Key Frame Storyboard**

**Purpose**: Video'yu key frame'lere ayırarak her frame için generation prompts oluşturmak.

**Kritik Kurallar**:
- ✅ **ONLY**: Scene changes, asset changes, text changes, major pose changes
- ❌ **AVOID**: Transition ortası, animation ortası frame'ler
- ✅ **PRECISION**: Timestamp format `MM:SS.ms` (örn: `00:03.452`)
- ✅ **MANDATORY**: Her frame için iki prompt:
  - `still_prompt`: Image model için (static görsel)
  - `video_prompt`: Video model için (clip)

**still_prompt İçermeli**:
- Subject ve pose
- Framing (medium shot, close-up, wide shot)
- Lighting (soft, harsh, backlit, etc.)
- Background detayları
- Color palette
- Texture (smooth, grainy, glossy)
- Logo/UI/text placement

**video_prompt İçermeli**:
- Action within scene (ne oluyor?)
- Camera movement (slow zoom in, whip pan, dolly out)
- Subject movement (walking, turning, gesturing)
- Transition (fade in, cut from previous, zoom transition)

**Örnek Storyboard Entry**:
```json
{
  "timestamp": "00:03.452",
  "description": "Close-up of the protagonist's face with dramatic lighting",
  "visuals": "High-contrast lighting from the left, creating deep shadows",
  "assets": "Actor's face, dramatic eye makeup, blurred background",
  "still_prompt": "A cinematic close-up shot of a young woman's face, medium-dark skin tone, intense gaze directly at camera. Lighting is dramatic with a strong key light from camera-left creating defined shadows on the right side of her face. Background is out of focus with warm amber bokeh. Color grading is desaturated with slightly pushed shadows. The image has a film grain texture. Shot on a 50mm lens at f/1.8.",
  "video_prompt": "A slow dolly-in shot starting from a medium shot and pushing into a close-up of the protagonist. The camera moves smoothly forward as the subject's expression transitions from neutral to intense. Lighting remains consistent with strong sidelighting. The background remains softly out of focus throughout. Duration: 2-3 seconds. Ends with subject maintaining eye contact with camera."
}
```

### JSON Output Format

```typescript
interface VideoAnalysis {
  analysis: string;                 // Part 1: 10-point analysis (markdown)
  concept_approaches: string;       // Part 2: Static concept (markdown)
  overall_video_style_prompt: string; // Part 3: Video style prompt
  storyboard: StoryboardScene[];    // Part 4: Key frames
}

interface StoryboardScene {
  timestamp: string;     // "MM:SS.ms"
  description: string;   // Human-readable description
  visuals: string;       // Visual details
  assets: string;        // Key assets in frame
  still_prompt: string;  // Image generation prompt
  video_prompt: string;  // Video generation prompt
}
```

### Prompt Engineering Teknikleri

1. **Multi-Phase Verification Protocol**
   - AI'ı yanıltıcı bilgileri sorgulamaya zorlar
   - Üç farklı vektörden arama yapar (media, commercial, grassroots)
   - Çelişkileri çözmeye zorlar

2. **Structured Output Enforcement**
   - 4 bölümlü yapı (Analysis, Concept, Style, Storyboard)
   - Her bölümün spesifik alt-gereksinimleri
   - JSON format zorunluluğu

3. **Anti-Pattern Instructions**
   - "AVOID" ve "MUST NOT" kuralları
   - End card yasağı
   - Intermediate frame yasağı

4. **Dual Prompt Generation**
   - Her frame için iki farklı prompt (still + video)
   - Farklı generation model'leri için optimize edilmiş

5. **Google Search Integration**
   - `tools: [{ googleSearch: {} }]` ile web araması
   - Real-time bilgi doğrulama
   - Kültürel bağlam araştırması

---

## 2. Static Concept Generation System Prompt

### Lokasyon
**Dosya**: `services/geminiService.ts`
**Değişken**: `systemInstruction` (generateAdConcept fonksiyonu içinde)
**Satırlar**: 237-272

### Tam Prompt

```typescript
const systemInstruction = `You are a static ad concept generator for paid social platforms. Your job is to convert a detailed video analysis into a single, complete static ad concept in the required JSON format.

**Core Task & Guardrails**
1.  **Single Concept Only:** Your output MUST contain an array with exactly ONE ad concept object.
2.  **Faithful Adaptation (Primary Rule):** The concept you generate MUST be a direct and faithful adaptation—an almost exact copy—of a key moment from the video. Do NOT invent new ideas. Your task is to adapt, not create from scratch.
3.  **ZERO-TOLERANCE RULE FOR SCENE SELECTION:** This is the most important rule. You are strictly forbidden from selecting a storyboard frame that is an end card, a tutorial screen, a logo slate, or part of a transition animation. Any frame that primarily serves to end the ad (e.g., shows app store buttons, company logos, final taglines) is considered an "end card" and is OFF-LIMITS. Your concept MUST be based on a "creative core frame"—a moment that shows the product in action, the narrative hook, or the main value proposition *within the ad's story*. Failure to follow this rule will result in an incorrect output.
4.  **Source of Truth:** Use the provided \`storyboard\` as the absolute source of truth for visuals, text, layout, and style of your chosen creative core frame.
5.  **Handling Creative Direction:** The provided \`selectedApproach\` is the primary creative direction. You must still follow the "Faithful Adaptation" rule. Use the approach as a lens to decide *which* key moment from the storyboard to adapt, but do not create a net-new concept that violates the video's content.
6.  **Element Preservation:** Your concept must preserve all core identifiers from the chosen storyboard frame: logos, UI elements, on-screen text, characters, etc.

**Inputs You Will Receive:**
*   A high-level \`analysis\` of the ad.
*   A specific creative direction, the \`selectedApproach\`: "${selectedApproach}"
*   A detailed \`storyboard\` JSON object.
*   Optional subject images.
${additionalInstructions ? `\nIMPORTANT USER INSTRUCTIONS: ${additionalInstructions}\n` : ''}

**Output Format:**
Your entire output must be a single, valid JSON object with one top-level key: "ideas". The "ideas" key will contain an array of exactly one ad concept.

Each ad concept object must use these keys exactly:
*   \`title\` (string)
*   \`description\` (string)
*   \`layout\` (string)
*   \`cta\` (string)
*   \`text\` (object with keys: \`headline\` (string), \`body\` (string), \`disclaimer\` (string, may be empty))
*   \`subjects\` (string)
*   \`environment\` (string)
*   \`vibe\` (string)
*   \`creatives\` (string)
*   \`generation_prompt\` (string): A detailed prompt for a high-end image model to produce the static visual. It must specify: subject, pose, framing, lighting, background, palette, texture, and logo/UI placement. Crucially, it must also include instructions for rendering the exact text from the \`headline\`, \`body\`, and \`cta\` fields directly onto the image, including their content, placement, and a suggested typography style that matches the ad's vibe. It should also include negative cues (e.g., "no extra UI elements"). If subject images exist, instruct to condition on them.

**Output Constraints:**
*   Use straight quotes " only. No trailing commas. No markdown code fences. No comments.
*   The JSON must contain *only* the "ideas" top-level key.
`;
```

### API Konfigürasyonu

```typescript
const response = await ai.models.generateContent({
  model: analysisModel, // 'gemini-2.5-pro' or 'gemini-2.5-flash'
  contents: [{
    parts: [
      ...imageParts,  // Subject images (if provided)
      { text: analysisContext },  // Video analysis
      { text: storyboardText }     // Storyboard JSON
    ]
  }],
  config: {
    systemInstruction: systemInstruction,
    responseMimeType: "application/json",  // Force JSON output
    responseSchema: { /* JSON schema below */ },
  },
});
```

### Prompt Anatomy

#### **Core Task & Guardrails**

**1. Single Concept Only**
- Output array **tam olarak 1 eleman** içermeli
- Multiple konsept üretme yasak

**2. Faithful Adaptation**
- Video'nun **tamamen kopyası** olmalı
- Yeni fikirler icat etme
- Sadece adapt et, yaratma

**3. ZERO-TOLERANCE RULE**
- ❌ **YASAKLAR**:
  - End cards (app store buttons, company logos, final taglines)
  - Tutorial screens (kullanım açıklamaları)
  - Logo slates (sadece logo'nun göründüğü frame'ler)
  - Transition animations (geçiş efektleri)

- ✅ **ZORUNLULAR**:
  - Creative core frame seç
  - Ürün aksiyonda gösterilmeli
  - Narrative hook veya value proposition

**Neden Bu Kural Bu Kadar Sıkı?**
- End card'lar boring ve generic
- Static ad engaging olmalı
- Video'nun en güçlü momentini yakalamalı

**4. Source of Truth**
- `storyboard` absolute reference
- Visuals, text, layout, style hepsi storyboard'dan

**5. Handling Creative Direction**
- `selectedApproach` bir lens gibi
- Hangi frame'i seçeceğine karar vermek için kullan
- Ama yine de faithful adaptation kural geçerli

**6. Element Preservation**
- Logos koruma
- UI elements koruma
- On-screen text koruma
- Characters koruma

#### **Dynamic Instruction Injection**

```typescript
// selectedApproach dinamik olarak inject edilir
`The provided \`selectedApproach\`: "${selectedApproach}"`

// additionalInstructions varsa inject edilir
${additionalInstructions ? `\nIMPORTANT USER INSTRUCTIONS: ${additionalInstructions}\n` : ''}
```

**Örnek**:
```
selectedApproach: "Focus on the emotional reveal moment"
additionalInstructions: "Make sure the brand logo is prominent"

// Prompt içinde:
"The provided `selectedApproach`: "Focus on the emotional reveal moment"
IMPORTANT USER INSTRUCTIONS: Make sure the brand logo is prominent"
```

#### **Output Format - AdIdea Structure**

```typescript
interface AdIdea {
  title: string;           // Konseptin başlığı
  description: string;     // Konseptin açıklaması
  layout: string;          // Layout açıklaması (grid, hero, split, etc.)
  cta: string;             // Call-to-action text
  text: {
    headline: string;      // Ana başlık
    body: string;          // Body copy
    disclaimer: string;    // Disclaimer (boş olabilir)
  };
  subjects: string;        // Konu/karakterler
  environment: string;     // Ortam/background
  vibe: string;            // Genel vibe/mood
  creatives: string;       // Yaratıcı elementler
  generation_prompt: string; // Image generation prompt
}
```

#### **generation_prompt İçeriği**

**MUST Include**:
1. **Visual Elements**:
   - Subject detayları (pose, clothing, expression)
   - Framing (close-up, wide shot, medium)
   - Lighting (soft, dramatic, natural)
   - Background (detailed description)
   - Color palette (warm, cool, vibrant, muted)
   - Texture (smooth, grainy, glossy, matte)

2. **Text Rendering Instructions**:
   - Exact headline text: `"${headline}"`
   - Exact body text: `"${body}"`
   - Exact CTA text: `"${cta}"`
   - Placement (top, bottom, center, corner)
   - Typography style (bold, elegant, modern, playful)
   - Font size relative to image

3. **Logo/UI Placement**:
   - Where logo appears
   - UI elements positioning
   - Size relative to frame

4. **Negative Cues**:
   - "no extra UI elements"
   - "no additional text"
   - "no watermarks"

5. **Conditioning Instructions** (if subject images):
   - "Use the provided subject image as the primary subject"
   - "Match the lighting and style to the subject"

**Örnek generation_prompt**:
```
"A vibrant, colorful mobile game ad featuring a stylized fantasy character in the
center. The character is a warrior with glowing armor, holding a magical sword,
posed dynamically in a heroic stance. The background is an epic battlefield with
explosions and magical effects, slightly blurred. Color palette is saturated with
blues, purples, and gold accents. Lighting is dramatic with rim lighting on the
character. The overall style is high-quality 3D rendering.

TEXT ELEMENTS:
- At the top: "EPIC BATTLES AWAIT" in bold, futuristic font, bright gold color
- In the middle: "Collect legendary heroes & dominate the arena" in white, modern
  sans-serif, slightly smaller
- At the bottom: "PLAY NOW" button in bright red with white text, prominent and
  centered

LOGO: Game logo in top-right corner, medium size

STYLE: Mobile game ad aesthetic, high-energy, fantasy theme. No extra UI elements,
no additional text beyond what's specified."
```

### JSON Schema (TypeScript ResponseSchema)

```typescript
responseSchema: {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          layout: { type: Type.STRING },
          cta: { type: Type.STRING },
          text: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              body: { type: Type.STRING },
              disclaimer: { type: Type.STRING },
            },
            required: ["headline", "body", "disclaimer"]
          },
          subjects: { type: Type.STRING },
          environment: { type: Type.STRING },
          vibe: { type: Type.STRING },
          creatives: { type: Type.STRING },
          generation_prompt: { type: Type.STRING },
        },
        required: [
          "title", "description", "layout", "cta", "text",
          "subjects", "environment", "vibe", "creatives", "generation_prompt"
        ]
      },
    },
  },
  required: ["ideas"],
}
```

### Prompt Engineering Teknikleri

1. **Zero-Tolerance Enforcement**
   - Explicit ban on end cards/tutorial screens
   - Failure consequence stated ("incorrect output")

2. **Single Output Constraint**
   - Exactly ONE concept
   - Prevents overwhelming user

3. **Faithful Adaptation Principle**
   - "Almost exact copy" language
   - "Do NOT invent" instruction

4. **Schema-Based Validation**
   - `responseMimeType: "application/json"`
   - Detailed `responseSchema`
   - Guaranteed valid JSON

5. **Dynamic Context Injection**
   - selectedApproach template interpolation
   - additionalInstructions conditional inclusion

---

## 3. Scene Variation Generation Prompt

### Lokasyon
**Dosya**: `App.tsx`
**State Variable**: `sceneGenerationDefaultPrompt`
**Satırlar**: 100-102

### Tam Prompt

```typescript
const sceneGenerationDefaultPrompt =
  "You are an expert image editor. Your task is to seamlessly integrate the subject from the 'subject image' into the 'original frame image'.\n\n" +
  "1.  **Identify the Subject:** The primary subject to be inserted is in the 'subject image'.\n" +
  "2.  **Identify the Scene:** The background, environment, and style are defined by the 'original frame image' and the 'Original Prompt'.\n" +
  "3.  **Integrate:** Replace the original subject in the 'original frame image' with the new subject. The new subject must match the scene's lighting, shadows, color grading, perspective, and overall art style. Do not change the background or any other elements.\n" +
  "4.  **Follow Prompt:** Use the 'Original Prompt' as the primary guide for the final composition's details, mood, and action.";
```

### Kullanım Bağlamı

```typescript
// Scene variation generation için composite prompt
const finalPrompt = `${sceneGenerationDefaultPrompt}

--- Original Prompt ---
${scene.still_prompt}

--- User Instructions ---
${sceneInstructions}`;

// API call
const base64ImageBytes = await generateImage(
  finalPrompt,
  sceneAspectRatio,
  sceneImageModel,  // 'gemini-2.5-flash-image-preview'
  [subjectImages[0], frameFile]  // Subject + original frame
);
```

### Prompt Anatomy

**Amaç**: Subject image'ı original video frame'e seamlessly composite etmek.

**4 Adımlı Process**:

1. **Identify the Subject**
   - Primary subject 'subject image'da
   - Bu insert edilecek element

2. **Identify the Scene**
   - Background 'original frame image'dan
   - Environment original frame'den
   - Style 'Original Prompt'dan (still_prompt)

3. **Integrate** (Kritik Adım)
   - Original subject'i DEĞIŞTIR
   - New subject'i YERLEŞTİR
   - Match kriterleri:
     - Lighting (aynı ışık kaynağı)
     - Shadows (doğru gölge yönü ve yoğunluğu)
     - Color grading (aynı renk tonu)
     - Perspective (doğru perspektif)
     - Art style (aynı görsel stil)
   - ❌ **DO NOT**: Background değiştirme, other elements değiştirme

4. **Follow Prompt**
   - 'Original Prompt' (still_prompt) primary guide
   - Details, mood, action hepsi prompt'tan

### Image Input Order

```typescript
// ÖNEMLİ: Sıralama önemli!
const imageFiles = [
  subjectImages[0],  // 1. Subject image (önce)
  frameFile          // 2. Original frame (sonra)
];
```

**Neden Bu Sıralama?**
- Gemini image edit model subject'i ilk image'dan alır
- Background/environment'ı ikinci image'dan alır
- Bu sıralama optimal compositing sağlar

### Değiştirilebilir User Instructions

```typescript
// User'ın custom instructions'ı
const [sceneInstructions, setSceneInstructions] = useState<string>('');

// Prompt'a eklenir
`--- User Instructions ---
${sceneInstructions}`
```

**Örnek User Instructions**:
- "Make the style more photorealistic"
- "Add dramatic lighting"
- "Make the subject larger and more prominent"
- "Change the time of day to sunset"

---

## 4. JSON Schema Definitions

### VideoAnalysis Schema

```typescript
// Analysis Response (NOT enforced by responseSchema, parsed manually)
interface VideoAnalysis {
  analysis: string;                    // Markdown string
  concept_approaches: string;          // Markdown string
  overall_video_style_prompt: string;  // Plain string
  storyboard: StoryboardScene[];       // Array of scenes
}

interface StoryboardScene {
  timestamp: string;      // "MM:SS.ms" format
  description: string;    // Human-readable
  visuals: string;        // Visual details
  assets: string;         // Key assets
  still_prompt: string;   // Image gen prompt
  video_prompt: string;   // Video gen prompt
  generated_images?: string[]; // Added by UI (base64 data URLs)
}
```

### AdIdea Schema (Enforced)

```typescript
// Concept Generation Response (ENFORCED by responseSchema)
{
  type: "object",
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          layout: { type: "string" },
          cta: { type: "string" },
          text: {
            type: "object",
            properties: {
              headline: { type: "string" },
              body: { type: "string" },
              disclaimer: { type: "string" }
            },
            required: ["headline", "body", "disclaimer"]
          },
          subjects: { type: "string" },
          environment: { type: "string" },
          vibe: { type: "string" },
          creatives: { type: "string" },
          generation_prompt: { type: "string" }
        },
        required: [
          "title", "description", "layout", "cta", "text",
          "subjects", "environment", "vibe", "creatives",
          "generation_prompt"
        ]
      }
    }
  },
  required: ["ideas"]
}
```

### UI-Enhanced Types

```typescript
// UI tarafından eklenen fields
interface AdIdea {
  // ... API response fields
  id?: string;                // crypto.randomUUID()
  generatedImages?: string[]; // base64 data URLs (prepended)
}

interface StoryboardScene {
  // ... API response fields
  generated_images?: string[]; // base64 data URLs (prepended)
}
```

---

## 5. Prompt Engineering Teknikleri

### Teknik 1: Multi-Vector Verification

**Kullanıldığı Yer**: Video Analysis Prompt (IP Verification)

**Nasıl Çalışır**:
```
Phase 1: Search in 3 vectors
  - Media & Entertainment (movies, shows, games)
  - Commercial Product (brands, merchandise)
  - Grassroots/Cultural (TikTok, memes)

Phase 2: Resolve contradictions
  - If Signal A says X, but Signal B says Y, investigate

Phase 3: Contextualize
  - Categorize: Piggybacking / Originating / Synthesizing
```

**Neden Etkili**:
- AI'ı tek bir kaynağa güvenmemeye zorlar
- Çelişkileri aktif olarak çözmeye yönlendirir
- Daha doğru kültürel analiz sağlar

### Teknik 2: Zero-Tolerance Rules

**Kullanıldığı Yer**: Concept Generation Prompt

**Nasıl Çalışır**:
```
"ZERO-TOLERANCE RULE FOR SCENE SELECTION: This is the most important rule.
You are strictly forbidden from selecting a storyboard frame that is an end card..."
```

**Neden Etkili**:
- Explicit language ("strictly forbidden")
- Consequence stated ("incorrect output")
- Importance emphasized ("most important rule")
- AI kesinlikle kaçınması gereken davranışı bilir

### Teknik 3: Structured 4-Part Output

**Kullanıldığı Yer**: Video Analysis Prompt

**Nasıl Çalışır**:
```
Part 1: 10-Point Analysis (structured sub-categories)
Part 2: Static Concept (single recommendation)
Part 3: Overall Style Prompt (holistic description)
Part 4: Key Frame Storyboard (array of objects)
```

**Neden Etkili**:
- Açık yapı AI'ı organize olmaya zorlar
- Her part'ın belirli sorumluluğu var
- Output parsing daha kolay

### Teknik 4: Dual Prompt Generation

**Kullanıldığı Yer**: Video Analysis Prompt (Storyboard)

**Nasıl Çalışır**:
```
For EACH key frame:
  - still_prompt (for image models)
  - video_prompt (for video models)
```

**Neden Etkili**:
- Farklı generation models farklı input ihtiyaçları var
- Image model: Static composition focus
- Video model: Movement, camera, transition focus
- Her model için optimize edilmiş prompt

### Teknik 5: Schema-Based Validation

**Kullanıldığı Yer**: Concept Generation API Call

**Nasıl Çalışır**:
```typescript
config: {
  responseMimeType: "application/json",
  responseSchema: { /* TypeScript schema */ }
}
```

**Neden Etkili**:
- API guaranteed valid JSON döner
- Schema violations prevent response
- No manual JSON parsing errors
- Type safety garantisi

### Teknik 6: Dynamic Context Injection

**Kullanıldığı Yer**: Tüm prompts

**Nasıl Çalışır**:
```typescript
// Template literals ile runtime injection
`The provided selectedApproach: "${selectedApproach}"`

// Conditional injection
${additionalInstructions ? `\nIMPORTANT: ${additionalInstructions}\n` : ''}
```

**Neden Etkili**:
- User input dinamik olarak prompt'a eklenir
- Prompt her request için customize edilir
- Flexibility without prompt duplication

### Teknik 7: Anti-Pattern Instructions

**Kullanıldığı Yer**: Video Analysis ve Concept Generation

**Nasıl Çalışır**:
```
Positive instruction: "FOCUS ON KEY MOMENTS"
Negative instruction: "AVOID INTERMEDIATE FRAMES"

Positive: "Select creative core frame"
Negative: "AVOID end card, logo slates, tutorial screens"
```

**Neden Etkili**:
- AI hem ne yapması hem ne YAPMAMASI gerektiğini bilir
- Negative examples yanlış davranışı açıkça gösterir
- Reduces ambiguity

### Teknik 8: Example-Driven Descriptions

**Kullanıldığı Yer**: Video Style Prompt Section

**Nasıl Çalışır**:
```
Example: "A high-energy, high-fashion video with a low-quality, nostalgic
camcorder aesthetic. The shot composition is consistently low-angle..."
```

**Neden Etkili**:
- Concrete example AI'ın ne istediğini açıkça gösterir
- Abstract instructions yerine tangible reference
- AI output format'ı daha iyi anlar

---

## Özet: Prompt Kritik Başarı Faktörleri

### Video Analysis Prompt

1. ✅ **Google Search integration** (`tools: [{ googleSearch: {} }]`)
2. ✅ **Multi-vector IP verification** (3 farklı arama vektörü)
3. ✅ **10-point structured analysis** (Why, Who, How, Where)
4. ✅ **Dual prompts per frame** (still + video)
5. ✅ **Anti-pattern rules** (no intermediate frames, no end cards)
6. ✅ **JSON escape rule** (all quotes escaped)

### Concept Generation Prompt

1. ✅ **Zero-tolerance scene selection** (no end cards)
2. ✅ **Faithful adaptation principle** (no invention)
3. ✅ **Single concept constraint** (exactly 1)
4. ✅ **Element preservation** (logos, UI, text)
5. ✅ **Schema enforcement** (`responseSchema`)
6. ✅ **Dynamic instruction injection** (user inputs)

### Scene Variation Prompt

1. ✅ **4-step integration process** (identify, integrate, preserve)
2. ✅ **Compositing requirements** (lighting, shadows, perspective match)
3. ✅ **Image order significance** (subject first, frame second)
4. ✅ **User customization support** (additional instructions)

---

**⚠️ TEKRAR UYARI**: Bu prompt'ların herhangi bir kısmını değiştirmeden önce, değişikliğin tüm sistemik etkilerini değerlendirin. Her cümle ve kural dikkatli bir şekilde test edilmiş ve optimize edilmiştir.

**Son Güncelleme**: 2025-11-03
**Versiyon**: 1.0.0
