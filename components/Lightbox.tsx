/// <reference lib="dom" />
import React, { useEffect, useCallback, useState } from 'react';
import { DisplayImage } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, SwapIcon } from './Icons';

interface LightboxProps {
  images: DisplayImage[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  onClose: () => void;
  // FIX: Added 'adCloner' to the mode type to allow the Lightbox to be used in the Ad Cloner studio.
  mode?: 'hairStudio' | 'videoStudio' | 'babyStudio' | 'imageStudio' | 'timelineStudio' | 'adCloner';
}

const Lightbox: React.FC<LightboxProps> = ({ images, currentIndex, setCurrentIndex, onClose, mode = 'hairStudio' }) => {
  const [copyTooltip, setCopyTooltip] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const [flashingElement, setFlashingElement] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  const navigate = useCallback((direction: 'next' | 'prev') => {
    const totalImages = images.length;
    if (totalImages === 0) return;
    
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % totalImages;
    } else {
      nextIndex = (currentIndex - 1 + totalImages) % totalImages;
    }
    setCurrentIndex(nextIndex);
  }, [currentIndex, images.length, setCurrentIndex]);

  useEffect(() => {
    // Reset video view when image changes
    setShowVideo(false);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') navigate('next');
      if (e.key === 'ArrowLeft') navigate('prev');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, navigate]);
  
  const handleCopy = (text: string, elementId: string, e: React.MouseEvent) => {
    navigator.clipboard.writeText(text);
    
    setFlashingElement(elementId);
    setTimeout(() => setFlashingElement(null), 600);
    
    setCopyTooltip({ x: e.clientX, y: e.clientY, visible: true });
    setTimeout(() => setCopyTooltip(state => state && ({ ...state, visible: false })), 1500);
  };

  if (images.length === 0 || currentIndex === null) {
    return null;
  }
  
  const currentImage = images[currentIndex];
  const title = 'hairstyle' in currentImage ? currentImage.hairstyle.name : ('description' in currentImage ? currentImage.description : currentImage.filename);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      {/* Close Button - positioned relative to viewport */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-[var(--color-text-main)] bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors z-10"
        aria-label="Close lightbox"
        title="Close (Esc)"
      >
        <CloseIcon className="w-8 h-8" />
      </button>

      {/* Swap Image/Video Button - positioned relative to viewport */}
      {currentImage.videoSrc && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowVideo(prev => !prev);
          }}
          className="absolute top-4 right-20 text-[var(--color-text-main)] bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors z-10"
          aria-label={showVideo ? "Show image" : "Show video"}
          title={showVideo ? "Show image" : "Show video"}
        >
          <SwapIcon className="w-8 h-8" />
        </button>
      )}

      {/* Previous Button - positioned relative to viewport */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('prev');
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-main)] bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors z-10"
          aria-label="Previous image"
          title="Previous image (Left Arrow)"
        >
          <ChevronLeftIcon className="w-8 h-8" />
        </button>
      )}

      {/* Next Button - positioned relative to viewport */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('next');
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-main)] bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors z-10"
          aria-label="Next image"
          title="Next image (Right Arrow)"
        >
          <ChevronRightIcon className="w-8 h-8" />
        </button>
      )}

      {/* Image & Info - centered in viewport */}
      <div
        className="relative group max-w-full max-h-full flex items-center justify-center p-4 sm:p-8"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={currentImage.src}
          alt={`Enlarged view of ${title}`}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl transition-opacity duration-300"
          style={{ opacity: showVideo ? 0 : 1 }}
        />
        {currentImage.videoSrc && (
          <video
            key={currentImage.videoSrc}
            src={currentImage.videoSrc}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-contain rounded-lg transition-opacity duration-300 pointer-events-none"
            style={{ opacity: showVideo ? 1 : 0 }}
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-lg pointer-events-none">
          <div className="max-w-full w-[70ch] mx-auto text-left pointer-events-auto">
            {'hairstyle' in currentImage && 'color' in currentImage ? (
              <p
                className={`text-[var(--color-text-light)] text-sm p-1 rounded-md cursor-pointer hover:bg-white/10 ${flashingElement === 'style' ? 'animate-flash' : ''}`}
                onClick={(e) => handleCopy(`${currentImage.hairstyle.name} (${currentImage.color})`, 'style', e)}
                title="Click to copy"
              >
                <strong className="text-[var(--color-primary-accent)] font-semibold">Style:</strong> {currentImage.hairstyle.name} ({currentImage.color})
              </p>
            ) : 'description' in currentImage && (
              <p
                className={`text-[var(--color-text-light)] text-sm p-1 rounded-md cursor-pointer hover:bg-white/10 ${flashingElement === 'style' ? 'animate-flash' : ''}`}
                onClick={(e) => handleCopy(currentImage.description, 'style', e)}
                title="Click to copy"
              >
                <strong className="text-[var(--color-primary-accent)] font-semibold">Description:</strong> {currentImage.description}
              </p>
            )}
            <p
              className={`text-[var(--color-text-light)] text-sm mt-1 p-1 rounded-md cursor-pointer hover:bg-white/10 ${flashingElement === 'filename' ? 'animate-flash' : ''}`}
              onClick={(e) => handleCopy(currentImage.filename, 'filename', e)}
              title="Click to copy"
            >
              <strong className="text-[var(--color-primary-accent)] font-semibold">Filename:</strong> <span className="break-all">{currentImage.filename}</span>
            </p>
            {'imageGenerationPrompt' in currentImage && currentImage.imageGenerationPrompt && (
              <p
                className={`text-[var(--color-text-dim)] text-xs mt-2 pt-2 border-t border-[var(--color-border-muted)] p-1 rounded-md cursor-pointer hover:bg-white/10 ${flashingElement === 'imgprompt' ? 'animate-flash' : ''}`}
                onClick={(e) => handleCopy(currentImage.imageGenerationPrompt!, 'imgprompt', e)}
                title="Click to copy"
              >
                <strong className="text-[var(--color-primary-accent)] font-semibold">Image Generation Prompt:</strong> {currentImage.imageGenerationPrompt}
              </p>
            )}
            {currentImage.videoPrompt && (
              <p
                className={`text-[var(--color-text-dim)] text-xs mt-2 pt-2 ${'imageGenerationPrompt' in currentImage && currentImage.imageGenerationPrompt ? '' : 'border-t border-[var(--color-border-muted)]'} p-1 rounded-md cursor-pointer hover:bg-white/10 ${flashingElement === 'vidprompt' ? 'animate-flash' : ''}`}
                onClick={(e) => handleCopy(currentImage.videoPrompt!, 'vidprompt', e)}
                title="Click to copy"
              >
                <strong className="text-[var(--color-primary-accent)] font-semibold">Video Prompt:</strong> {currentImage.videoPrompt}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Copy Tooltip */}
      {copyTooltip?.visible && (
        <div
          className="fixed pointer-events-none bg-[var(--color-primary)] text-[var(--color-text-on-primary)] text-xs font-bold px-2 py-1 rounded-md shadow-lg z-50 animate-fade-in"
          style={{ left: copyTooltip.x + 15, top: copyTooltip.y }}
        >
          Copied!
        </div>
      )}
    </div>
  );
};

export default Lightbox;