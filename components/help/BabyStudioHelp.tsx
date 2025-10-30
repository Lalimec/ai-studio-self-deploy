import React from 'react';
import HelpSection from './HelpSection';
import { PrepareMagicIcon, VideoIcon } from '../Icons';
import { 
    BABY_AGES, BABY_COMPOSITIONS, BABY_BACKGROUNDS, BABY_CLOTHING_STYLES_UNISEX, 
    BABY_CLOTHING_STYLES_BOY, BABY_CLOTHING_STYLES_GIRL, BABY_ACTIONS 
} from '../../constants';
import CollapsibleSection from './CollapsibleSection';

interface BabyStudioHelpProps {
    ages: typeof BABY_AGES;
    compositions: typeof BABY_COMPOSITIONS;
    backgrounds: typeof BABY_BACKGROUNDS;
    clothingUnisex: typeof BABY_CLOTHING_STYLES_UNISEX;
    clothingBoy: typeof BABY_CLOTHING_STYLES_BOY;
    clothingGirl: typeof BABY_CLOTHING_STYLES_GIRL;
    actions: typeof BABY_ACTIONS;
}

const CategoryList: React.FC<{ categories: { name: string; options: { name: string }[] }[] }> = ({ categories }) => (
    <div className="space-y-4">
        {categories.map(cat => (
            <div key={cat.name}>
                <p className="font-bold text-[var(--color-text-light)]">{cat.name}</p>
                <ul className="list-disc list-inside ml-4 text-sm text-[var(--color-text-dim)] grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    {cat.options.map(opt => <li key={opt.name}>{opt.name}</li>)}
                </ul>
            </div>
        ))}
    </div>
);

const BabyStudioHelp: React.FC<BabyStudioHelpProps> = (props) => (
     <>
        <HelpSection title="Baby Studio Guide">
            <p><strong>1. Upload Parents:</strong> Upload clear, forward-facing photos for both 'Parent 1' and 'Parent 2'.</p>
            <p><strong>2. Crop:</strong> Adjust each photo to focus on the parent's face. The AI will analyze these cropped images.</p>
            <p><strong>3. Configure:</strong> Select the desired age, gender, composition, and other scene details. If you leave a category blank, options will be chosen randomly from all possibilities.</p>
            <p><strong>4. Generate:</strong> Click <strong className="text-[var(--color-primary-accent)]">"Generate Baby Photos"</strong> to see what your future baby might look like.</p>
            <p><strong>Video Generation:</strong> Like the Hair Studio, you can prepare images with <PrepareMagicIcon className="inline w-5 h-5" /> and generate short videos with <VideoIcon className="inline w-5 h-5" />. Use the header buttons to process all images at once.</p>
        </HelpSection>
        <HelpSection title="Available Options">
            <p>This section lists all the possible randomized options available within the Baby Studio. Click to expand each category.</p>
            <div className="mt-4 border border-[var(--color-border-default)] rounded-lg overflow-hidden">
                <CollapsibleSection title="Ages">
                    <ul className="list-disc list-inside ml-4 text-sm text-[var(--color-text-dim)]">
                        {props.ages.map(age => <li key={age.id}>{age.name}</li>)}
                    </ul>
                </CollapsibleSection>
                <CollapsibleSection title="Compositions">
                    <CategoryList categories={props.compositions} />
                </CollapsibleSection>
                <CollapsibleSection title="Backgrounds">
                    <CategoryList categories={props.backgrounds} />
                </CollapsibleSection>
                <CollapsibleSection title="Clothing Styles">
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-md font-semibold text-[var(--color-text-main)] mb-2">Unisex Clothing</h4>
                            <CategoryList categories={props.clothingUnisex} />
                        </div>
                        <div>
                            <h4 className="text-md font-semibold text-[var(--color-text-main)] mb-2">Boy's Clothing</h4>
                            <CategoryList categories={props.clothingBoy} />
                        </div>
                        <div>
                            <h4 className="text-md font-semibold text-[var(--color-text-main)] mb-2">Girl's Clothing</h4>
                            <CategoryList categories={props.clothingGirl} />
                        </div>
                    </div>
                </CollapsibleSection>
                <CollapsibleSection title="Actions & Expressions">
                    <CategoryList categories={props.actions} />
                </CollapsibleSection>
            </div>
        </HelpSection>
    </>
);

export default BabyStudioHelp;
