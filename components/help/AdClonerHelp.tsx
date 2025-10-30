import React from 'react';
import HelpSection from './HelpSection';
import { SearchIcon, UploadIcon, SettingsIcon, PrepareMagicIcon } from '../Icons';

const AdClonerHelp: React.FC = () => (
    <>
        <HelpSection title="Ad Cloner Guide">
            <p>The Ad Cloner is an advanced tool for deconstructing an existing visual ad and generating a wide array of creative variations. It's perfect for A/B testing, localization, and campaign diversification.</p>
        </HelpSection>
        <HelpSection title="Core Workflow">
            <p><strong>1. Upload Assets:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Ad Image (Required):</strong> Upload the ad you want to clone. This is the foundation for all variations.</li>
                <li><strong>Subject Images (Optional):</strong> Upload up to six images of a new person or product you want to feature in the variations. If you don't provide these, the AI will synthesize new subjects.</li>
            </ul>
            <p><strong>2. Provide Context:</strong></p>
             <ul className="list-disc list-inside ml-4 space-y-1">
                <li><SearchIcon className="inline w-5 h-5" /> <strong>Research Ad:</strong> Click this to have the AI use Google Search to analyze the ad's context (brand, product, audience). This helps generate more commercially relevant variations.</li>
                <li><strong>Add Instructions:</strong> Give the AI high-level creative direction, like "target a younger audience" or "change the setting to a beach."</li>
                <li><strong>Number of Variations:</strong> Choose how many different ad concepts to generate.</li>
            </ul>
            <p><strong>3. Generate Prompts:</strong> Click <strong className="text-[var(--color-primary-accent)]">"Generate Prompts"</strong>. The AI will create a detailed "Base Prompt" describing the original ad and then generate a set of "Variation" prompts based on your inputs.</p>
            <p><strong>4. Generate & Refine Images:</strong></p>
             <ul className="list-disc list-inside ml-4 space-y-1">
                <li>On each Variation card, click <strong className="text-[var(--color-action-generate)]">"Generate Ad Image"</strong> to create the visual for that concept.</li>
                <li>Once an image is generated, a <strong>Refinement Panel</strong> appears. Type new instructions (e.g., "make the logo bigger") and optionally upload a new image (like a logo file) to fine-tune the result.</li>
                <li>Each generation and refinement is saved to an <strong>Image History</strong> tray within the card, so you can easily compare versions.</li>
            </ul>
             <p><strong>5. Get More Ideas:</strong> Use the <strong>"Get ... More Variations"</strong> button in the left panel to ask the AI for more ideas based on the entire session's history.</p>
        </HelpSection>
         <HelpSection title="Settings">
            <p>Click the <SettingsIcon className="inline w-5 h-5" /> icon in the header to open the settings modal. Here, you can switch between different AI models for text generation to balance speed and quality.</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>gemini-2.5-flash:</strong> Faster and more cost-effective, great for rapid brainstorming.</li>
                <li><strong>gemini-2.5-pro:</strong> More powerful, potentially yielding more creative or detailed prompts. (Coming Soon)</li>
            </ul>
        </HelpSection>
    </>
);

export default AdClonerHelp;