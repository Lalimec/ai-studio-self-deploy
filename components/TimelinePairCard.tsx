/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { StudioImage, TimelinePair } from '../types';
import { CheckCircleIcon, VideoIcon, PrepareMagicIcon, TranslateIcon, DownloadIcon, EyeOffIcon, EyeIcon, AlertCircleIcon } from './Icons';

interface TimelinePairCardProps {
    startImage: StudioImage;
    endImage: StudioImage;
    pair: TimelinePair;
    aspectRatio: number;
    onUpdatePrompt: (pairId: string, newPrompt: string) => void;
    onEnhancePrompt: (pairId: string) => void;
    onTranslatePrompt: (pairId: string) => void;
    onGenerateVideo: (pairId: string) => void;
    onDownloadSingle: (pairId: string) => void;
    onCardClick: () => void;
    onToggleDisabled: (pairId: string) => void;
}

const ImagePlaceholder: React.FC<{ image: StudioImage }> = ({ image }) => (
    <div className="w-full h-full relative bg-[var(--color-bg-surface)] rounded-md overflow-hidden border border-[var(--color-border-muted)]">
        <img src={image.src} alt={image.filename} className="w-full h-full object-cover" />
    </div>
);

const TimelinePairCard: React.FC<TimelinePairCardProps> = ({
    startImage,
    endImage,
    pair,
    aspectRatio,
    onUpdatePrompt,
    onEnhancePrompt,
    onTranslatePrompt,
    onGenerateVideo,
    onDownloadSingle,
    onCardClick,
    onToggleDisabled,
}) => {
    const { id, videoPrompt, isPreparing, isGeneratingVideo, videoSrc, isDisabled, videoGenerationFailed } = pair;
    const isBusy = isPreparing || isGeneratingVideo;
    const [isHovering, setIsHovering] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    useEffect(() => {
        if (videoSrc) setIsVideoReady(false);
    }, [videoSrc]);
    
    const handleActionClick = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div className={`group relative bg-[var(--color-bg-surface-light)] p-4 rounded-xl shadow-lg border border-[var(--color-border-default)] w-full flex flex-col gap-4 transition-opacity duration-300 ${isDisabled ? 'opacity-50' : 'opacity-100'}`}>
             <div
                className="relative w-full rounded-lg overflow-hidden cursor-pointer"
                style={{ aspectRatio: aspectRatio }}
                onMouseEnter={() => videoSrc && setIsHovering(true)}
                onMouseLeave={() => videoSrc && setIsHovering(false)}
                onClick={onCardClick}
            >
                <div className="absolute inset-0 flex gap-2">
                    <ImagePlaceholder image={startImage} />
                    <ImagePlaceholder image={endImage} />
                </div>
                {videoSrc && isHovering && (
                    <div className="absolute inset-0 z-10">
                        {!isVideoReady && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-md"><div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-[var(--color-text-main)]"></div></div>}
                        <video key={videoSrc} src={videoSrc} onCanPlay={() => setIsVideoReady(true)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-5 rounded-md" style={{ opacity: isVideoReady ? 1 : 0 }} />
                    </div>
                )}
                
                {videoGenerationFailed && !isBusy && (
                    <div className="absolute inset-0 bg-red-500/30 pointer-events-none flex items-center justify-center rounded-lg" title="Video generation failed. Please try again.">
                        <AlertCircleIcon className="w-8 h-8 text-white/80" />
                    </div>
                )}

                {videoSrc && !isBusy && <div className="absolute top-2 right-2 p-1 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-primary-accent)] pointer-events-none z-20" title="Video is ready"><VideoIcon className="w-5 h-5" /></div>}
                {!videoSrc && videoPrompt && !isBusy && <div className="absolute top-2 right-2 p-1 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-success-accent)] pointer-events-none z-20" title="Prompt is ready"><CheckCircleIcon className="w-5 h-5" /></div>}
                
                <div className="absolute top-2 left-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-20">
                    <button onClick={(e) => { handleActionClick(e); onToggleDisabled(id); }} className="p-2 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all" title={isDisabled ? "Enable this pair" : "Ignore this pair"}>
                        {isDisabled ? <EyeIcon className="w-5 h-5" /> : <EyeOffIcon className="w-5 h-5" />}
                    </button>
                    <button onClick={(e) => { handleActionClick(e); onGenerateVideo(id); }} disabled={isBusy || !videoPrompt} className="p-2 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed" title={!videoPrompt ? "Write or generate a prompt first" : (videoSrc ? "Regenerate Video" : "Generate Video")}>
                        <VideoIcon className={`w-5 h-5 ${isGeneratingVideo ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={(e) => { handleActionClick(e); onDownloadSingle(id); }} disabled={isBusy || !videoSrc} className="p-2 bg-[var(--color-bg-overlay)] rounded-full text-[var(--color-text-main)] hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed" title={"Download transition files (ZIP)"}>
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="relative">
                <textarea
                    value={videoPrompt || ''}
                    onChange={(e) => onUpdatePrompt(id, e.target.value)}
                    placeholder="A prompt will be generated here..."
                    className="prompt-textarea w-full h-28 bg-[var(--color-bg-surface)] border-2 border-[var(--color-border-default)] rounded-lg p-3 pr-12 text-sm text-[var(--color-text-light)] focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] transition-colors resize-none disabled:opacity-50"
                    disabled={isBusy}
                />
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <button onClick={() => onEnhancePrompt(id)} disabled={isBusy || !videoPrompt} className="text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:opacity-50 disabled:cursor-not-allowed" title="Enhance: Refine this prompt using AI">
                        <PrepareMagicIcon className={`w-5 h-5 ${isPreparing ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => onTranslatePrompt(id)} disabled={isBusy || !videoPrompt} className="text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:opacity-50 disabled:cursor-not-allowed" title="Translate to English & Refine">
                        <TranslateIcon className={`w-5 h-5 ${isPreparing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

             {isDisabled && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10 pointer-events-none">
                    <EyeOffIcon className="w-16 h-16 text-[var(--color-text-dim)] opacity-50" />
                </div>
            )}
            
            {isBusy && (
                 <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-[var(--color-text-main)] text-xs font-semibold z-30 rounded-xl">
                    <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                    <span className="mt-2">{isPreparing ? 'Working...' : 'Making Video...'}</span>
                </div>
            )}
        </div>
    );
};

export default TimelinePairCard;