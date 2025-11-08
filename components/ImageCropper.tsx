import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCropperProps {
  imageSrc: string;
  onCropConfirm: (croppedImageDataUrl: string, aspectRatio: number) => void;
  onCancel: () => void;
}

const CROP_RATIOS = [
  { label: '21:9', value: 21 / 9 },
  { label: '16:9', value: 16 / 9 },
  { label: '5:4', value: 5 / 4 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '1:1', value: 1 },
  { label: '2:3', value: 2 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '4:5', value: 4 / 5 },
  { label: '9:16', value: 9 / 16 },
  { label: '9:21', value: 9 / 21 },
];

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropConfirm, onCancel }) => {
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [sliderValue, setSliderValue] = useState(0); // 0-100 for natural feeling
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(4 / 5);

  const maxScale = 3; // Reduced from 5 for more reasonable zoom range
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Convert slider value (0-100) to scale (minScale to maxScale) using exponential curve
  const sliderToScale = useCallback((slider: number): number => {
    return minScale * Math.pow(maxScale / minScale, slider / 100);
  }, [minScale]);

  // Convert scale to slider value (0-100)
  const scaleToSlider = useCallback((scaleVal: number): number => {
    if (minScale >= maxScale) return 0;
    return 100 * Math.log(scaleVal / minScale) / Math.log(maxScale / minScale);
  }, [minScale]);

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
    setSliderValue(0); // Reset slider to minimum
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

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = 0.0003; // Much slower zoom for finer control
    const newScale = scale * (1 - e.deltaY * zoomFactor);
    const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
    setScale(clampedScale);
    setSliderValue(scaleToSlider(clampedScale));
    setPosition(prev => clampPosition(prev, clampedScale));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    panStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    setIsPanning(true);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSliderValue = parseFloat(e.target.value);
    const newScale = sliderToScale(newSliderValue);
    setSliderValue(newSliderValue);
    setScale(newScale);
    setPosition(prev => clampPosition(prev, newScale));
  };

  const handleConfirm = () => {
    const image = imageRef.current;
    const container = containerRef.current;
    if (!image || !container) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
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
    
    onCropConfirm(canvas.toDataURL('image/jpeg', 0.95), aspectRatio);
  };
  
  return (
    <div
      className="fixed inset-0 bg-[var(--color-bg-base)] bg-opacity-80 flex items-center justify-center z-50 animate-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cropper-title"
    >
      <div
        className="bg-[var(--color-bg-surface)] rounded-2xl shadow-xl w-full max-w-4xl p-6 m-4 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cropper-title" className="text-2xl font-bold mb-4 text-[var(--color-primary-accent)]">Crop Your Photo</h2>
        <p className="text-[var(--color-text-dim)] mb-2">Adjust the image to fit the frame. Use your mouse wheel or the slider to zoom.</p>
        <div className="flex justify-center gap-2 mb-4 flex-wrap">
          {CROP_RATIOS.map(ratioInfo => (
              <button
                  key={ratioInfo.label}
                  onClick={() => setAspectRatio(ratioInfo.value)}
                  className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${aspectRatio === ratioInfo.value ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)]'}`}
                  title={`Set crop aspect ratio to ${ratioInfo.label}`}
              >
                  {ratioInfo.label}
              </button>
          ))}
        </div>
        <div className="w-full max-w-md flex items-center gap-4 mb-4 px-4 sm:px-0">
          <label htmlFor="zoom-slider" className="text-sm font-semibold text-[var(--color-text-light)] whitespace-nowrap">Zoom</label>
          <input
            id="zoom-slider"
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={sliderValue}
            onChange={handleSliderChange}
            className="w-full h-2 bg-[var(--color-border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
            title="Adjust image zoom"
          />
        </div>
        <div 
          ref={containerRef}
          className="relative w-full h-[60vh] max-h-[600px] bg-black rounded-lg overflow-hidden cursor-move select-none"
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
            className="absolute inset-0 m-auto border-4 border-white pointer-events-none"
            style={{ aspectRatio: aspectRatio, width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', boxShadow: `0 0 0 9999px var(--color-bg-overlay)` }}
          ></div>
        </div>
        <div className="flex gap-4 mt-6">
          <button onClick={onCancel} className="bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-main)] font-bold py-3 px-6 rounded-lg transition-colors" title="Cancel cropping and return">
            Cancel
          </button>
          <button onClick={handleConfirm} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] font-bold py-3 px-8 rounded-lg transition-colors shadow-md shadow-color-[var(--color-shadow-primary)]/30" title="Confirm the crop and continue">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;