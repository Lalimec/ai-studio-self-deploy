import React from 'react';
import HelpSection from './HelpSection';
import { PiCaretDownIcon, PiMagicWandFillIcon, PiRecycleIcon, PiTranslateIcon, PiSpinnerIcon } from '../Icons';

const ImageStudioHelp: React.FC = () => (
    <HelpSection title="Image Studio Guide">
        <p>The Image Studio is a powerful tool for batch-processing images with multiple prompts and AI models.</p>
        <p><strong>1. Upload Images:</strong> Click or drag-and-drop one or more images into the upload area. You can crop them to a consistent aspect ratio or use the originals.</p>
        <p><strong>2. Configure Model & Size:</strong> Select an AI model for generation. Each model has different strengths and sizing options:</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>Nano Banana:</strong> Fast and versatile. Best for general edits. Supports various aspect ratios.</li>
            <li><strong>Seedream Edit:</strong> High-detail model. Requires selecting an image size preset or providing custom dimensions (1024-4096px).</li>
            <li><strong>Flux Kontext:</strong> Strong at understanding complex prompts. Supports various aspect ratios.</li>
        </ul>
        <p><strong>3. Write Your Prompts:</strong> Use the slider to set how many variations (versions) you want to generate for each uploaded image. Write a unique prompt for each version.</p>
        <p><strong>Prompt Tools:</strong> Next to each prompt box, you have AI assistants:</p>
         <ul className="list-disc list-inside ml-4 space-y-2">
              <li><PiMagicWandFillIcon className="inline w-5 h-5" /> <strong>Enhance:</strong> Refines your English prompt for clarity and impact.</li>
              <li><PiRecycleIcon className="inline w-5 h-5" /> <strong>Generate Variation:</strong> Creates a creative alternative to your current prompt.</li>
              <li><PiTranslateIcon className="inline w-5 h-5" /> <strong>Enhance & Translate:</strong> Translates a non-English prompt and then enhances it.</li>
        </ul>
        <p><strong>4. Generate:</strong> Click the <strong className="text-[var(--color-primary-accent)]">"Generate Image(s)"</strong> button to start the process.</p>
        <p><strong>Results Gallery:</strong></p>
         <ul className="list-disc list-inside ml-4 space-y-2">
              <li>Failed images will appear as error boxes; you can click the <PiSpinnerIcon className="inline w-5 h-5" /> icon on them to retry.</li>
              <li>Use the header buttons to <strong>Retry All Failed</strong>, <strong>Download All</strong> successful images, or <strong>Clear the Gallery</strong>.</li>
        </ul>
        <p><strong>Advanced Options <PiCaretDownIcon className="inline w-5 h-5" />:</strong></p>
         <ul className="list-disc list-inside ml-4 space-y-2">
              <li><strong>Prepend/Append Prompt:</strong> Automatically add text to the beginning or end of every single prompt.</li>
              <li><strong>Generate Bulk Prompts:</strong> Describe what you want (e.g., "10 prompts for different fantasy armor styles") and let the AI generate a list for you.</li>
              <li><strong>Bulk Prompts (JSON):</strong> Paste in a JSON array of strings to use as your prompts, overriding the main prompt editor.</li>
              <li><strong>Filename Template:</strong> Customize how your downloaded files are named using placeholders like `&#123;set_id&#125;` and `&#123;original_filename&#125;`.</li>
        </ul>
    </HelpSection>
);

export default ImageStudioHelp;