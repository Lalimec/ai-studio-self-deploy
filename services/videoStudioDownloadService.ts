/**
 * Video Studio Download Service
 *
 * Handles download operations for Video Studio, supporting:
 * - Single image + video + metadata downloads
 * - Bulk downloads of all studio images
 * - Progress tracking callbacks
 *
 * @module videoStudioDownloadService
 */

import JSZip from 'jszip';
import { StudioImage } from '../types';
import { getTimestamp } from './imageUtils';

export interface VideoStudioDownloadProgress {
    visible: boolean;
    message: string;
    progress: number; // 0-100
}

export type VideoStudioProgressCallback = (progress: VideoStudioDownloadProgress) => void;

export interface DownloadSingleVideoStudioImageOptions {
    image: StudioImage;
    progressCallback?: VideoStudioProgressCallback;
}

export interface DownloadAllVideoStudioImagesOptions {
    images: StudioImage[];
    sessionId: string;
    progressCallback?: VideoStudioProgressCallback;
}

/**
 * Downloads a single Video Studio image with its video (if exists) and metadata as a ZIP file
 *
 * ZIP Structure:
 * - {baseName}.jpg - The studio image
 * - {baseName}.mp4 - The generated video (if exists)
 * - {baseName}.txt - JSON metadata with video prompt
 *
 * @param options - Download options including image and progress callback
 * @returns Promise that resolves when download completes
 * @throws Error if ZIP creation or download fails
 */
export const downloadSingleVideoStudioImage = async (
    options: DownloadSingleVideoStudioImageOptions
): Promise<void> => {
    const { image, progressCallback } = options;

    const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));

    progressCallback?.({ visible: true, message: `Preparing: ${baseName}.zip`, progress: 0 });

    try {
        const zip = new JSZip();

        // Add image
        zip.file(`${baseName}.jpg`, image.src.split(',')[1], { base64: true });
        progressCallback?.({ visible: true, message: 'Adding image...', progress: 33 });

        // Add video if exists
        if (image.videoSrc) {
            const videoBlob = await fetch(image.videoSrc).then((res) => res.blob());
            zip.file(`${baseName}.mp4`, videoBlob);
            progressCallback?.({ visible: true, message: 'Adding video...', progress: 66 });
        }

        // Add metadata
        const info = {
            type: 'video_studio_image',
            video_prompt: image.videoPrompt,
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
 * Downloads all Video Studio images with their videos and metadata as a single ZIP file
 *
 * ZIP Structure:
 * - {baseName1}.jpg - First studio image
 * - {baseName1}.mp4 - First video (if exists)
 * - {baseName1}.txt - First metadata
 * - {baseName2}.jpg - Second studio image
 * - ... (and so on for all images)
 *
 * @param options - Download options including images array, session ID, and progress callback
 * @returns Promise that resolves when download completes
 * @throws Error if ZIP creation or download fails
 */
export const downloadAllVideoStudioImages = async (
    options: DownloadAllVideoStudioImagesOptions
): Promise<void> => {
    const { images, sessionId, progressCallback } = options;

    if (images.length === 0) {
        throw new Error('No images to download.');
    }

    progressCallback?.({ visible: true, message: 'Starting download...', progress: 0 });

    try {
        const zip = new JSZip();
        let filesProcessed = 0;

        // Process each image
        for (const image of images) {
            const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));

            // Add image
            zip.file(`${baseName}.jpg`, image.src.split(',')[1], { base64: true });

            // Add video if exists
            if (image.videoSrc) {
                const videoBlob = await fetch(image.videoSrc).then((res) => res.blob());
                zip.file(`${baseName}.mp4`, videoBlob);
            }

            // Add metadata
            const info = {
                type: 'video_studio_image',
                video_prompt: image.videoPrompt,
            };
            zip.file(`${baseName}.txt`, JSON.stringify(info, null, 2));

            filesProcessed++;
            progressCallback?.({
                visible: true,
                message: `Zipping: ${image.filename}`,
                progress: (filesProcessed / images.length) * 100,
            });
        }

        // Generate ZIP
        progressCallback?.({ visible: true, message: 'Compressing ZIP...', progress: 99 });
        const content = await zip.generateAsync({ type: 'blob' });

        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `AI_Studio_Video_${sessionId}_${getTimestamp()}.zip`;
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
