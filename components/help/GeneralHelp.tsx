import React from 'react';
import HelpSection from './HelpSection';
import { DownloadIcon } from '../Icons';

const GeneralHelp: React.FC = () => (
    <>
        <HelpSection title="Getting Started">
            <p>Welcome to AI Studio! This is your creative suite for transforming images with the power of AI. Switch between the different studios using the main navigation bar at the top of the page.</p>
        </HelpSection>
        <HelpSection title="Core Features">
            <p><strong>Viewing Images:</strong> Click on any generated image to open it in a larger "lightbox" view. You can navigate between images using the arrow keys or on-screen buttons.</p>
            <p><strong>Copying Information:</strong> In the lightbox view, hover over the bottom of the image to see its details, such as the prompt used to create it. Click on any piece of text (like a filename or prompt) to instantly copy it to your clipboard.</p>
            <p><strong>Downloading:</strong> Every image has a <DownloadIcon className="inline w-5 h-5 text-[var(--color-primary-accent)]" /> icon to download its files individually. Each studio also has a <strong>Download All</strong> button to get a ZIP file of all images, videos, and info from your current session.</p>
             <p><strong>Browser Permissions:</strong> When downloading multiple files or an entire session as a ZIP, your browser may ask for permission to "allow multiple downloads". Please approve this to ensure all your files are saved correctly.</p>
        </HelpSection>
    </>
);

export default GeneralHelp;