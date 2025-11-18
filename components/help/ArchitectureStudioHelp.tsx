import React from 'react';
import HelpSection from './HelpSection';
import { DownloadIcon, RegenerateIcon, PrepareMagicIcon, VideoIcon, TrashIcon, DepthMapIcon } from '../Icons';

const ArchitectureStudioHelp: React.FC = () => (
    <>
        <HelpSection title="Architecture Studio Guide">
            <p><strong>1. Upload & Crop:</strong> Upload a photo of an architectural space (interior, exterior, facade, garden, or landscape). Crop it to focus on the desired area.</p>
            <p><strong>2. Select Architectural Scope:</strong> Choose the type of space you're transforming (Interior Space, Building Exterior, Outer Facade, Garden/Courtyard, or Landscape/Outside).</p>
            <p><strong>3. Configure Generation Settings:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Aspect Ratio:</strong> Set the output image dimensions</li>
                <li><strong>Style Selection Mode:</strong>
                    <ul className="list-disc list-inside ml-6 space-y-1">
                        <li><em>Generate Selected Styles:</em> Creates variations for each selected style (recommended)</li>
                        <li><em>Randomize Styles:</em> Randomly picks from selected or all styles</li>
                    </ul>
                </li>
                <li><strong>Images Per Style:</strong> Number of variations to generate (1-4)</li>
            </ul>
            <p><strong>4. Choose Styles:</strong> Select specific architectural styles to apply. In "Generate Selected Styles" mode, each selected style will produce the specified number of images. Leave blank for random mix.</p>
            <p><strong>5. Additional Options:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Room/Building Type (Optional):</strong> Override auto-detection by specifying the type manually</li>
                <li><strong>Before/After View:</strong> Generate styled unfinished/before-renovation versions</li>
                <li><strong>Tidiness Level:</strong> Choose between neat/organized or lived-in appearance</li>
                <li><strong>Color Scheme:</strong> Apply specific color palettes</li>
                <li><strong>Time of Day:</strong> Change lighting conditions (dawn, golden hour, night, etc.)</li>
                <li><strong>Theme/Season:</strong> Add seasonal or holiday themes</li>
                <li><strong>Camera Angle:</strong> Preserve original angle or randomize perspective</li>
            </ul>
            <p><strong>6. Generate:</strong> Click <strong className="text-[var(--color-primary-accent)]">"Generate Architectural Styles"</strong> to transform your space, or click <strong>"Generate Unstyled Version"</strong> for a clean, unstyled render.</p>
        </HelpSection>

        <HelpSection title="Image Actions">
            <p>Hover over any generated image to access these actions:</p>
            <ul className="list-disc list-inside ml-4 space-y-2">
                <li><DownloadIcon className="inline w-5 h-5" /> <strong>Download:</strong> Saves the image with metadata (includes video and depth map if generated)</li>
                <li><RegenerateIcon className="inline w-5 h-5" /> <strong>Regenerate:</strong> Generates a new variation using your current settings</li>
                <li><PrepareMagicIcon className="inline w-5 h-5" /> <strong>Prepare for Video:</strong> Generates a descriptive prompt for animation (green checkmark when ready)</li>
                <li><VideoIcon className="inline w-5 h-5" /> <strong>Generate Video:</strong> Creates an animated video from the image (requires preparation)</li>
                <li><DepthMapIcon className="inline w-5 h-5" /> <strong>Generate Depth Map:</strong> Creates a depth map for 3D visualization and analysis</li>
                <li><TrashIcon className="inline w-5 h-5" /> <strong>Remove:</strong> Deletes the image from your gallery</li>
            </ul>
        </HelpSection>

        <HelpSection title="Header Actions">
            <p>Use the buttons above the gallery for batch operations:</p>
            <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Prepare All:</strong> Prepares all images for video generation</li>
                <li><strong>Generate Videos:</strong> Creates videos for all prepared images</li>
                <li><strong>Generate Depth Maps:</strong> Creates depth maps for all images</li>
                <li><strong>Download All:</strong> Downloads all results as a ZIP file with organized folders</li>
            </ul>
        </HelpSection>

        <HelpSection title="Style Selection Modes">
            <p><strong>Generate Selected Styles Mode (Recommended):</strong></p>
            <p className="ml-4">This mode generates specific variations for each selected style. For example, if you select "Modern", "Minimalist", and "Colonial" with "Images Per Style" set to 2, you'll get 6 total images (3 styles × 2 variations each).</p>

            <p className="mt-4"><strong>Randomize Styles Mode:</strong></p>
            <p className="ml-4">This mode randomly selects from your chosen styles (or all styles if none selected) to generate the total number of images specified. This is useful for exploring diverse options quickly.</p>
        </HelpSection>

        <HelpSection title="Tips for Best Results">
            <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Use well-lit, clear photos with minimal obstructions</li>
                <li>For interiors, capture the full room context when possible</li>
                <li>Start with "Generate Selected Styles" mode with 1-2 styles to see specific transformations</li>
                <li>Use the "Unstyled Version" button to see a clean render without stylistic changes</li>
                <li>Room/Building Type auto-detection works well, but manual override can help with unusual spaces</li>
                <li><strong>Age-Specific Rooms:</strong> Choose specific age ranges for children's rooms (Nursery 0-2, Toddler 2-5, Child 6-12, Teen 13-18) for age-appropriate design</li>
                <li><strong>Bathroom Types:</strong> Select specific bathroom types (Standard, Master, Powder Room, Children's) for better tailored results</li>
                <li>Combine time-of-day and seasonal themes for dramatic effects</li>
                <li>The "Styled Unfinished State" option shows before/during renovation states with your selected style applied</li>
                <li>Depth maps are useful for 3D visualization and understanding spatial relationships</li>
            </ul>
        </HelpSection>

        <HelpSection title="Available Scopes">
            <p>Architecture Studio supports five different types of spaces:</p>
            <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Interior Space:</strong> Rooms, hallways, and indoor areas (60+ styles from Modern to Bohemian)</li>
                <li><strong>Building Exterior:</strong> Complete building facades and outdoor views (25+ styles from Colonial to Futuristic)</li>
                <li><strong>Outer Facade:</strong> Detailed facade materials and finishes (10+ options from Glass Curtain Wall to Parametric)</li>
                <li><strong>Garden / Courtyard:</strong> Landscaped gardens and outdoor spaces (15+ styles from Formal French to Permaculture)</li>
                <li><strong>Landscape / Outside:</strong> Broader outdoor environments and settings (10+ styles from Naturalistic to Urban)</li>
            </ul>
        </HelpSection>
    </>
);

export default ArchitectureStudioHelp;
