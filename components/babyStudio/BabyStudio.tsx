import React, { useState, useCallback, useEffect } from 'react';
import { BabyGenerationOptions, GeneratedBabyImage, Toast as ToastType, ParentImageState } from '../../types';
import { UploadIcon, TrashIcon, PrepareMagicIcon, VideoIcon, DownloadIcon, HelpIcon, AlertCircleIcon, CheckCircleIcon } from '../Icons';
import BabyOptionsPanel from './BabyOptionsPanel';
import ImageGrid from '../ImageGrid';
import GenerationToolbar from '../GenerationToolbar';
import { useBabyStudio } from '../../hooks/useBabyStudio';

interface BabyStudioProps {
    logic: ReturnType<typeof useBabyStudio>;
    onImageUpload: (file: File, parent: 'parent1' | 'parent2') => void;
    onRecrop: (parent: 'parent1' | 'parent2') => void;
    onImageClick: (filename: string) => void;
    onShowHelp: () => void;
    onDownloadSingle: (filename: string) => void;
}

const ParentUploader: React.FC<{ onImageUpload: (file: File) => void }> = ({ onImageUpload }) => {
    const [isDragging, setIsDragging] = useState(false);
    const handleFileChange = useCallback((file: File | null) => { if (file) onImageUpload(file); }, [onImageUpload]);
    const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }, []);
    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
    }, [handleFileChange]);

    return (
        <div className="w-full text-center">
            <div
                className={`relative flex items-center justify-center aspect-[4/5] border-2 border-dashed rounded-xl p-4 transition-colors ${isDragging ? 'border-[var(--color-primary-accent)] bg-[var(--color-bg-surface)]' : 'border-[var(--color-border-default)] hover:border-[var(--color-primary)]'}`}
                onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
            >
                <div className="flex flex-col items-center text-[var(--color-text-dim)] pointer-events-none">
                    <UploadIcon className="h-10 w-10 mb-3" />
                    <p className="text-md font-semibold text-center">Click or drag & drop</p>
                </div>
                <input id={`file-upload`} type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
            </div>
        </div>
    );
};

const CroppedParentImage: React.FC<{ 
    parent: ParentImageState, 
    onRecrop: () => void, 
    onClear: () => void, 
    isParentDataLocked: boolean,
    onPrepare: () => void,
    onGenerateVideo: () => void,
    onDownload: () => void
}> = ({ parent, onRecrop, onClear, isParentDataLocked, onPrepare, onGenerateVideo, onDownload }) => {
    const { croppedSrc, isPreparing, isGeneratingVideo, videoSrc, videoPrompt, videoGenerationFailed } = parent;
    const isThisParentBusy = isPreparing || isGeneratingVideo;
    const [isHovering, setIsHovering] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    useEffect(() => {
        if (videoSrc) setIsVideoReady(false);
    }, [videoSrc]);

    const handleActionClick = (e: React.MouseEvent) => e.stopPropagation();
    
    if (!croppedSrc) return null;

    return (
        <div className="w-full flex flex-col items-center">
            <div 
                className="relative group w-full aspect-[4/5] bg-black rounded-xl"
                onMouseEnter={() => videoSrc && setIsHovering(true)}
                onMouseLeave={() => videoSrc && setIsHovering(false)}
            >
                <img src={croppedSrc} alt={`Cropped parent photo`} className="rounded-xl shadow-lg shadow-color-[var(--color-shadow-primary)]/20 object-cover w-full h-full" />

                {videoSrc && isHovering && (
                    <div className="absolute inset-0">
                        {!isVideoReady && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-xl"><div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-[var(--color-text-main)]"></div></div>}
                        <video key={videoSrc} src={videoSrc} onCanPlay={() => setIsVideoReady(true)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-5 rounded-xl" style={{ opacity: isVideoReady ? 1 : 0 }} />
                    </div>
                )}

                {videoGenerationFailed && !isThisParentBusy && (
                    <div className="absolute inset-0 bg-red-500/30 pointer-events-none flex items-center justify-center rounded-xl" title="Video generation failed. Please try again.">
                        <AlertCircleIcon className="w-8 h-8 text-white/80" />
                    </div>
                )}

                {videoSrc && !isThisParentBusy && (
                    <div className="absolute top-2 left-2 p-1 bg-black bg-opacity-60 rounded-full text-[var(--color-primary-accent)] pointer-events-none" title="Video is ready">
                        <VideoIcon className="w-5 h-5" />
                    </div>
                )}
                {!videoSrc && videoPrompt && !isThisParentBusy && (
                    <div className="absolute top-2 left-2 p-1 bg-black bg-opacity-60 rounded-full text-[var(--color-success-accent)] pointer-events-none" title="Video prompt is ready">
                        <CheckCircleIcon className="w-5 h-5" />
                    </div>
                )}

                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                    <button onClick={onRecrop} className="bg-[var(--color-bg-surface)]/80 text-[var(--color-text-main)] py-2 px-4 rounded-md text-sm font-semibold hover:bg-black/80" disabled={isParentDataLocked || isThisParentBusy}>Recrop</button>
                </div>
                
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onClick={onClear} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" aria-label={`Remove photo`} disabled={isParentDataLocked || isThisParentBusy}><TrashIcon className="w-5 h-5" /></button>
                    <button onClick={onDownload} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" title="Download image, video, and info" disabled={isThisParentBusy}><DownloadIcon className="w-5 h-5" /></button>
                    <button onClick={onPrepare} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" title="Prepare for video" disabled={isThisParentBusy}><PrepareMagicIcon className={`w-5 h-5 ${isPreparing ? 'animate-spin' : ''}`} /></button>
                    <button onClick={onGenerateVideo} className="p-2 bg-black bg-opacity-60 rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50" title="Generate video" disabled={isThisParentBusy || !videoPrompt}><VideoIcon className={`w-5 h-5 ${isGeneratingVideo ? 'animate-spin' : ''}`} /></button>
                </div>

                {(isPreparing || isGeneratingVideo) && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-[var(--color-text-main)] text-xs font-semibold z-30 rounded-xl">
                        <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                        <span className="mt-2">{isPreparing ? 'Preparing...' : 'Making Video...'}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const BabyStudio: React.FC<BabyStudioProps> = ({
    logic, onImageUpload, onRecrop, onImageClick, onShowHelp, onDownloadSingle
}) => {
  const {
    parent1, parent2, options, setOptions, handleClearParent, handleGenerate, handleStartOver, generatedImages,
    pendingImageCount, handleRemoveGeneratedImage, handlePrepareAll,
    handleGenerateAllVideos, isPreparing, isGeneratingVideos, sessionId,
    handlePrepareSingle, handleGenerateSingleVideo,
    handlePrepareParent, handleGenerateVideoForParent, handleDownloadParent, handleDownloadAll
  } = logic;

  const isGenerateDisabled = !parent1.croppedSrc || !parent2.croppedSrc;
  const areBabyVideoActionsDisabled = isPreparing || isGeneratingVideos || pendingImageCount > 0 || generatedImages.length === 0;
  const isParentDataLocked = pendingImageCount > 0;

  return (
    <>
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 pb-28">
        <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)] flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
                {!parent1.croppedSrc ? (
                    <ParentUploader onImageUpload={(f) => onImageUpload(f, 'parent1')} />
                ) : (
                    <CroppedParentImage 
                        parent={parent1} 
                        onRecrop={() => onRecrop('parent1')} 
                        onClear={() => handleClearParent('parent1')} 
                        isParentDataLocked={isParentDataLocked}
                        onPrepare={() => handlePrepareParent('parent1')}
                        onGenerateVideo={() => handleGenerateVideoForParent('parent1')}
                        onDownload={() => handleDownloadParent('parent1')}
                    />
                )}
                 {!parent2.croppedSrc ? (
                    <ParentUploader onImageUpload={(f) => onImageUpload(f, 'parent2')} />
                ) : (
                    <CroppedParentImage 
                        parent={parent2} 
                        onRecrop={() => onRecrop('parent2')} 
                        onClear={() => handleClearParent('parent2')} 
                        isParentDataLocked={isParentDataLocked}
                        onPrepare={() => handlePrepareParent('parent2')}
                        onGenerateVideo={() => handleGenerateVideoForParent('parent2')}
                        onDownload={() => handleDownloadParent('parent2')}
                    />
                )}
            </div>
            <BabyOptionsPanel options={options} setOptions={setOptions} disabled={false} />
        </div>
        <div>
           <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={onShowHelp} className="p-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] rounded-lg text-[var(--color-text-main)] transition-colors" title="Help">
                        <HelpIcon className="w-5 h-5" />
                    </button>
                </div>
                {sessionId && <div className="inline-block bg-[var(--color-bg-muted)] text-[var(--color-text-light)] text-sm font-mono py-1.5 px-3 rounded-lg animate-fade-in truncate">Set ID: {sessionId}</div>}
               <div className="flex items-center gap-2 flex-shrink-0">
                   <button onClick={handlePrepareAll} disabled={areBabyVideoActionsDisabled} className="flex items-center gap-2 bg-[var(--color-action-prepare)] hover:bg-[var(--color-action-prepare-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface)] disabled:text-[var(--color-text-dimmer)] text-sm"><PrepareMagicIcon className={`w-4 h-4 ${isPreparing ? 'animate-spin' : ''}`} />{isPreparing ? 'Preparing...' : 'Prepare All'}</button>
                   <button onClick={handleGenerateAllVideos} disabled={areBabyVideoActionsDisabled} className="flex items-center gap-2 bg-[var(--color-action-generate)] hover:bg-[var(--color-action-generate-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface)] disabled:text-[var(--color-text-dimmer)] text-sm"><VideoIcon className={`w-4 h-4 ${isGeneratingVideos ? 'animate-spin' : ''}`} />{isGeneratingVideos ? 'Generating...' : 'Generate Videos'}</button>
                   <button onClick={handleDownloadAll} disabled={pendingImageCount > 0 || isPreparing || isGeneratingVideos || generatedImages.length === 0} className="flex items-center gap-2 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-surface)] disabled:text-[var(--color-text-dimmer)] text-sm"><DownloadIcon className="w-4 h-4" />Download All</button>
               </div>
          </div>
            {pendingImageCount > 0 && (
              <div className="mb-4 flex items-center justify-center gap-3 p-3 bg-[var(--color-bg-surface-light)] rounded-lg text-sm text-[var(--color-text-light)]">
                 <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                 <span>Generating {pendingImageCount} new image(s)... Your other actions are unlocked.</span>
              </div>
            )}
            <ImageGrid
              images={generatedImages}
              pendingCount={pendingImageCount}
              placeholderAspectRatio={4/5}
              onImageClick={onImageClick}
              onRemove={handleRemoveGeneratedImage}
              onReprepare={handlePrepareSingle}
              onDownloadSingle={onDownloadSingle}
              onGenerateSingleVideo={handleGenerateSingleVideo}
              mode="babyStudio"
            />
        </div>
    </div>

    <GenerationToolbar
        aspectRatio={options.aspectRatio}
        onAspectRatioChange={(ratio) => setOptions(prev => ({ ...prev, aspectRatio: ratio }))}
        aspectRatioDisabled={false}
        imageCount={options.imageCount}
        onImageCountChange={(count) => setOptions(prev => ({ ...prev, imageCount: count }))}
        imageCountMin={1}
        imageCountMax={12}
        imageCountDisabled={false}
        generateButtonText="Generate"
        onGenerate={handleGenerate}
        generateDisabled={isGenerateDisabled}
        pendingCount={pendingImageCount}
        startOverButtonText="Clear"
        onStartOver={handleStartOver}
        startOverDisabled={pendingImageCount > 0 || isPreparing || isGeneratingVideos}
        studioMode="baby"
    />
    </>
  );
};

export default React.memo(BabyStudio);