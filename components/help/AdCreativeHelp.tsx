import React from 'react';
import HelpSection from './HelpSection';
import { UploadIcon, SettingsIcon, VideoIcon } from '../Icons';

const AdCreativeHelp: React.FC = () => (
    <>
        <HelpSection title="Ad Creative Studio Guide">
            <p>The Ad Creative Studio enables batch video rendering using Plainly Videos API. Select a project template, configure parameters with your assets, and trigger professional video renders across multiple aspect ratios.</p>
        </HelpSection>
        <HelpSection title="Core Workflow">
            <p><strong>Step 1: Select Project</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Choose from available project templates (e.g., "4Grid & Slideshow V2", "Finger Snap Warp Slideshow")</li>
                <li>Each project has multiple aspect ratio templates (4x5, 1x1, 16x9, 9x16)</li>
                <li>Project determines which parameters you'll need to configure</li>
            </ul>
            <p><strong>Step 2: Configure Parameters</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><UploadIcon className="inline w-5 h-5" /> <strong>Upload Assets:</strong> Drag and drop or click to upload images, videos, audio, and other files</li>
                <li>Parameters are grouped by type: Images, Videos, Audio (Music/Speech), Text/Card</li>
                <li><strong>Import from Studios:</strong> Quickly import generated images from Hair, Baby, or Image Studios</li>
                <li>Text parameters can be entered directly in input fields</li>
            </ul>
            <p><strong>Step 3: Webhook Passthrough Fields</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>App Code:</strong> Select from dropdown (CFO, TCO, CHT, ARC)</li>
                <li><strong>Designer:</strong> Select from dropdown (CA, AB, NA, MK)</li>
                <li><strong>Ad Name:</strong> Enter a descriptive name for your ad</li>
                <li><strong>Code:</strong> Enter a unique identifier or tracking code</li>
                <li><strong>Template Name & Today:</strong> Auto-filled based on project and current date</li>
                <li>View JSON preview to see how fields will be sent to webhook</li>
            </ul>
            <p><strong>Step 4: Trigger Batch Render</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><VideoIcon className="inline w-5 h-5" /> <strong>Set API Key:</strong> Enter your Plainly API key (required)</li>
                <li><strong>Upload Phase:</strong> All file parameters are uploaded to Google Cloud Storage</li>
                <li><strong>Render Phase:</strong> Batch render triggered for all aspect ratio templates</li>
                <li><strong>Results:</strong> View render response with job IDs and status</li>
            </ul>
        </HelpSection>
        <HelpSection title="Tips & Best Practices">
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Navigation:</strong> Use step indicator to jump between project/parameters/passthrough sections</li>
                <li><strong>Reset:</strong> Clear all configurations and start over with Reset button</li>
                <li><strong>API Key:</strong> Your key is stored in browser session for convenience</li>
                <li><strong>Import:</strong> Import button shows count of available images from other studios</li>
                <li><strong>Preview:</strong> Check JSON preview before triggering to ensure correct data</li>
            </ul>
        </HelpSection>
        <HelpSection title="Project-Specific Parameters">
            <p><strong>4Grid & Slideshow V2:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li>16 image slots for slideshow sequences</li>
                <li>4 video segments for dynamic content</li>
                <li>Speech, music, captions, and endcard assets</li>
                <li>Original image parameter for comparison shots</li>
            </ul>
            <p><strong>Finger Snap Warp Slideshow:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li>10 image slots with corresponding depth maps</li>
                <li>2 video parameters for main content</li>
                <li>Scan color parameter (text input)</li>
                <li>Endcard video parameter</li>
            </ul>
        </HelpSection>
    </>
);

export default AdCreativeHelp;
