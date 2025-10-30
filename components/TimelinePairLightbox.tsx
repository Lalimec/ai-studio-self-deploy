/// <reference lib="dom" />
import React, { useEffect, useCallback, useState } from 'react';
import { StudioImage, TimelinePair } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, SwapIcon } from './Icons';

interface TimelinePairLightboxProps {
  pairs: TimelinePair[];
  images: StudioImage[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  onClose: () => void;
}

const TimelinePairLightbox: React.FC<TimelinePairLightboxProps> = ({ pairs, images, currentIndex, setCurrentIndex, onClose }) => {
  const [showVideo, setShowVideo] = useState(false);
  const [copyTooltip, setCopyTooltip] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const [flashingElement, setFlashingElement] = useState<string | null>(null);

  const navigate = useCallback((direction: 'next' | 'prev') => {
    const totalPairs = pairs.length;
    if (totalPairs === 0) return;
    
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % totalPairs
      : (currentIndex - 1 + totalPairs) % totalPairs;
    setCurrentIndex(nextIndex);
  }, [currentIndex, pairs.length, setCurrentIndex]);

  useEffect(() => {
    setShowVideo(false); // Reset video view when pair changes
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') navigate('next');
      if (e.key === 'ArrowLeft') navigate('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, navigate]);

  const handleCopy = (text: string, elementId: string, e: React.MouseEvent) => {
    navigator.clipboard.writeText(text);
    setFlashingElement(elementId);
    setTimeout(() => setFlashingElement(null), 600);
    setCopyTooltip({ x: e.clientX, y: e.clientY, visible: true });
    setTimeout(() => setCopyTooltip(state => state && ({ ...state, visible: false })), 1500);
  };

  if (pairs.length === 0 || currentIndex === null) return null;
  
  const currentPair = pairs[currentIndex];
  const startImage = images.find(img => img.id === currentPair.startImageId);
  const endImage = images.find(img => img.id === currentPair.endImageId);

  if (!currentPair || !startImage || !endImage) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div className="relative w-full max-w-4xl p-4 sm:p-8" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors z-20" title="Close (Esc)">
          <CloseIcon className="w-8 h-8" />
        </button>

        {currentPair.videoSrc && (
          <button onClick={() => setShowVideo(p => !p)} className="absolute top-4 right-20 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors z-20" title={showVideo ? "Show Images" : "Show Video"}>
            <SwapIcon className="w-8 h-8" />
          </button>
        )}

        {pairs.length > 1 && (
            <button onClick={() => navigate('prev')} className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors z-20" title="Previous (Left Arrow)">
                <ChevronLeftIcon className="w-8 h-8" />
            </button>
        )}

        <div className="relative group w-full max-h-[85vh] aspect-video bg-black rounded-lg shadow-2xl">
            <div className={`absolute inset-0 flex transition-opacity duration-300 ${showVideo ? 'opacity-0' : 'opacity-100'}`}>
                <img src={startImage.src} alt="Start frame" className="w-1/2 h-full object-contain" />
                <img src={endImage.src} alt="End frame" className="w-1/2 h-full object-contain" />
            </div>
             {currentPair.videoSrc && (
                <video key={currentPair.videoSrc} src={currentPair.videoSrc} autoPlay loop muted playsInline className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 pointer-events-none ${showVideo ? 'opacity-100' : 'opacity-0'}`} />
             )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-lg pointer-events-none">
                <div className="max-w-full w-[70ch] mx-auto text-left pointer-events-auto">
                    {currentPair.videoPrompt && (
                        <p className={`text-gray-300 text-sm p-1 rounded-md cursor-pointer hover:bg-white/10 ${flashingElement === 'vidprompt' ? 'animate-flash' : ''}`} onClick={(e) => handleCopy(currentPair.videoPrompt!, 'vidprompt', e)} title="Click to copy">
                            <strong className="text-cyan-400 font-semibold">Transition Prompt:</strong> {currentPair.videoPrompt}
                        </p>
                    )}
                </div>
            </div>
        </div>

        {pairs.length > 1 && (
            <button onClick={() => navigate('next')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors z-20" title="Next (Right Arrow)">
                <ChevronRightIcon className="w-8 h-8" />
            </button>
        )}
      </div>
      {copyTooltip?.visible && (
          <div className="fixed pointer-events-none bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg z-50 animate-fade-in" style={{ left: copyTooltip.x + 15, top: copyTooltip.y }}>
            Copied!
          </div>
      )}
    </div>
  );
};

export default TimelinePairLightbox;