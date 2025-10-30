/// <reference lib="dom" />
import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface ImageCropperRef {
  crop: () => string;
}

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio: number;
}

const ImageStudioCropper = forwardRef<ImageCropperRef, ImageCropperProps>(({ imageSrc, aspectRatio }, ref) => {
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  const clampPosition = useCallback((pos: { x: number; y: number }, currentScale: number) => {
    if (!containerRef.current || !imageSize.width || !imageSize.height) return { x: 0, y: 0 };
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    const cropBoxWidth = Math.min(containerWidth, containerHeight * aspectRatio);
    const cropBoxHeight = cropBoxWidth / aspectRatio;
    
    const scaledWidth = imageSize.width * currentScale;
    const scaledHeight = imageSize.height * currentScale;

    const maxX = Math.max(0, (scaledWidth - cropBoxWidth) / 2);
    const minX = -maxX;
    const maxY = Math.max(0, (scaledHeight - cropBoxHeight) / 2);
    const minY = -maxY;

    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y)),
    };
  }, [imageSize, aspectRatio]);

  const resetImageState = useCallback((currentAspectRatio: number) => {
    if (!containerRef.current || !imageSize.width || !imageSize.height) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const cropBoxWidth = Math.min(containerWidth, containerHeight * currentAspectRatio);
    const cropBoxHeight = cropBoxWidth / currentAspectRatio;
    
    const scaleX = cropBoxWidth / imageSize.width;
    const scaleY = cropBoxHeight / imageSize.height;
    const newMinScale = Math.max(scaleX, scaleY);
    
    setMinScale(newMinScale);
    setScale(newMinScale);
    setPosition({ x: 0, y: 0 });
  }, [imageSize.width, imageSize.height]);
  
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [imageSrc]);

  useEffect(() => {
    if (imageSize.width > 0 && containerRef.current) {
      resetImageState(aspectRatio);
    }
  }, [imageSize, aspectRatio, resetImageState]);

  useEffect(() => {
    const handleResize = () => {
      if (imageSize.width > 0 && containerRef.current) {
        resetImageState(aspectRatio);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [aspectRatio, imageSize, resetImageState]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
        const newPos = {
            x: e.clientX - panStartRef.current.x,
            y: e.clientY - panStartRef.current.y,
        };
        setPosition(currentPos => clampPosition(newPos, scale));
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    if (isPanning) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, scale, clampPosition]);

  useImperativeHandle(ref, () => ({
    crop: () => {
        const image = imageRef.current;
        const container = containerRef.current;
        if (!image || !container) {
            throw new Error("Cropper is not ready.");
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("Could not get canvas context.");
        }
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const cropBoxWidth = Math.min(containerWidth, containerHeight * aspectRatio);
        const cropBoxHeight = cropBoxWidth / aspectRatio;
        
        const sourceScale = scale;
        const sourceX = (image.naturalWidth / 2) - (position.x / sourceScale) - (cropBoxWidth / (2 * sourceScale));
        const sourceY = (image.naturalHeight / 2) - (position.y / sourceScale) - (cropBoxHeight / (2 * sourceScale));
        const sourceWidth = cropBoxWidth / sourceScale;
        const sourceHeight = cropBoxHeight / sourceScale;
        
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;

        ctx.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            sourceWidth,
            sourceHeight
        );
        
        return canvas.toDataURL('image/jpeg', 0.95);
    },
  }));

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = 0.001; // Controls sensitivity
    const newScale = scale * (1 - e.deltaY * zoomFactor);
    const clampedScale = Math.max(minScale, Math.min(5, newScale));
    setScale(clampedScale);
    setPosition(prev => clampPosition(prev, clampedScale));
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    panStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    setIsPanning(true);
  };
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(e.target.value);
    setScale(newScale);
    setPosition(prev => clampPosition(prev, newScale));
  };
  
  return (
    <div className="w-full aspect-square flex flex-col items-center bg-[var(--color-bg-surface-light)] border border-[var(--color-border-default)] rounded-lg shadow-sm p-2 gap-2">
        <div 
          ref={containerRef}
          className="relative w-full h-full bg-black rounded-md overflow-hidden cursor-move select-none"
          onMouseDown={handleMouseDown}
          onWheelCapture={handleWheel}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="To be cropped"
            className="max-w-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: `-${imageSize.width/2}px`,
              marginTop: `-${imageSize.height/2}px`,
            }}
          />
          <div 
            className="absolute inset-0 m-auto border-2 border-white/80 pointer-events-none"
            style={{ 
              aspectRatio: aspectRatio, 
              width: 'auto', 
              height: 'auto', 
              maxWidth: '100%', 
              maxHeight: '100%', 
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' 
            }}
          ></div>
        </div>
        <div className="w-full flex items-center gap-2">
            <label htmlFor={`zoom-slider-${imageSrc}`} className="text-xs font-medium text-[var(--color-text-dim)] whitespace-nowrap">Zoom</label>
            <input
                id={`zoom-slider-${imageSrc}`}
                type="range"
                min={minScale}
                max={5}
                step={0.01}
                value={scale}
                onChange={handleSliderChange}
                className="w-full h-1.5 bg-[var(--color-bg-muted-hover)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                title="Adjust image zoom"
            />
        </div>
    </div>
  );
});

export default ImageStudioCropper;