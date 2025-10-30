import React from 'react';
import { HairstyleCategory, Beard, Accessory } from '../../types';
import HelpSection from './HelpSection';
import { DownloadIcon, RegenerateIcon, PrepareMagicIcon, VideoIcon, TrashIcon } from '../Icons';
import CollapsibleSection from './CollapsibleSection';

interface HairStudioHelpProps {
  maleCategories: HairstyleCategory[];
  femaleCategories: HairstyleCategory[];
  avantGardeCategory: HairstyleCategory;
  maleBeards: Beard[];
  femaleAccessories: Accessory[];
  hairColors: string[];
  boldHairColors: string[];
  complexNaturalHairColors: string[];
  multicolorBoldHairColors: string[];
}

const HairStudioHelp: React.FC<HairStudioHelpProps> = (props) => (
    <>
        <HelpSection title="Hair Studio Guide">
            <p><strong>1. Upload & Crop:</strong> Start by uploading a clear, forward-facing photo. Crop it to focus on the face for the best results.</p>
            <p><strong>2. Configure:</strong> Use the left-hand panel to select hairstyle categories, colors, poses, and other options. If you don't select any hairstyle category, a random mix from all available styles will be used.</p>
            <p><strong>3. Generate:</strong> Click <strong className="text-[var(--color-primary-accent)]">"Generate My Styles"</strong> to see your new looks.</p>
            <p><strong>Image Actions (on hover):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li><DownloadIcon className="inline w-5 h-5" /> <strong>Download:</strong> Saves the image and a text file with its prompt info.</li>
              <li><RegenerateIcon className="inline w-5 h-5" /> <strong>Regenerate:</strong> Generates a new random style using your current filters.</li>
              <li><PrepareMagicIcon className="inline w-5 h-5" /> <strong>Prepare for Video:</strong> Creates a descriptive prompt needed to animate this image. A green checkmark appears when ready.</li>
              <li><VideoIcon className="inline w-5 h-5" /> <strong>Generate Video:</strong> Animates the image based on its generated prompt. (Requires preparation first).</li>
              <li><TrashIcon className="inline w-5 h-5" /> <strong>Remove:</strong> Deletes the image from your gallery.</li>
            </ul>
             <p><strong>Header Actions:</strong> Use the buttons above the gallery to <strong>Prepare All</strong> images for video, <strong>Generate All Videos</strong> for prepared images, or <strong>Download All</strong> results as a ZIP file.</p>
        </HelpSection>
        <HelpSection title="Available Styles & Colors">
            <p>This section lists all the possible randomized options available within the Hair Studio. Click to expand each category.</p>
             <div className="mt-4 border border-[var(--color-border-default)] rounded-lg overflow-hidden">
                <CollapsibleSection title="Female Styles">
                    <div className="space-y-4">
                        {props.femaleCategories.map(cat => (
                            <div key={`f-${cat.name}`}>
                                <p className="font-bold text-[var(--color-text-light)]">{cat.name}</p>
                                <ul className="list-disc list-inside ml-4 text-sm text-[var(--color-text-dim)] grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                                    {cat.styles.map(style => <li key={style.id}>{style.name}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                </CollapsibleSection>
                <CollapsibleSection title="Male Styles">
                    <div className="space-y-4">
                        {props.maleCategories.map(cat => (
                            <div key={`m-${cat.name}`}>
                                <p className="font-bold text-[var(--color-text-light)]">{cat.name}</p>
                                <ul className="list-disc list-inside ml-4 text-sm text-[var(--color-text-dim)] grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                                    {cat.styles.map(style => <li key={style.id}>{style.name}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                </CollapsibleSection>
                <CollapsibleSection title="Avant-Garde Styles">
                    <div>
                        <p className="font-bold text-[var(--color-text-light)]">{props.avantGardeCategory.name}</p>
                        <ul className="list-disc list-inside ml-4 text-sm text-[var(--color-text-dim)] grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                            {props.avantGardeCategory.styles.map(style => <li key={style.id}>{style.name}</li>)}
                        </ul>
                    </div>
                </CollapsibleSection>
                <CollapsibleSection title="Hair Colors">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-md font-semibold text-[var(--color-text-main)] mb-2">Natural Colors</h4>
                            <ul className="list-disc list-inside ml-4 text-sm text-[var(--color-text-dim)] capitalize">
                                {props.hairColors.map(c => <li key={c}>{c}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-md font-semibold text-[var(--color-text-main)] mb-2">Bold Colors</h4>
                            <ul className="list-disc list-inside ml-4 text-sm text-[var(--color-text-dim)] capitalize">
                                {props.boldHairColors.map(c => <li key={c}>{c}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-md font-semibold text-[var(--color-text-main)] mb-2">Complex Natural</h4>
                            <ul className="list-disc list-inside ml-4 text-sm text-[var(--color-text-dim)] capitalize">
                                {props.complexNaturalHairColors.map(c => <li key={c}>{c}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-md font-semibold text-[var(--color-text-main)] mb-2">Multicolor Bold</h4>
                            <ul className="list-disc list-inside ml-4 text-sm text-[var(--color-text-dim)] capitalize">
                                {props.multicolorBoldHairColors.map(c => <li key={c}>{c}</li>)}
                            </ul>
                        </div>
                    </div>
                </CollapsibleSection>
                 <CollapsibleSection title="Accessories & Facial Hair">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-md font-semibold text-[var(--color-text-main)] mb-2">Female Accessories</h4>
                            <ul className="list-disc list-inside ml-4 text-sm text-[var(--color-text-dim)]">
                                {props.femaleAccessories.filter(a => a.id !== 'a_none').map(a => <li key={a.id}>{a.name}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-md font-semibold text-[var(--color-text-main)] mb-2">Male Facial Hair</h4>
                            <ul className="list-disc list-inside ml-4 text-sm text-[var(--color-text-dim)]">
                                {props.maleBeards.filter(b => b.id !== 'b_none').map(b => <li key={b.id}>{b.name}</li>)}
                            </ul>
                        </div>
                    </div>
                </CollapsibleSection>
            </div>
        </HelpSection>
    </>
);

export default HairStudioHelp;
