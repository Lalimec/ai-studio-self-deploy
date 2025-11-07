import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { StoryboardScene, VideoAnalyzerSettings } from '../../types';
import { PrepareMagicIcon, DownloadIcon, CopyIcon } from '../Icons';
import { parseTimestamp, formatTimeWithMS } from '../../services/videoAnalyzerService';
import SinglePromptEditor from '../SinglePromptEditor';

interface StoryboardCardProps {
    storyboard: StoryboardScene[];
    onTimestampClick: (timeInSeconds: number) => void;
    extractedFrames: (string | null)[];
    isExtractingFrames: boolean;
    loadingFrames: Set<number>;
    onGenerateScene: (index: number | 'all') => void;
    generatingScene: number | 'all' | null;
    settings: VideoAnalyzerSettings;
    onUpdateScenePrompt: (sceneIndex: number, promptType: 'still_prompt' | 'video_prompt', newText: string) => void;
    onDownloadScene: (sceneIndex: number) => void;
    onImageClick: (src: string) => void;
    videoAspectRatio: number | null;
    onUpdateSceneOffset: (sceneIndex: number, offsetMs: number) => void;
    sceneInstructions: Record<number, string>;
    onUpdateSceneInstruction: (sceneIndex: number, instruction: string) => void;
}

const DraggableTimestamp: React.FC<{
    initialOffsetMs: number;
    onOffsetChange: (offsetMs: number) => void;
}> = ({ initialOffsetMs, onOffsetChange }) => {
    const [offset, setOffset] = useState(initialOffsetMs);
    const currentOffsetRef = useRef(initialOffsetMs);

    useEffect(() => {
        setOffset(initialOffsetMs);
        currentOffsetRef.current = initialOffsetMs;
    }, [initialOffsetMs]);
    
    useEffect(() => {
        currentOffsetRef.current = offset;
    }, [offset]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startOffset = currentOffsetRef.current;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newOffset = Math.round(startOffset + deltaX * 10);
            setOffset(newOffset);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            onOffsetChange(currentOffsetRef.current);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [onOffsetChange]);


    return (
        <span
            onMouseDown={handleMouseDown}
            className="text-cyan-400 text-xs cursor-ew-resize select-none bg-[var(--color-bg-muted)] px-1 py-0.5 rounded"
            title="Click and drag horizontally to adjust user offset"
        >
            {offset >= 0 ? '+' : ''}{(offset / 1000).toFixed(3)}s
        </span>
    );
};

export const StoryboardCard: React.FC<StoryboardCardProps> = ({ 
    storyboard, onTimestampClick, extractedFrames, isExtractingFrames, loadingFrames,
    onGenerateScene, generatingScene, settings, onUpdateScenePrompt, onDownloadScene,
    onImageClick, videoAspectRatio, onUpdateSceneOffset,
    sceneInstructions, onUpdateSceneInstruction
}) => {
    
    const [copiedItem, setCopiedItem] = useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedItem(id);
        setTimeout(() => setCopiedItem(null), 2000);
    };
    
    const processedScenes = useMemo(() => {
        const parsedTimestamps = storyboard.map(s => parseTimestamp(s.timestamp));
        return storyboard.map((scene, index) => {
            const isFirst = index === 0;
            const isLast = index === storyboard.length - 1;

            const originalTime = parsedTimestamps[index];
            const offsetMs = scene.manual_offset_ms || 0;
            let calculatedBuffer = 0;

            if (!isFirst && !isLast) { // Apply buffer only to intermediate scenes
                const nextTime = parsedTimestamps[index + 1];
                const duration = nextTime - originalTime;
                if (duration > 0) {
                    calculatedBuffer = duration / 3;
                }
            }
            
            const finalTime = originalTime + calculatedBuffer + (offsetMs / 1000);
            
            let sceneTitle = `Scene ${index + 1}`;
            if (isFirst) sceneTitle = 'First Frame';
            if (isLast) sceneTitle = 'End Frame';
            
            // Clean up potential trailing characters from LLM response more aggressively
            const cleaningRegex = /[};)\s]+$/;
            const cleanedScene = {
                ...scene,
                description: scene.description.replace(cleaningRegex, '').trim(),
                visuals: scene.visuals.replace(cleaningRegex, '').trim(),
                assets: scene.assets.replace(cleaningRegex, '').trim(),
            };

            return { scene: cleanedScene, originalTime, calculatedBuffer, finalTime, sceneTitle };
        });
    }, [storyboard]);

    const getSceneInfoForCopy = (scene: StoryboardScene) => {
        return `Timestamp: ${scene.timestamp}\nDescription: ${scene.description}\nVisuals: ${scene.visuals}\nAssets: ${scene.assets}\n\nStill Prompt: ${scene.still_prompt}\n\nVideo Prompt: ${scene.video_prompt}`;
    };

    return (
        <div className="mt-4 space-y-6">
            {processedScenes.map(({ scene, originalTime, calculatedBuffer, finalTime, sceneTitle }, index) => {
                const frameIsLoading = loadingFrames.has(index);
                const isThisSceneGenerating = generatingScene === index || generatingScene === 'all';
                return (
                    <div key={index} className="bg-[var(--color-bg-surface-light)] p-4 rounded-xl border border-[var(--color-border-muted)]">
                        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
                            {/* Left Column: Image & Variations */}
                            <div className="flex flex-col gap-2 w-full">
                                <div 
                                    className="w-full bg-[var(--color-bg-muted)] rounded-lg overflow-hidden flex items-center justify-center relative"
                                    style={{ aspectRatio: videoAspectRatio || '16/9' }}
                                >
                                    {(isExtractingFrames && !extractedFrames[index]) || frameIsLoading ? (
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                                            <p className="text-xs text-[var(--color-text-dim)] mt-2">Extracting...</p>
                                        </div>
                                    ) : extractedFrames[index] ? (
                                        <img 
                                            src={extractedFrames[index]!} 
                                            alt={`Frame at ${scene.timestamp}`} 
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => onImageClick(extractedFrames[index]!)}
                                        />
                                    ) : (
                                        <div className="text-xs text-[var(--color-text-dim)]">Frame not available</div>
                                    )}
                                    {isThisSceneGenerating && (
                                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 rounded-lg">
                                            <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
                                            <span className="mt-2 text-xs font-semibold">Generating...</span>
                                        </div>
                                    )}
                                </div>
                                {scene.generated_images && scene.generated_images.length > 0 && (
                                    <div className="mt-2">
                                        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                                            {scene.generated_images.map((imgSrc, i) => (
                                                <img 
                                                    key={i} 
                                                    src={imgSrc} 
                                                    className="w-16 h-auto rounded-md object-cover flex-shrink-0 cursor-pointer" 
                                                    alt={`variation ${i+1}`}
                                                    onClick={() => onImageClick(imgSrc)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Info & Prompts */}
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex flex-col gap-2 items-start">
                                        <div className="text-sm font-mono bg-[var(--color-bg-base)] px-2 py-1 rounded flex items-center flex-wrap gap-1.5 justify-start max-w-max">
                                            <button onClick={() => onTimestampClick(finalTime)} className="text-yellow-400 hover:text-yellow-300 font-bold" title="Seek to final calculated timestamp">
                                                {formatTimeWithMS(finalTime)}
                                            </button>
                                            <span className="text-[var(--color-text-dimmer)]">=</span>
                                            <button onClick={() => onTimestampClick(originalTime)} className="text-green-400 hover:text-green-300" title="Seek to original AI timestamp">{scene.timestamp}</button>
                                            <span className="text-[var(--color-text-dimmer)]">+</span>
                                            <span className="text-purple-400 text-xs bg-[var(--color-bg-muted)] px-1 py-0.5 rounded" title="Calculated buffer (1/3 of scene duration)">
                                                {calculatedBuffer.toFixed(3)}s
                                            </span>
                                            <span className="text-[var(--color-text-dimmer)]">+</span>
                                            <DraggableTimestamp
                                                initialOffsetMs={scene.manual_offset_ms || 0}
                                                onOffsetChange={(newOffset) => onUpdateSceneOffset(index, newOffset)}
                                            />
                                        </div>
                                        <h3 className="font-bold text-lg text-[var(--color-text-light)]">{sceneTitle}</h3>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => onGenerateScene(index)} disabled={isThisSceneGenerating || !!generatingScene} className="p-1.5 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] rounded-md text-[var(--color-text-dim)] hover:text-[var(--color-text-light)] disabled:opacity-50 disabled:cursor-not-allowed" title="Generate variation for this scene">
                                            <PrepareMagicIcon className={`w-4 h-4 ${isThisSceneGenerating ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button onClick={() => handleCopy(getSceneInfoForCopy(scene), `scene-info-${index}`)} className="p-1.5 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] rounded-md text-[var(--color-text-dim)] hover:text-[var(--color-text-light)]" title="Copy all scene info">
                                            <CopyIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDownloadScene(index)} className="p-1.5 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] rounded-md text-[var(--color-text-dim)] hover:text-[var(--color-text-light)]" title="Download scene assets">
                                            <DownloadIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="text-sm text-[var(--color-text-dim)] space-y-1">
                                    <p><strong className="text-[var(--color-text-main)] font-semibold">Description:</strong> {scene.description}</p>
                                    <p><strong className="text-[var(--color-text-main)] font-semibold">Visuals:</strong> {scene.visuals}</p>
                                    <p><strong className="text-[var(--color-text-main)] font-semibold">Key Assets:</strong> {scene.assets}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <div className="flex flex-col">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-semibold text-[var(--color-text-dimmer)] uppercase tracking-wider">Still Image Prompt</label>
                                            <button onClick={() => handleCopy(scene.still_prompt, `still-prompt-${index}`)} className="text-xs bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] px-2 py-0.5 rounded">
                                                {copiedItem === `still-prompt-${index}` ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <textarea value={scene.still_prompt} onChange={(e) => onUpdateScenePrompt(index, 'still_prompt', e.target.value)} rows={5} className="mt-1 flex-grow block w-full rounded-md border-0 bg-[var(--color-bg-base)] py-2 pl-3 pr-4 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-default)] placeholder:text-[var(--color-text-dimmer)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] sm:text-sm sm:leading-6 transition-all prompt-textarea"/>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-semibold text-[var(--color-text-dimmer)] uppercase tracking-wider">Video Scene Prompt</label>
                                            <button onClick={() => handleCopy(scene.video_prompt, `video-prompt-${index}`)} className="text-xs bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] px-2 py-0.5 rounded">
                                                 {copiedItem === `video-prompt-${index}` ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <textarea value={scene.video_prompt} onChange={(e) => onUpdateScenePrompt(index, 'video_prompt', e.target.value)} rows={5} className="mt-1 flex-grow block w-full rounded-md border-0 bg-[var(--color-bg-base)] py-2 pl-3 pr-4 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-default)] placeholder:text-[var(--color-text-dimmer)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] sm:text-sm sm:leading-6 transition-all prompt-textarea"/>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <SinglePromptEditor
                                        content={sceneInstructions[index] || ''}
                                        onContentChange={(val) => onUpdateSceneInstruction(index, val)}
                                        label={`Custom Instructions for Scene ${index + 1}`}
                                        placeholder="Add specific instructions for this scene's variation..."
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};
