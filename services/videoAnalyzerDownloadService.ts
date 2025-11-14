/**
 * Video Analyzer Download Service
 *
 * Handles download operations for Video Analyzer Studio, supporting:
 * - Single scene downloads (frame + generated variations + metadata)
 * - Complete analysis export (video + all scenes + concepts + metadata)
 * - Progress tracking callbacks
 *
 * @module videoAnalyzerDownloadService
 */

import JSZip from 'jszip';
import { VideoAnalysis, StoryboardScene, AdIdea, VideoAnalyzerSettings } from '../types';
import { parseTimestamp, formatTimeWithMS } from './videoAnalyzerService';

export interface VideoAnalyzerDownloadProgress {
    visible: boolean;
    message: string;
    progress: number; // 0-100
}

export type VideoAnalyzerProgressCallback = (progress: VideoAnalyzerDownloadProgress) => void;

export interface DownloadSingleSceneOptions {
    scene: StoryboardScene;
    sceneIndex: number;
    extractedFrame?: string; // data URL
    sessionId: string;
    settings: VideoAnalyzerSettings;
    sceneInstructions: Record<number, string>;
    sceneSubjectImages: File[];
    progressCallback?: VideoAnalyzerProgressCallback;
}

export interface DownloadAllAssetsOptions {
    videoFile: File;
    videoAnalysis: VideoAnalysis;
    extractedFrames: string[]; // data URLs
    generatedAds: AdIdea[];
    sessionId: string;
    settings: VideoAnalyzerSettings;
    progressCallback?: VideoAnalyzerProgressCallback;
}

/**
 * Downloads a single scene with its frame, generated variations, and metadata as a ZIP file
 *
 * ZIP Structure:
 * - frame_{timestamp}.jpg - Extracted video frame
 * - variations/variation_1.jpg - First generated variation
 * - variations/variation_2.jpg - Second generated variation
 * - ... (more variations if exist)
 * - info.json - Scene metadata with generation payload and prompts
 *
 * @param options - Download options including scene data and progress callback
 * @returns Promise that resolves when download completes
 * @throws Error if ZIP creation or download fails
 */
export const downloadSingleScene = async (
    options: DownloadSingleSceneOptions
): Promise<void> => {
    const {
        scene,
        sceneIndex,
        extractedFrame,
        sessionId,
        settings,
        sceneInstructions,
        sceneSubjectImages,
        progressCallback,
    } = options;

    const timestampId = scene.timestamp.replace(/[:.]/g, '_');
    const sceneFilenameBase = `${sessionId}_scene-${sceneIndex + 1}_${timestampId}`;

    progressCallback?.({ visible: true, message: `Zipping scene ${sceneIndex + 1}...`, progress: 0 });

    try {
        const zip = new JSZip();
        const folder = zip.folder(sceneFilenameBase);
        if (!folder) throw new Error('Could not create folder in zip.');

        // Add extracted frame
        const frameFilename = `frame_${timestampId}.jpg`;
        if (extractedFrame) {
            folder.file(frameFilename, extractedFrame.split(',')[1], { base64: true });
        }

        // Prepare generation payload for metadata
        const modelToUse = settings.sceneImageModel;
        let compositePrompt = scene.still_prompt;
        if (modelToUse === 'gemini-2.5-flash-image') {
            compositePrompt = `${settings.nanoBananaPrompt}\n\nOriginal Prompt: "${scene.still_prompt}"\n\nAdditional Instructions: "${sceneInstructions[sceneIndex] || settings.sceneInstructions}"`;
        }

        const generationPayload = {
            composite_prompt: compositePrompt,
            user_instructions: sceneInstructions[sceneIndex] || settings.sceneInstructions,
            input_images: [...sceneSubjectImages.map((f) => f.name), frameFilename],
        };

        // Add metadata
        const info = {
            ...scene,
            scene_index: sceneIndex + 1,
            generation_payload: generationPayload,
            generated_images: scene.generated_images?.map((_, i) => `variations/variation_${i + 1}.jpg`) || [],
        };
        folder.file('info.json', JSON.stringify(info, null, 2));

        // Add generated variation images
        if (scene.generated_images) {
            const variationsFolder = folder.folder('variations');
            const imagePromises = scene.generated_images.map(async (imgUrl, i) => {
                const response = await fetch(imgUrl);
                const blob = await response.blob();
                variationsFolder?.file(`variation_${i + 1}.jpg`, blob);
            });
            await Promise.all(imagePromises);
        }

        progressCallback?.({ visible: true, message: 'Compressing...', progress: 90 });

        // Generate ZIP
        const content = await zip.generateAsync({ type: 'blob' });

        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${sceneFilenameBase}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);

        progressCallback?.({ visible: false, message: '', progress: 0 });
    } catch (err) {
        progressCallback?.({ visible: false, message: '', progress: 0 });
        throw new Error(`Failed to create scene ZIP: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
};

/**
 * Downloads complete Video Analyzer export with all assets
 *
 * ZIP Structure:
 * - {original_video_filename} - Original video file
 * - analysis_summary.json - Complete analysis with metadata, prompts, and timestamps
 * - scenes/
 *   - scene_1/
 *     - frame_{timestamp}.jpg - Extracted frame
 *     - variations/variation_1.jpg - Generated variations
 *     - info.json - Scene-specific metadata
 *   - scene_2/
 *     - ... (same structure)
 * - concepts/
 *   - concept_1/
 *     - image.jpg - Generated concept image
 *     - info.json - Concept metadata
 *   - concept_2/
 *     - ... (same structure)
 *
 * @param options - Download options including video, analysis, and all assets
 * @returns Promise that resolves when download completes
 * @throws Error if ZIP creation or download fails, or if no analysis is available
 */
export const downloadAllVideoAnalyzerAssets = async (
    options: DownloadAllAssetsOptions
): Promise<void> => {
    const { videoFile, videoAnalysis, extractedFrames, generatedAds, sessionId, settings, progressCallback } = options;

    if (!videoFile || !videoAnalysis) {
        throw new Error('No analysis to download.');
    }

    progressCallback?.({ visible: true, message: 'Starting asset export...', progress: 0 });

    try {
        const zip = new JSZip();
        const parsedTimestamps = videoAnalysis.storyboard.map((s) => parseTimestamp(s.timestamp));

        // Add original video
        zip.file(videoFile.name, videoFile);
        progressCallback?.({ visible: true, message: 'Adding video...', progress: 10 });

        // Create comprehensive summary JSON
        const summaryJson = {
            metadata: {
                session_id: sessionId,
                created_at: new Date().toISOString(),
                video_filename: videoFile?.name,
                analysis_model: settings.analysisModel,
                total_scenes: videoAnalysis.storyboard.length,
            },
            overall_video_style_prompt: videoAnalysis.overall_video_style_prompt,
            analysis: videoAnalysis.analysis,
            concept_approaches: videoAnalysis.concept_approaches,
            storyboard: videoAnalysis.storyboard.map((scene, index) => {
                const originalTime = parsedTimestamps[index];
                const offsetMs = scene.manual_offset_ms || 0;
                let calculatedBuffer = 0;

                // Calculate buffer for middle scenes
                if (index > 0 && index < videoAnalysis.storyboard.length - 1) {
                    const nextTime = parsedTimestamps[index + 1];
                    const duration = nextTime - originalTime;
                    if (duration > 0) calculatedBuffer = duration / 3;
                }

                const finalTime = originalTime + calculatedBuffer + offsetMs / 1000;
                const timestampId = scene.timestamp.replace(/[:.]/g, '_');

                return {
                    ...scene,
                    index: index,
                    timestamps: {
                        original_time_seconds: originalTime,
                        calculated_buffer_seconds: calculatedBuffer,
                        manual_offset_seconds: offsetMs / 1000,
                        final_time_seconds: finalTime,
                        formatted_final_time: formatTimeWithMS(finalTime),
                    },
                    frame_filename: extractedFrames[index]
                        ? `scenes/scene_${index + 1}/frame_${timestampId}.jpg`
                        : null,
                    generated_images:
                        scene.generated_images?.map(
                            (_, i) => `scenes/scene_${index + 1}/variations/variation_${i + 1}.jpg`
                        ) || [],
                };
            }),
        };

        zip.file('analysis_summary.json', JSON.stringify(summaryJson, null, 2));
        progressCallback?.({ visible: true, message: 'Adding analysis JSON...', progress: 20 });

        // Add all scenes with frames and variations
        const scenesFolder = zip.folder('scenes');
        if (scenesFolder) {
            const scenePromises = videoAnalysis.storyboard.map(async (scene, i) => {
                const timestampId = scene.timestamp.replace(/[:.]/g, '_');
                const sceneFolder = scenesFolder.folder(`scene_${i + 1}`);

                if (sceneFolder) {
                    // Add frame
                    const frame = extractedFrames[i];
                    if (frame) sceneFolder.file(`frame_${timestampId}.jpg`, frame.split(',')[1], { base64: true });

                    // Add scene info
                    sceneFolder.file('info.json', JSON.stringify(summaryJson.storyboard[i], null, 2));

                    // Add variations
                    if (scene.generated_images) {
                        const variationsFolder = sceneFolder.folder('variations');
                        const variationPromises = scene.generated_images.map(async (imgUrl, j) => {
                            const response = await fetch(imgUrl);
                            const blob = await response.blob();
                            variationsFolder?.file(`variation_${j + 1}.jpg`, blob);
                        });
                        await Promise.all(variationPromises);
                    }
                }
            });
            await Promise.all(scenePromises);
        }
        progressCallback?.({ visible: true, message: 'Adding scenes and frames...', progress: 60 });

        // Add generated concepts
        if (generatedAds.length > 0) {
            const conceptsFolder = zip.folder('concepts');
            if (conceptsFolder) {
                const conceptPromises = generatedAds.map(async (ad, i) => {
                    const conceptFolder = conceptsFolder.folder(`concept_${i + 1}`);
                    if (conceptFolder) {
                        conceptFolder.file('info.json', JSON.stringify(ad, null, 2));
                        if (ad.generatedImages && ad.generatedImages[0]) {
                            const response = await fetch(ad.generatedImages[0]);
                            const blob = await response.blob();
                            conceptFolder.file('image.jpg', blob);
                        }
                    }
                });
                await Promise.all(conceptPromises);
            }
        }
        progressCallback?.({ visible: true, message: 'Adding concepts...', progress: 80 });

        // Generate ZIP
        progressCallback?.({ visible: true, message: 'Compressing all assets...', progress: 95 });
        const content = await zip.generateAsync({ type: 'blob' });

        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `VideoAnalyzer_${sessionId}_FullExport.zip`;
        link.click();
        URL.revokeObjectURL(link.href);

        progressCallback?.({ visible: false, message: '', progress: 0 });
    } catch (err) {
        progressCallback?.({ visible: false, message: '', progress: 0 });
        throw new Error(`Failed to export assets: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
};
