import React, { useState, useEffect } from 'react';
import { DownloadIcon, RegenerateIcon, TrashIcon, PrepareMagicIcon, CheckCircleIcon, VideoIcon, HairStudioIcon, BabyIcon, ArchitectureStudioIcon, AlertCircleIcon, DepthMapIcon } from './Icons';
import { DisplayImage } from '../types';

interface ImageGridProps {
  images: DisplayImage[];
  pendingCount: number;
  placeholderAspectRatio: number;
  onImageClick: (id: string) => void;
  onRegenerate?: (id: string) => void;
  onRemove: (id: string) => void;
  onReprepare: (id: string) => void;
  onDownloadSingle: (id: string) => void;
  onGenerateSingleVideo: (id: string) => void;
  onGenerateDepthMap?: (id: string) => void;
  mode?: 'hairStudio' | 'videoStudio' | 'babyStudio' | 'architectureStudio';
}

const ImageCard: React.FC<Omit<ImageGridProps, 'images' | 'pendingCount' | 'placeholderAspectRatio'> & { image: DisplayImage }> = ({
  image,
  onImageClick,
  onRegenerate,
  onRemove,
  onReprepare,
  onDownloadSingle,
  onGenerateSingleVideo,
  onGenerateDepthMap,
  mode = 'hairStudio',
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const { src, filename, isPreparing, videoPrompt, videoSrc, isGeneratingVideo } = image;
  const isRegenerating = 'isRegenerating' in image && image.isRegenerating;
  const videoGenerationFailed = 'videoGenerationFailed' in image && image.videoGenerationFailed;
  const depthMapSrc = 'depthMapSrc' in image ? image.depthMapSrc : undefined;
  const isGeneratingDepthMap = 'isGeneratingDepthMap' in image && image.isGeneratingDepthMap;
  const depthMapGenerationFailed = 'depthMapGenerationFailed' in image && image.depthMapGenerationFailed;
  const isBusy = isRegenerating || isPreparing || isGeneratingVideo || isGeneratingDepthMap;
  
  const title = 'hairstyle' in image
    ? image.hairstyle.name
    : ('description' in image
      ? image.description
      : ('style' in image
        ? image.style
        : image.filename));
  const color = 'color' in image ? image.color : 'N/A';
  
  const uniqueId = 'id' in image ? image.id : image.filename;

  useEffect(() => {
    if (videoSrc) {
      setIsVideoReady(false);
    }
  }, [videoSrc]);

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening lightbox from any action button
  };

  const videoButtonTitle = !videoPrompt
    ? "Prepare image first to generate video"
    : videoSrc
      ? "Regenerate video"
      : "Generate video";
      
  const downloadButtonTitle = videoSrc 
    ? "Download image, info file, and video"
    : "Download image and info file";
      
  return (
    <div
      className="group relative bg-[var(--color-bg-surface)] rounded-lg overflow-hidden shadow-lg shadow-color-[var(--color-shadow-primary)]/10 animate-fade-in"
      onMouseEnter={() => videoSrc && setIsHovering(true)}
      onMouseLeave={() => videoSrc && setIsHovering(false)}
    >
      <button onClick={() => onImageClick(uniqueId)} className="w-full h-full block" aria-label={`View larger image of ${title}`} title="Click to view a larger version">
        <img
          src={src}
          alt={`Generated image: ${title}`}
          className="w-full h-auto object-cover block"
        />
        {videoSrc && isHovering && (
          <div className="absolute inset-0">
            {!isVideoReady && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-[var(--color-text-main)]"></div>
              </div>
            )}
            <video
              key={videoSrc} // Re-mount video if src changes, re-triggering onCanPlay
              src={videoSrc}
              onCanPlay={() => setIsVideoReady(true)}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-5"
              style={{ opacity: isVideoReady ? 1 : 0 }}
            />
          </div>
        )}
        {videoGenerationFailed && !isBusy && (
            <div className="absolute inset-0 bg-red-500/30 pointer-events-none flex items-center justify-center" title="Video generation failed. Please try again.">
                <AlertCircleIcon className="w-8 h-8 text-white/80" />
            </div>
        )}
      </button>

      {videoSrc && !isBusy && (
        <div className="absolute top-2 left-2 p-1 bg-black bg-opacity-60 rounded-full text-[var(--color-primary-accent)] pointer-events-none" title="Video is ready">
          <VideoIcon className="w-5 h-5" />
        </div>
      )}
      {!videoSrc && videoPrompt && !isBusy && (
        <div className="absolute top-2 left-2 p-1 bg-black bg-opacity-60 rounded-full text-[var(--color-success-accent)] pointer-events-none" title="Video prompt is ready">
          <CheckCircleIcon className="w-5 h-5" />
        </div>
      )}
      {depthMapSrc && !isBusy && mode === 'architectureStudio' && (
        <div className="absolute top-14 left-2 p-1 bg-black bg-opacity-60 rounded-full text-[var(--color-info-accent)] pointer-events-none" title="Depth map is ready">
          <DepthMapIcon className="w-5 h-5" />
        </div>
      )}

      <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-20">
        <button
          onClick={(e) => { handleActionClick(e); onDownloadSingle(uniqueId); }}
          className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all"
          aria-label={downloadButtonTitle}
          title={downloadButtonTitle}
        >
          <DownloadIcon className="w-5 h-5" />
        </button>
        {mode === 'hairStudio' && onRegenerate && (
            <button
              onClick={(e) => { handleActionClick(e); onRegenerate(uniqueId); }}
              className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50"
              aria-label="Generate a new random style using the current filters"
              title="Generate a new random style"
              disabled={isBusy}
            >
              <RegenerateIcon className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
            </button>
        )}
        {mode === 'architectureStudio' && onRegenerate && (
            <button
              onClick={(e) => { handleActionClick(e); onRegenerate(uniqueId); }}
              className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50"
              aria-label="Generate a new variation using the current filters"
              title="Generate a new variation"
              disabled={isBusy}
            >
              <RegenerateIcon className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
            </button>
        )}
        <button
          onClick={(e) => { handleActionClick(e); onReprepare(uniqueId); }}
          className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50"
          aria-label={videoPrompt ? 'Re-prepare for video' : 'Prepare for video'}
          title={videoPrompt ? 'Re-prepare for video' : 'Prepare for video'}
          disabled={isBusy}
        >
          <PrepareMagicIcon className={`w-5 h-5 ${isPreparing ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={(e) => { handleActionClick(e); onGenerateSingleVideo(uniqueId); }}
          className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={videoButtonTitle}
          title={videoButtonTitle}
          disabled={!videoPrompt || isBusy}
        >
          <VideoIcon className={`w-5 h-5 ${isGeneratingVideo ? 'animate-spin' : ''}`} />
        </button>
        {mode === 'architectureStudio' && onGenerateDepthMap && (
          <button
            onClick={(e) => { handleActionClick(e); onGenerateDepthMap(uniqueId); }}
            className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50"
            aria-label={depthMapSrc ? 'Regenerate depth map' : 'Generate depth map'}
            title={depthMapSrc ? 'Regenerate depth map' : 'Generate depth map'}
            disabled={isBusy}
          >
            <DepthMapIcon className={`w-5 h-5 ${isGeneratingDepthMap ? 'animate-spin' : ''}`} />
          </button>
        )}
        <button
          onClick={(e) => { handleActionClick(e); onRemove(uniqueId); }}
          className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50"
          aria-label="Remove this image from the gallery"
          title="Remove this image"
          disabled={isBusy}
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      {isBusy && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-[var(--color-text-main)] text-xs font-semibold z-30">
          <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
          <span className="mt-2">
            {isRegenerating && 'Regenerating...'}
            {isPreparing && 'Preparing...'}
            {isGeneratingVideo && 'Making Video...'}
          </span>
        </div>
      )}
    </div>
  );
};


const ImageGrid: React.FC<ImageGridProps> = ({ 
  images, 
  pendingCount, 
  placeholderAspectRatio, 
  mode = 'hairStudio',
  ...props
}) => {
  const placeholders = Array.from({ length: pendingCount }, (_, i) => i);
  
  if (images.length === 0 && pendingCount === 0) {
      const EmptyState = () => {
          let icon, title, description;
          if (mode === 'hairStudio') {
              icon = <HairStudioIcon className="mx-auto h-24 w-24 text-[var(--color-border-default)] opacity-75"/>;
              title = "Style Gallery Awaits";
              description = "Use the panel on the left to generate some styles!";
          } else if (mode === 'babyStudio') {
              icon = <BabyIcon className="mx-auto h-24 w-24 text-[var(--color-border-default)] opacity-75"/>;
              title = "Family Album is Empty";
              description = "Upload photos for both parents and click Generate!";
          } else if (mode === 'architectureStudio') {
              icon = <ArchitectureStudioIcon className="mx-auto h-24 w-24 text-[var(--color-border-default)] opacity-75"/>;
              title = "Design Gallery Empty";
              description = "Upload an architectural photo and select styles to begin!";
          } else {
              // Fallback for video studio or other modes.
              icon = <VideoIcon className="mx-auto h-24 w-24 text-[var(--color-border-default)] opacity-75"/>;
              title = "The gallery is empty.";
              description = "Your generated images will appear here.";
          }

          return (
             <div className="col-span-full flex flex-col items-center justify-center text-center p-10 rounded-lg min-h-[500px]">
                <div className="text-center">
                    {icon}
                    <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-light)]">{title}</h3>
                    <p className="mt-1 text-sm text-[var(--color-text-dimmer)]">{description}</p>
                </div>
            </div>
          )
      }
      return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
      {placeholders.map((_, index) => (
         <div key={`placeholder-${index}`} className="w-full bg-[var(--color-bg-muted)] rounded-lg shadow-lg animate-pulse" style={{ aspectRatio: placeholderAspectRatio }}></div>
      ))}
      {images.map((image) => (
        <ImageCard 
            key={'id' in image ? image.id : image.filename}
            image={image}
            mode={mode}
            {...props}
        />
      ))}
    </div>
  );
};

export default ImageGrid;