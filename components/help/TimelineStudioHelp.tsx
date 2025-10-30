import React from 'react';
import HelpSection from './HelpSection';
import { UploadIcon, PrepareMagicIcon, VideoIcon, EyeOffIcon } from '../Icons';

const TimelineStudioHelp: React.FC = () => (
    <>
        <HelpSection title="Timeline Studio Guide">
            <p>The Timeline Studio allows you to create a single, continuous video by generating smooth transitions between a sequence of images.</p>
            <p><strong>1. Add Images:</strong> Start by importing images from other studios or uploading them from your device using the <UploadIcon className="inline w-5 h-5" /> button. All images must be cropped to the same aspect ratio to ensure smooth transitions.</p>
            <p><strong>2. Sequence Your Images:</strong> The images will appear in a sequence at the top. You can drag and drop them to reorder your timeline. Reordering may cause prompts/videos for the affected transitions to be deleted.</p>
            <p><strong>3. Set a General Instruction:</strong> Use the main text box to provide a high-level instruction for all transitions (e.g., "a slow, happy transition," "morph quickly with a flash of light"). This guides the AI for all pairs.</p>
            <p><strong>4. Prepare Prompts:</strong> Click <strong className="text-[var(--color-primary-accent)]">"Prepare All"</strong> or <strong className="text-[var(--color-primary-accent)]">"Rewrite Prompts"</strong>. The AI will analyze each pair of adjacent images and, using your general instruction, write a specific video prompt for the transition between them.</p>
            <p><strong>5. Generate Videos:</strong> Once the pairs are prepared (they'll have prompts), click <strong className="text-[var(--color-primary-accent)]">"Generate Videos"</strong>. This will create a short video clip for each transition. This can take several minutes.</p>
            <p><strong>6. Stitch & View:</strong> After all individual videos are generated, the <strong className="text-[var(--color-success-accent)]">"Stitch Videos"</strong> button will become active. Click it to combine all the clips into one final timeline video.</p>
        </HelpSection>
        <HelpSection title="Advanced Controls">
            <p><strong>Ignoring Pairs:</strong> You can temporarily disable a transition from being included in the "Generate All" or "Stitch" process by clicking the <EyeOffIcon className="inline w-5 h-5" /> icon on a pair card. This is useful for testing or excluding certain transitions without deleting them.</p>
            <p><strong>Ignore Odd/Even:</strong> The header buttons "Ignore Odd" and "Ignore Even" provide a quick way to disable every other transition. This is useful for creating a "step-by-step" effect where an image transitions, then holds, then the next transitions, etc., by generating video only for pairs 1, 3, 5... or 2, 4, 6....</p>
            <p><strong>Individual Controls:</strong> Each pair card has its own controls to edit its prompt manually, regenerate its video, or download its assets (start image, end image, video, and info file).</p>
        </HelpSection>
    </>
);

export default TimelineStudioHelp;
