import React, { useState } from 'react';
import { PiCaretDownIcon } from '../Icons';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--color-border-default)] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left py-3 px-2 text-lg font-semibold text-[var(--color-text-light)] hover:bg-[var(--color-bg-muted-hover)]/50 transition-colors rounded-t-md"
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <PiCaretDownIcon className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="py-4 px-2 bg-black/10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
