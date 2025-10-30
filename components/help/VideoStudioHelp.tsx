import React from 'react';
import HelpSection from './HelpSection';
import { UploadIcon, PrepareMagicIcon, TranslateIcon, VideoIcon } from '../Icons';

const VideoStudioHelp: React.FC = () => (
     <HelpSection title="Video Studio Guide">
        <p>The Video Studio is your workspace for animating images from any source.</p>
        <p><strong>1. Add Images:</strong> You can add images in three ways:</p>
        <ul className="list-disc list-inside ml-4 mt-2">
            <li>Import your results from the <strong>Hair Studio</strong>.</li>
            <li>Import your results from the <strong>Baby Studio</strong>.</li>
            <li>Import your results from the <strong>Image Studio</strong>.</li>
            <li>Import your results from the <strong>Ad Cloner Studio</strong>.</li>
            <li>Upload your own custom images from your device using the <UploadIcon className="inline w-5 h-5" /> button.</li>
        </ul>
        <p><strong>2. Create a Video Prompt:</strong> Each image needs a prompt (a short description of the animation) to be turned into a video. You have several tools for this:</p>
        <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
          <li><strong>Write Manually:</strong> Type your desired animation directly into the text box below an image.</li>
          <li><PrepareMagicIcon className="inline w-5 h-5" /> <strong>Generate (on image):</strong> Click the magic wand on the image itself. The AI will analyze the image and create a new prompt for you from scratch.</li>
          <li><PrepareMagicIcon className="inline w-5 h-5" /> <strong>Enhance (in text box):</strong> After writing a prompt, click the magic wand in the text box. The AI will refine and improve your text.</li>
          <li><TranslateIcon className="inline w-5 h-5" /> <strong>Translate:</strong> Translates non-English prompts and refines them for the model.</li>
        </ul>
        <p><strong>3. Generate Video:</strong> Once an image has a prompt, it will get a green checkmark. Click the <VideoIcon className="inline w-5 h-5" /> icon on the image to generate its video. This can take a few minutes. You can also generate multiple videos at once by clicking <strong>Generate All</strong> in the header.</p>
    </HelpSection>
);

export default VideoStudioHelp;