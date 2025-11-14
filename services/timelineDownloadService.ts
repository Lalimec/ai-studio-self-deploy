/**
 * Timeline Studio Download Service
 *
 * Handles download operations for Timeline Studio, supporting:
 * - Single pair downloads (start image + end image + transition video + metadata)
 * - Bulk downloads of all timeline pairs
 * - Progress tracking callbacks
 *
 * @module timelineDownloadService
 */

import JSZip from 'jszip';
import { TimelinePair, StudioImage } from '../types';
import { getTimestamp } from './imageUtils';

export interface TimelineDownloadProgress {
    visible: boolean;
    message: string;
    progress: number; // 0-100
}

export type TimelineProgressCallback = (progress: TimelineDownloadProgress) => void;

export interface DownloadSingleTimelinePairOptions {
    pair: TimelinePair;
    pairIndex: number;
    startImage: StudioImage;
    endImage: StudioImage;
    sessionId: string;
    generalPrompt?: string;
    progressCallback?: TimelineProgressCallback;
}

export interface DownloadAllTimelinePairsOptions {
    pairs: TimelinePair[];
    allPairs: TimelinePair[]; // All pairs for index calculation
    images: StudioImage[];
    sessionId: string;
    generalPrompt?: string;
    progressCallback?: TimelineProgressCallback;
}

/**
 * Helper to get short ID from full ID (last 5 characters)
 */
const getShortIdFromFullId = (fullId: string): string => {
    return fullId.slice(-5);
};

/**
 * Downloads a single Timeline pair with start/end images, transition video, and metadata as a ZIP file
 *
 * ZIP Structure:
 * - {pairName}_start.jpg - Start image
 * - {pairName}_end.jpg - End image
 * - {pairName}.mp4 - Transition video (if exists)
 * - {pairName}.txt - JSON metadata with prompts and pair info
 *
 * @param options - Download options including pair, images, and progress callback
 * @returns Promise that resolves when download completes
 * @throws Error if ZIP creation or download fails, or if video is not generated
 */
export const downloadSingleTimelinePair = async (
    options: DownloadSingleTimelinePairOptions
): Promise<void> => {
    const { pair, pairIndex, startImage, endImage, sessionId, generalPrompt, progressCallback } = options;

    if (!pair.videoSrc) {
        throw new Error('Video not generated for this pair yet.');
    }

    const startShortId = getShortIdFromFullId(startImage.id);
    const endShortId = getShortIdFromFullId(endImage.id);
    const timestamp = getTimestamp();
    const baseName = `${sessionId}_Timeline_Transition_${String(pairIndex + 1).padStart(2, '0')}_${startShortId}-to-${endShortId}_${timestamp}`;

    progressCallback?.({ visible: true, message: `Preparing: ${baseName}.zip`, progress: 0 });

    try {
        const zip = new JSZip();

        // Add start image
        zip.file(`${baseName}_start.jpg`, startImage.src.split(',')[1], { base64: true });
        progressCallback?.({ visible: true, message: 'Adding start image...', progress: 25 });

        // Add end image
        zip.file(`${baseName}_end.jpg`, endImage.src.split(',')[1], { base64: true });
        progressCallback?.({ visible: true, message: 'Adding end image...', progress: 50 });

        // Add transition video
        const videoBlob = await fetch(pair.videoSrc).then((res) => res.blob());
        zip.file(`${baseName}.mp4`, videoBlob);
        progressCallback?.({ visible: true, message: 'Adding video...', progress: 75 });

        // Add metadata
        const info = {
            pair_index: pairIndex + 1,
            start_image_filename: startImage.filename,
            end_image_filename: endImage.filename,
            video_prompt: pair.videoPrompt,
            general_instruction: generalPrompt,
            session_id: sessionId,
            timestamp: timestamp,
        };
        zip.file(`${baseName}.txt`, JSON.stringify(info, null, 2));
        progressCallback?.({ visible: true, message: 'Compressing...', progress: 90 });

        // Generate ZIP
        const content = await zip.generateAsync({ type: 'blob' });

        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${baseName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        progressCallback?.({ visible: false, message: '', progress: 0 });
    } catch (err) {
        progressCallback?.({ visible: false, message: '', progress: 0 });
        throw new Error(`Error creating ZIP file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
};

/**
 * Downloads all Timeline pairs with their images, videos, and metadata as a single ZIP file
 *
 * ZIP Structure:
 * - {pairName1}_start.jpg - First pair start image
 * - {pairName1}_end.jpg - First pair end image
 * - {pairName1}.mp4 - First pair transition video (if exists)
 * - {pairName1}.txt - First pair metadata
 * - {pairName2}_start.jpg - Second pair start image
 * - ... (and so on for all pairs)
 *
 * @param options - Download options including pairs array, images, and progress callback
 * @returns Promise that resolves when download completes
 * @throws Error if ZIP creation or download fails, or if no content is available
 */
export const downloadAllTimelinePairs = async (
    options: DownloadAllTimelinePairsOptions
): Promise<void> => {
    const { pairs, allPairs, images, sessionId, generalPrompt, progressCallback } = options;

    // Filter to only pairs that have content (video or prompt)
    const pairsWithContent = pairs.filter((p) => !p.isDisabled && (p.videoSrc || p.videoPrompt));

    if (pairsWithContent.length === 0) {
        throw new Error('No content available to download.');
    }

    progressCallback?.({ visible: true, message: 'Starting download...', progress: 0 });

    // Helper to find image by ID
    const findImageById = (id: string): StudioImage | undefined => {
        return images.find((img) => img.id === id);
    };

    try {
        const zip = new JSZip();
        const timestamp = getTimestamp();
        let filesProcessed = 0;
        const totalFiles = pairsWithContent.length;

        for (const pair of pairsWithContent) {
            const startImage = findImageById(pair.startImageId);
            const endImage = findImageById(pair.endImageId);

            if (!startImage || !endImage) continue;

            const index = allPairs.findIndex((p) => p.id === pair.id);
            const startShortId = getShortIdFromFullId(startImage.id);
            const endShortId = getShortIdFromFullId(endImage.id);
            const pairName = `${sessionId}_Timeline_Transition_${String(index + 1).padStart(2, '0')}_${startShortId}-to-${endShortId}_${timestamp}`;

            filesProcessed++;
            progressCallback?.({
                visible: true,
                message: `Zipping: Transition ${index + 1}`,
                progress: (filesProcessed / totalFiles) * 100,
            });

            // Add start and end images
            zip.file(`${pairName}_start.jpg`, startImage.src.split(',')[1], { base64: true });
            zip.file(`${pairName}_end.jpg`, endImage.src.split(',')[1], { base64: true });

            // Add transition video if exists
            if (pair.videoSrc) {
                const videoBlob = await fetch(pair.videoSrc).then((res) => res.blob());
                zip.file(`${pairName}.mp4`, videoBlob);
            }

            // Add metadata
            const info = {
                pair_index: index + 1,
                start_image_filename: startImage.filename,
                end_image_filename: endImage.filename,
                video_prompt: pair.videoPrompt,
                general_instruction: generalPrompt,
                session_id: sessionId,
                timestamp: timestamp,
            };
            zip.file(`${pairName}.txt`, JSON.stringify(info, null, 2));
        }

        // Generate ZIP
        progressCallback?.({ visible: true, message: 'Compressing ZIP...', progress: 99 });
        const content = await zip.generateAsync({ type: 'blob' });

        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${sessionId || 'AI_Studio'}_Timeline_${getTimestamp()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        progressCallback?.({ visible: false, message: '', progress: 0 });
    } catch (err) {
        progressCallback?.({ visible: false, message: '', progress: 0 });
        throw new Error(`Error creating ZIP file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
};
