/// <reference lib="dom" />
import React, { useRef, useEffect, useState } from 'react';
import { useVideoAnalyzerStudio } from '../../hooks/useVideoAnalyzerStudio';
import { HelpIcon, DownloadIcon, CopyIcon, UploadIcon, TrashIcon, PrepareMagicIcon, SettingsIcon } from '../Icons';
import VideoFileUpload from './VideoFileUpload';
import Loader from './Loader';
import { StoryboardCard } from './StoryboardCard';
import AdAnalysisCard from './AdAnalysisCard';
import ConceptApproachCard from './ConceptApproachCard';
import AdIdeaCard from './AdIdeaCard';
import AnalysisErrorCard from './AnalysisErrorCard';
import SceneGenerationControls from './SceneGenerationControls';
import AnalysisSettings from './AnalysisSettings';
import ConceptGenerationControls from './ConceptGenerationControls';


interface VideoAnalyzerStudioProps {
  logic: ReturnType<typeof useVideoAnalyzerStudio>;
  onShowHelp: () => void;
  onImageClick: (id: string) => void;
}

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; disabled?: boolean; }> = ({ label, isActive, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2 text-lg font-semibold border-b-2 transition-colors disabled:opacity-50 ${isActive ? 'text-[var(--color-primary-accent)] border-[var(--color-primary-accent)]' : 'text-[var(--color-text-dim)] border-transparent hover:text-[var(--color-text-main)]'}`}
    >
        {label}
    </button>
);


const VideoAnalyzerStudio: React.FC<VideoAnalyzerStudioProps> = ({ logic, onShowHelp, onImageClick }) => {
    const {
        videoFile,
        handleVideoChange,
        appState,
        handleAnalyze,
        analysisLogs,
        error,
        videoAnalysis,
        replicationPrompt,
        extractedFrames,
        isExtractingFrames,
        loadingFrames,
        handleGenerateConcept,
        generatedAds,
        settings,
        setSettings,
        analysisParseError,
        handleRetryAnalysis,
        generatingApproach,
        generatingScene,
        handleGenerateSceneVariation,
        sceneSubjectImages,
        handleSceneSubjectImagesChange,
        handleUpdateScenePrompt,
        handleDownloadScene,
        subjectImages,
        handleAddSubjectImage,
        handleRemoveSubjectImage,
        videoAspectRatio,
        setVideoAspectRatio,
        handleUpdateSceneOffset,
        handleLoadMockData,
        handleApplyGlobalInstructions,
        sceneInstructions,
        handleUpdateSceneInstruction,
        handleGenerateAdImage,
        handleDownloadAllAssets,
    } = logic;
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const [activeTab, setActiveTab] = useState<'storyboard' | 'concepts' | 'analysis'>('storyboard');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (videoRef.current && videoFile) {
            const url = URL.createObjectURL(videoFile);
            const video = videoRef.current;
            video.src = url;

            const handleMetadata = () => {
                if (video.videoHeight > 0) {
                    setVideoAspectRatio(video.videoWidth / video.videoHeight);
                }
            };
            video.addEventListener('loadedmetadata', handleMetadata);

            return () => {
                URL.revokeObjectURL(url);
                if (video) {
                    video.removeEventListener('loadedmetadata', handleMetadata);
                }
            };
        } else {
            setVideoAspectRatio(null);
        }
    }, [videoFile, setVideoAspectRatio]);

    useEffect(() => {
        if (appState === 'analyzed' && activeTab !== 'storyboard' && activeTab !== 'concepts') {
            setActiveTab('storyboard');
        } else if (appState !== 'analyzed') {
            setActiveTab('storyboard'); // Default to storyboard but it will be empty
        }
    }, [appState]);

    const handleSeekVideo = (timeInSeconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = timeInSeconds;
        }
    };

    const handleCopyOverallPrompt = () => {
        if (videoAnalysis?.overall_video_style_prompt) {
            navigator.clipboard.writeText(videoAnalysis.overall_video_style_prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    
    const analysisAvailable = videoAnalysis !== null;

    return (
        <div className="w-full max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-8 items-start">
            {/* Left Sticky Column */}
            <div className="lg:sticky lg:top-8">
                <div className="p-6 rounded-2xl flex flex-col gap-6">
                    <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)]">
                        <VideoFileUpload
                            file={videoFile}
                            videoRef={videoRef}
                            onChange={handleVideoChange}
                            onAnalyze={handleAnalyze}
                            isAnalyzing={appState === 'analyzing'}
                            isAnalyzed={appState === 'analyzed'}
                        />
                    </div>
                    <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)]">
                        <AnalysisSettings 
                            settings={settings}
                            onSettingsChange={setSettings}
                            disabled={appState === 'analyzing'}
                            onLoadMockData={handleLoadMockData}
                        />
                    </div>
                </div>
            </div>

            {/* Right Scrollable Column */}
            <div className="flex flex-col gap-6 min-h-0">
                 <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1 border-b border-[var(--color-border-muted)]">
                        <TabButton label="Storyboard" isActive={activeTab === 'storyboard'} onClick={() => setActiveTab('storyboard')} disabled={!analysisAvailable} />
                        <TabButton label="Generated Concepts" isActive={activeTab === 'concepts'} onClick={() => setActiveTab('concepts')} disabled={!analysisAvailable} />
                        <TabButton label="Analysis" isActive={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} disabled={!analysisAvailable} />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onShowHelp} className="p-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] rounded-lg text-[var(--color-text-main)] transition-colors" title="Help"><HelpIcon className="w-5 h-5" /></button>
                        <button onClick={handleDownloadAllAssets} disabled={logic.isBusy || !analysisAvailable} className="flex items-center gap-2 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-dimmer)] text-sm">
                            <DownloadIcon className="w-4 h-4" />Download All Assets
                        </button>
                    </div>
                </div>
                
                {error && (
                    <div className="bg-red-900/30 border border-[var(--color-destructive)] text-red-300 px-4 py-3 rounded-lg text-center">
                        <p className="font-bold">An Error Occurred</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {appState === 'analyzing' && <Loader title="Analyzing Video..." messages={analysisLogs} />}
                
                {analysisParseError && (
                    <AnalysisErrorCard
                        rawResponse={analysisParseError}
                        onRetry={handleRetryAnalysis}
                        isRetrying={appState === 'analyzing'}
                    />
                )}
                
                {(appState === 'idle' && !videoFile) && (
                     <div className="col-span-full flex flex-col items-center justify-center text-center p-10 rounded-lg min-h-[500px] bg-[var(--color-bg-surface)] border border-[var(--color-border-muted)]">
                        <div className="text-center">
                            <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-light)]">Analysis Awaits</h3>
                            <p className="mt-1 text-sm text-[var(--color-text-dimmer)]">Upload a video to get started.</p>
                        </div>
                    </div>
                )}

                <div style={{ display: activeTab === 'analysis' ? 'block' : 'none' }}>
                    <div className="flex flex-col gap-6">
                         {analysisAvailable && (
                            <>
                                <AdAnalysisCard analysis={videoAnalysis.analysis} />
                                <ConceptApproachCard
                                    approaches={videoAnalysis.concept_approaches}
                                    onGenerate={handleGenerateConcept}
                                    generatingApproach={generatingApproach}
                                />
                            </>
                         )}
                    </div>
                </div>
                
                <div style={{ display: activeTab === 'storyboard' ? 'block' : 'none' }}>
                    <div className="flex flex-col gap-6">
                        {videoFile && analysisAvailable && (
                            <>
                                <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl shadow-lg border border-[var(--color-border-muted)]">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-bold text-[var(--color-text-light)]">Overall Video Style Prompt</h3>
                                        <button onClick={handleCopyOverallPrompt} className="text-xs bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] px-2 py-1 rounded-md flex items-center gap-1.5">
                                            <CopyIcon className="w-3 h-3"/>
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                    <p className="font-mono text-xs bg-[var(--color-bg-base)] p-3 rounded-md text-[var(--color-text-dim)] whitespace-pre-wrap">
                                        {videoAnalysis.overall_video_style_prompt}
                                    </p>
                                </div>
                                <SceneGenerationControls
                                    onGenerateScene={handleGenerateSceneVariation}
                                    generatingScene={generatingScene}
                                    onFileChange={handleSceneSubjectImagesChange}
                                    files={sceneSubjectImages}
                                    instructions={settings.sceneInstructions}
                                    onInstructionsChange={(val) => setSettings(s => ({ ...s, sceneInstructions: val }))}
                                    disabled={logic.isBusy || logic.isGeneratingConcepts || logic.isGeneratingScenes}
                                    settings={settings}
                                    onSettingsChange={setSettings}
                                    onApplyGlobalInstructions={handleApplyGlobalInstructions}
                                />
                                 <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl shadow-lg border border-[var(--color-border-muted)]">
                                    <StoryboardCard
                                        storyboard={videoAnalysis.storyboard}
                                        onTimestampClick={handleSeekVideo}
                                        extractedFrames={extractedFrames}
                                        isExtractingFrames={isExtractingFrames}
                                        loadingFrames={loadingFrames}
                                        onGenerateScene={handleGenerateSceneVariation}
                                        generatingScene={generatingScene}
                                        settings={settings}
                                        onUpdateScenePrompt={handleUpdateScenePrompt}
                                        onDownloadScene={handleDownloadScene}
                                        onImageClick={onImageClick}
                                        videoAspectRatio={videoAspectRatio}
                                        onUpdateSceneOffset={handleUpdateSceneOffset}
                                        sceneInstructions={sceneInstructions}
                                        onUpdateSceneInstruction={handleUpdateSceneInstruction}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div style={{ display: activeTab === 'concepts' ? 'block' : 'none' }}>
                    {analysisAvailable && (
                         <div className="flex flex-col gap-6">
                            <ConceptGenerationControls
                                settings={settings}
                                onSettingsChange={setSettings}
                                disabled={logic.isBusy || logic.isGeneratingConcepts || logic.isGeneratingScenes}
                                subjectImages={subjectImages}
                                onAddSubjectImage={handleAddSubjectImage}
                                onRemoveSubjectImage={handleRemoveSubjectImage}
                            />

                            <div className="flex justify-center">
                                <button
                                    onClick={() => handleGenerateConcept()}
                                    disabled={logic.isBusy || !!generatingApproach || logic.isGeneratingScenes}
                                    className="flex items-center justify-center gap-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg shadow-md disabled:opacity-50"
                                >
                                    <PrepareMagicIcon className={`w-6 h-6 ${generatingApproach === '__GENERATE_MORE__' ? 'animate-spin' : ''}`} />
                                    {generatingApproach === '__GENERATE_MORE__' ? 'Generating...' : 'Generate New Concept'}
                                </button>
                            </div>

                            {generatedAds.length > 0 ? (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-[var(--color-text-main)] border-b-2 border-[var(--color-primary)]/30 pb-2">Generated Ad Concepts</h2>
                                    {generatedAds.map((idea, index) => (
                                        <AdIdeaCard
                                            key={idea.id}
                                            idea={idea}
                                            index={index}
                                            settings={settings}
                                            subjectImages={subjectImages}
                                            onGenerateImage={handleGenerateAdImage}
                                            onImageClick={onImageClick}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-[var(--color-text-dim)] bg-[var(--color-bg-surface)] rounded-lg">
                                    <p>No concepts generated yet.</p>
                                    <p>Click "Generate New Concept" above, or go back to the 'Analysis' tab to generate concepts from specific approaches.</p>
                                </div>
                            )}
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoAnalyzerStudio;
