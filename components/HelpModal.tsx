import React, { useEffect, useState } from 'react';
import { HairstyleCategory, Beard, Accessory } from '../types';
import { 
    BABY_AGES, BABY_COMPOSITIONS, BABY_BACKGROUNDS, BABY_CLOTHING_STYLES_UNISEX, 
    BABY_CLOTHING_STYLES_BOY, BABY_CLOTHING_STYLES_GIRL, BABY_ACTIONS 
} from '../constants';
import { CloseIcon, HairStudioIcon, BabyIcon, ImageStudioIcon, VideoStudioIcon, HelpIcon, TimelineStudioIcon, AdClonerIcon, ArchitectureStudioIcon } from './Icons';

import GeneralHelp from './help/GeneralHelp';
import HairStudioHelp from './help/HairStudioHelp';
import BabyStudioHelp from './help/BabyStudioHelp';
import ImageStudioHelp from './help/ImageStudioHelp';
import VideoStudioHelp from './help/VideoStudioHelp';
import TimelineStudioHelp from './help/TimelineStudioHelp';
import AdClonerHelp from './help/AdClonerHelp';
import ArchitectureStudioHelp from './help/ArchitectureStudioHelp';

interface HelpModalProps {
  onClose: () => void;
  // Hair Studio Props
  maleCategories: HairstyleCategory[];
  femaleCategories: HairstyleCategory[];
  avantGardeCategory: HairstyleCategory;
  maleBeards: Beard[];
  femaleAccessories: Accessory[];
  hairColors: string[];
  boldHairColors: string[];
  complexNaturalHairColors: string[];
  multicolorBoldHairColors: string[];
  // Baby Studio Props
  babyAges: typeof BABY_AGES;
  babyCompositions: typeof BABY_COMPOSITIONS;
  babyBackgrounds: typeof BABY_BACKGROUNDS;
  babyClothingUnisex: typeof BABY_CLOTHING_STYLES_UNISEX;
  babyClothingBoy: typeof BABY_CLOTHING_STYLES_BOY;
  babyClothingGirl: typeof BABY_CLOTHING_STYLES_GIRL;
  babyActions: typeof BABY_ACTIONS;
}

type HelpTab = 'general' | 'hair' | 'baby' | 'architecture' | 'image' | 'adCloner' | 'video' | 'timeline';

const TabButton: React.FC<{
    name: HelpTab;
    label: string;
    icon: React.ReactNode;
    activeTab: HelpTab;
    setActiveTab: (tab: HelpTab) => void;
}> = ({ name, label, icon, activeTab, setActiveTab }) => (
    <button
        onClick={() => setActiveTab(name)}
        className={`flex items-center gap-2.5 px-4 py-3 font-semibold text-sm rounded-t-lg border-b-2 transition-all ${
            activeTab === name
                ? 'text-[var(--color-primary-accent)] border-[var(--color-primary-accent)]'
                : 'text-[var(--color-text-dim)] border-transparent hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)]/50'
        }`}
        role="tab"
        aria-selected={activeTab === name}
    >
        {icon}
        {label}
    </button>
);

const HelpModal: React.FC<HelpModalProps> = (props) => {
  const { onClose, ...helpProps } = props;
  const [activeTab, setActiveTab] = useState<HelpTab>('general');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-[var(--color-bg-base)] bg-opacity-80 flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-bg-surface)] rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col m-4" 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-[var(--color-border-muted)] flex-shrink-0">
          <h2 className="text-2xl font-bold text-[var(--color-text-main)]">AI Studio Help</h2>
          <button onClick={onClose} className="p-1 rounded-full text-[var(--color-text-dim)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-main)] transition-colors" aria-label="Close help" title="Close help">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <nav className="flex-shrink-0 border-b border-[var(--color-border-muted)] px-4 flex flex-wrap" role="tablist">
            <TabButton name="general" label="General" icon={<HelpIcon className="w-5 h-5" />} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton name="hair" label="Hair Studio" icon={<HairStudioIcon className="w-5 h-5" />} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton name="baby" label="Baby Studio" icon={<BabyIcon className="w-5 h-5" />} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton name="architecture" label="Architecture" icon={<ArchitectureStudioIcon className="w-5 h-5" />} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton name="image" label="Image Studio" icon={<ImageStudioIcon className="w-5 h-5" />} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton name="adCloner" label="Ad Cloner" icon={<AdClonerIcon className="w-5 h-5" />} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton name="video" label="Video Studio" icon={<VideoStudioIcon className="w-5 h-5" />} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton name="timeline" label="Timeline" icon={<TimelineStudioIcon className="w-5 h-5" />} activeTab={activeTab} setActiveTab={setActiveTab} />
        </nav>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
            {activeTab === 'general' && <GeneralHelp />}
            {activeTab === 'hair' && <HairStudioHelp {...helpProps} />}
            {activeTab === 'baby' && <BabyStudioHelp
                ages={helpProps.babyAges}
                compositions={helpProps.babyCompositions}
                backgrounds={helpProps.babyBackgrounds}
                clothingUnisex={helpProps.babyClothingUnisex}
                clothingBoy={helpProps.babyClothingBoy}
                clothingGirl={helpProps.babyClothingGirl}
                actions={helpProps.babyActions}
            />}
            {activeTab === 'architecture' && <ArchitectureStudioHelp />}
            {activeTab === 'image' && <ImageStudioHelp />}
            {activeTab === 'adCloner' && <AdClonerHelp />}
            {activeTab === 'video' && <VideoStudioHelp />}
            {activeTab === 'timeline' && <TimelineStudioHelp />}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;