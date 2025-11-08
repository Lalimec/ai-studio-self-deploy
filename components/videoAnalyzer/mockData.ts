import { VideoAnalysis } from '../types';

// Simple 1x1 transparent pixel for placeholder frames
const placeholderFrame = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const mockVideoAnalysisData: VideoAnalysis = {
    "analysis": "## 10-Point Strategic Analysis\n\n*   **Product & Brand Identity:** The ad is for a mobile game. Research suggests it's a new IP in the fantasy RPG genre.\n*   **Thematic Context:** The ad uses a 'zero to hero' transformation trope common in mobile game advertising.\n*   **Campaign Objective:** User Acquisition.\n*   **Target Audience:** Young male gamers interested in fantasy and action RPGs.\n*   **Talent:** The ad uses CGI characters, not real actors.\n*   **Visual Style:** High-fidelity 3D animation with cinematic lighting.\n*   **Audio:** Epic orchestral music with impactful sound effects.\n*   **Messaging:** Focuses on power progression and collecting heroes.\n*   **Platform:** Likely targeted for YouTube pre-roll ads and social media feeds like Instagram.\n*   **Competitive Landscape:** The style is consistent with other major titles in the mobile RPG market.",
    "concept_approaches": "### Static Ad Concept: The Hero's Rise\n\nAdapt the key frame where the main character transforms from a novice to a powerful warrior. Use a split-screen layout to show the 'before' and 'after' states. The headline should emphasize transformation, like 'Unleash Your Power'. The CTA will be a prominent 'Play Now' button.",
    "overall_video_style_prompt": "A cinematic, high-fantasy 3D animation with dynamic camera movements, dramatic lighting, and a vibrant color palette. The style is similar to high-end game cinematics, with detailed character models and environments. Editing is fast-paced with impactful transitions.",
    "storyboard": [
        {
            "timestamp": "00:00.500",
            "description": "A novice character stands in a dark alley.",
            "visuals": "Low-key lighting, character looks weak.",
            "assets": "Novice character model, simple clothing.",
            "still_prompt": "A full shot of a young, nervous-looking character in simple clothes standing in a dark, wet alley at night. Cinematic, moody lighting.",
            "video_prompt": "A slow push-in on the character, who looks around nervously. The camera is handheld to create a sense of unease."
        },
        {
            "timestamp": "00:02.800",
            "description": "A magical item glows in front of the character.",
            "visuals": "The item emits a bright blue light, illuminating the scene.",
            "assets": "Glowing sword, character model.",
            "still_prompt": "A medium shot of the character reaching for a glowing blue sword floating in the air. The sword's light is the primary light source.",
            "video_prompt": "The character's hand reaches out and grasps the sword. As they do, a wave of energy erupts."
        },
        {
            "timestamp": "00:05.100",
            "description": "The character transforms into a powerful warrior.",
            "visuals": "Bright flashes of light, new armor appears on the character.",
            "assets": "Warrior character model, glowing armor, magical effects.",
            "still_prompt": "A heroic full shot of the character now in ornate, glowing golden armor, holding the blue sword aloft. The background is an epic, fiery landscape.",
            "video_prompt": "A fast-paced montage of the new armor appearing on the character, culminating in a heroic pose as the camera pulls back."
        }
    ]
};

export const mockExtractedFrames: string[] = [
    placeholderFrame,
    placeholderFrame,
    placeholderFrame,
];
