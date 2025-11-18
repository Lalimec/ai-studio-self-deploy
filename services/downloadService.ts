/**
 * Centralized Download Service
 *
 * Provides unified download functionality for all studios, eliminating code duplication.
 * Supports: single file downloads, ZIP archives, EXIF metadata embedding, progress tracking.
 *
 * @module downloadService
 */

import JSZip from 'jszip';
import { blobToDataUrl, embedPromptInJpeg, embedPromptInPng } from './imageUtils';

/**
 * Validates that a base64 string contains a valid image header (JPEG or PNG).
 * @param base64 - Pure base64 string (without data URL prefix)
 * @returns true if the header is valid, false otherwise
 */
const validateImageHeader = (base64: string): boolean => {
    try {
        // Decode first few bytes to check magic bytes
        const binaryString = atob(base64.substring(0, 20));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Valid PNG: 89 50 4E 47
        const isPng = bytes.length >= 4 &&
                      bytes[0] === 0x89 && bytes[1] === 0x50 &&
                      bytes[2] === 0x4E && bytes[3] === 0x47;

        // Valid JPEG: FF D8 FF
        const isJpeg = bytes.length >= 3 &&
                       bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;

        if (!isPng && !isJpeg) {
            console.error('Invalid image header detected. First bytes:',
                Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
        }

        return isPng || isJpeg;
    } catch (error) {
        console.error('Error validating image header:', error);
        return false;
    }
};

/**
 * Corrects file extension based on actual MIME type
 * @param filename - Original filename (may have wrong extension)
 * @param mimeType - Actual MIME type of the file
 * @returns Filename with correct extension
 */
const correctFileExtension = (filename: string, mimeType: string): string => {
    const correctExtension = mimeType === 'image/png' ? '.png' : '.jpg';
    const currentExtension = filename.match(/\.(jpg|jpeg|png)$/i);

    if (currentExtension) {
        // Replace existing image extension
        return filename.replace(/\.(jpg|jpeg|png)$/i, correctExtension);
    } else {
        // Append correct extension
        return filename + correctExtension;
    }
};

// ============================================================================
// Types
// ============================================================================

export interface DownloadProgress {
    visible: boolean;
    message: string;
    progress: number; // 0-100
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export interface DownloadFileOptions {
    url: string;
    filename: string;
    blob?: Blob; // Optional: if already have blob, skip fetch
}

export interface DownloadWithMetadataOptions {
    imageUrl?: string;
    imageBlob?: Blob;
    imageBase64?: string; // data:image/jpeg;base64,... or just base64 string
    filename: string;
    prompt?: string; // For EXIF embedding
    metadata?: Record<string, any>; // Additional metadata for .txt file
    embedInImage?: boolean; // Whether to embed prompt in EXIF (default: true if prompt provided)
    includeMetadataFile?: boolean; // Whether to download .txt metadata file (default: true if metadata/prompt provided)
    videoUrl?: string; // Optional video to download alongside image
    videoFilename?: string; // Optional video filename
    depthMapUrl?: string; // Optional depth map to download (base64 data URL)
    depthMapFilename?: string; // Optional depth map filename
}

export interface ZipFileEntry {
    filename: string;
    content: string | Blob | ArrayBuffer;
    base64?: boolean; // If content is base64 string
}

export interface ZipDownloadOptions {
    zipFilename: string;
    files: ZipFileEntry[];
    folderName?: string; // Optional: create subfolder in ZIP
    progressCallback?: ProgressCallback;
}

export interface BulkImageDownloadOptions {
    images: Array<{
        imageUrl?: string;
        imageBlob?: Blob;
        imageBase64?: string;
        filename: string;
        prompt?: string;
        metadata?: Record<string, any>;
        videoUrl?: string; // Optional video to include
        videoFilename?: string;
        depthMapUrl?: string; // Optional depth map to include (base64 data URL)
        depthMapFilename?: string; // Optional depth map filename
    }>;
    zipFilename: string;
    folderName?: string;
    progressCallback?: ProgressCallback;
    embedPrompts?: boolean; // Whether to embed prompts in EXIF (default: true)
    includeMetadataFiles?: boolean; // Whether to include .txt files (default: true)
}

// ============================================================================
// Core Download Functions
// ============================================================================

/**
 * Downloads a single file using the browser's download mechanism
 */
export const downloadFile = async (options: DownloadFileOptions): Promise<void> => {
    const { url, filename, blob } = options;

    const downloadUrl = blob ? URL.createObjectURL(blob) : url;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (blob) {
        URL.revokeObjectURL(downloadUrl);
    }
};

/**
 * Downloads an image with optional EXIF metadata embedding and accompanying metadata file
 */
export const downloadImageWithMetadata = async (
    options: DownloadWithMetadataOptions
): Promise<void> => {
    let {
        imageUrl,
        imageBlob,
        imageBase64,
        filename,
        prompt,
        metadata,
        embedInImage = !!prompt,
        includeMetadataFile = true,
        videoUrl,
        videoFilename,
        depthMapUrl,
        depthMapFilename,
    } = options;

    // Get image blob
    let finalBlob: Blob;

    if (imageBlob) {
        finalBlob = imageBlob;
    } else if (imageBase64) {
        // Handle base64 (with or without data:image prefix)
        let base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

        // CRITICAL: Remove any whitespace from base64 string
        // Some APIs may return base64 with newlines or spaces which corrupt the decode
        base64Data = base64Data.replace(/\s/g, '');

        // Validate image header before processing
        if (!validateImageHeader(base64Data)) {
            throw new Error(`Image "${filename}" has an invalid or corrupted header. The file cannot be downloaded. This may indicate encoding issues.`);
        }

        const mimeType = imageBase64.includes('data:')
            ? imageBase64.match(/data:([^;]+);/)?.[1] || 'image/jpeg'
            : 'image/jpeg';

        // CRITICAL: Correct filename extension to match actual MIME type
        filename = correctFileExtension(filename, mimeType);

        // Decode base64 to binary
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        finalBlob = new Blob([byteArray], { type: mimeType });
    } else if (imageUrl) {
        finalBlob = await fetch(imageUrl).then((res) => res.blob());
    } else {
        throw new Error('Must provide imageUrl, imageBlob, or imageBase64');
    }

    // Embed prompt in EXIF if requested
    if (embedInImage && prompt) {
        if (finalBlob.type === 'image/jpeg') {
            const dataUrl = await blobToDataUrl(finalBlob);
            const newDataUrl = embedPromptInJpeg(dataUrl, prompt);
            finalBlob = await fetch(newDataUrl).then((res) => res.blob());
        } else if (finalBlob.type === 'image/png') {
            finalBlob = await embedPromptInPng(finalBlob, prompt);
        }
    }

    // Download image
    await downloadFile({ url: '', filename, blob: finalBlob });

    // Download video if provided
    if (videoUrl) {
        await new Promise((res) => setTimeout(res, 200)); // Small delay between downloads
        const videoBlob = await fetch(videoUrl).then((res) => res.blob());
        const videoName = videoFilename || filename.replace(/\.[^/.]+$/, '.mp4');
        await downloadFile({ url: '', filename: videoName, blob: videoBlob });
    }

    // Download depth map if provided
    if (depthMapUrl) {
        await new Promise((res) => setTimeout(res, 200)); // Small delay between downloads
        // Parse the depth map data URL
        let depthMapBase64 = depthMapUrl.includes(',') ? depthMapUrl.split(',')[1] : depthMapUrl;
        depthMapBase64 = depthMapBase64.replace(/\s/g, '');

        // Always use PNG mime type for depth maps
        const mimeType = depthMapUrl.includes('data:')
            ? depthMapUrl.match(/data:([^;]+);/)?.[1] || 'image/png'
            : 'image/png';

        const byteCharacters = atob(depthMapBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const depthMapBlob = new Blob([byteArray], { type: mimeType });

        // Ensure depth map filename has .png extension
        let depthMapName = depthMapFilename || `depth_map_${filename}`;
        if (!depthMapName.toLowerCase().endsWith('.png')) {
            depthMapName = depthMapName.replace(/\.[^/.]+$/, '') + '.png';
        }

        await downloadFile({ url: '', filename: depthMapName, blob: depthMapBlob });
    }

    // Download metadata file if provided AND enabled
    if (includeMetadataFile && (metadata || prompt)) {
        await new Promise((res) => setTimeout(res, 200)); // Small delay between downloads
        const metadataContent = metadata || { prompt };
        const textBlob = new Blob([JSON.stringify(metadataContent, null, 2)], {
            type: 'text/plain',
        });
        const textFilename = filename.replace(/\.[^/.]+$/, '.txt');
        await downloadFile({ url: '', filename: textFilename, blob: textBlob });
    }
};

/**
 * Creates and downloads a ZIP file
 */
export const downloadZip = async (options: ZipDownloadOptions): Promise<void> => {
    const { zipFilename, files, folderName, progressCallback } = options;

    const zip = new JSZip();
    const targetFolder = folderName ? zip.folder(folderName)! : zip;

    progressCallback?.({ visible: true, message: 'Creating ZIP...', progress: 0 });

    // Add files to ZIP
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.base64 && typeof file.content === 'string') {
            targetFolder.file(file.filename, file.content, { base64: true });
        } else {
            targetFolder.file(file.filename, file.content);
        }

        const progress = ((i + 1) / files.length) * 50; // 0-50% for adding files
        progressCallback?.({
            visible: true,
            message: `Adding: ${file.filename}`,
            progress,
        });
    }

    progressCallback?.({ visible: true, message: 'Compressing...', progress: 50 });

    // Generate ZIP
    const content = await zip.generateAsync({ type: 'blob' }, (metadata: any) => {
        const progress = 50 + metadata.percent * 0.5; // 50-100% for compression
        progressCallback?.({
            visible: true,
            message: metadata.currentFile
                ? `Compressing: ${metadata.currentFile}`
                : 'Compressing...',
            progress,
        });
    });

    progressCallback?.({ visible: true, message: 'Download starting...', progress: 100 });

    // Download
    await downloadFile({ url: '', filename: zipFilename, blob: content });

    progressCallback?.({ visible: false, message: '', progress: 0 });
};

/**
 * Bulk download images with metadata in a ZIP file
 * This is the most common pattern across studios
 */
export const downloadBulkImages = async (
    options: BulkImageDownloadOptions
): Promise<void> => {
    const {
        images,
        zipFilename,
        folderName,
        progressCallback,
        embedPrompts = true,
        includeMetadataFiles = true,
    } = options;

    const zip = new JSZip();
    const targetFolder = folderName ? zip.folder(folderName)! : zip;

    // Only create depth_maps folder if at least one image has a depth map
    const hasDepthMaps = images.some(img => img.depthMapUrl);
    const depthMapsFolder = hasDepthMaps ? targetFolder.folder('depth_maps')! : null;

    progressCallback?.({ visible: true, message: 'Starting...', progress: 0 });

    const totalFiles = images.length;
    let processedFiles = 0;

    for (const image of images) {
        let { imageUrl, imageBlob, imageBase64, filename, prompt, metadata, videoUrl, videoFilename, depthMapUrl, depthMapFilename } = image;

        // Process image
        let finalBlob: Blob;

        if (imageBlob) {
            finalBlob = imageBlob;
        } else if (imageBase64) {
            let base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

            // CRITICAL: Remove any whitespace from base64 string
            base64Data = base64Data.replace(/\s/g, '');

            // Validate image header before processing
            if (!validateImageHeader(base64Data)) {
                console.error(`Image "${filename}" has an invalid or corrupted header. Skipping this file.`);
                // Continue to next image instead of failing the entire batch
                processedFiles++;
                continue;
            }

            const mimeType = imageBase64.includes('data:')
                ? imageBase64.match(/data:([^;]+);/)?.[1] || 'image/jpeg'
                : 'image/jpeg';

            // CRITICAL: Correct filename extension to match actual MIME type
            filename = correctFileExtension(filename, mimeType);

            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            finalBlob = new Blob([byteArray], { type: mimeType });
        } else if (imageUrl) {
            finalBlob = await fetch(imageUrl).then((res) => res.blob());
        } else {
            throw new Error(`Image ${filename}: Must provide imageUrl, imageBlob, or imageBase64`);
        }

        // Embed prompt in EXIF if requested
        if (embedPrompts && prompt) {
            if (finalBlob.type === 'image/jpeg') {
                const dataUrl = await blobToDataUrl(finalBlob);
                const newDataUrl = embedPromptInJpeg(dataUrl, prompt);
                finalBlob = await fetch(newDataUrl).then((res) => res.blob());
            } else if (finalBlob.type === 'image/png') {
                finalBlob = await embedPromptInPng(finalBlob, prompt);
            }
        }

        // Add image to ZIP (filename has been corrected above)
        const imageBuffer = await finalBlob.arrayBuffer();
        targetFolder.file(filename, imageBuffer);

        // Add video if provided
        if (videoUrl) {
            const videoBlob = await fetch(videoUrl).then((res) => res.blob());
            const videoBuffer = await videoBlob.arrayBuffer();
            const videoName = videoFilename || filename.replace(/\.[^/.]+$/, '.mp4');
            targetFolder.file(videoName, videoBuffer);
        }

        // Add depth map if provided (to depth_maps subdirectory with same filename)
        if (depthMapUrl && depthMapsFolder) {
            let depthMapBase64 = depthMapUrl.includes(',') ? depthMapUrl.split(',')[1] : depthMapUrl;
            depthMapBase64 = depthMapBase64.replace(/\s/g, '');

            const mimeType = depthMapUrl.includes('data:')
                ? depthMapUrl.match(/data:([^;]+);/)?.[1] || 'image/png'
                : 'image/png';

            const byteCharacters = atob(depthMapBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            // Create blob with correct PNG mime type
            const depthMapBlob = new Blob([byteArray], { type: mimeType });
            const depthMapBuffer = await depthMapBlob.arrayBuffer();

            // Use provided filename or fall back to main image filename
            const depthMapName = depthMapFilename || filename;
            depthMapsFolder.file(depthMapName, depthMapBuffer);
        }

        // Add metadata file if requested (use corrected filename)
        if (includeMetadataFiles && (metadata || prompt)) {
            const metadataContent = metadata || { prompt };
            const metadataFilename = filename.replace(/\.[^/.]+$/, '.txt');
            targetFolder.file(metadataFilename, JSON.stringify(metadataContent, null, 2));
        }

        processedFiles++;
        const progress = (processedFiles / totalFiles) * 50; // 0-50% for processing
        progressCallback?.({
            visible: true,
            message: `Processing: ${filename}`,
            progress,
        });
    }

    progressCallback?.({ visible: true, message: 'Compressing ZIP...', progress: 50 });

    // Generate ZIP
    const content = await zip.generateAsync({ type: 'blob' }, (metadata: any) => {
        const progress = 50 + metadata.percent * 0.5; // 50-100% for compression
        progressCallback?.({
            visible: true,
            message: metadata.currentFile
                ? `Compressing: ${metadata.currentFile}`
                : 'Compressing...',
            progress,
        });
    });

    progressCallback?.({ visible: true, message: 'Download starting...', progress: 100 });

    // Download
    await downloadFile({ url: '', filename: zipFilename, blob: content });

    progressCallback?.({ visible: false, message: '', progress: 0 });
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts base64 string to Blob
 */
export const base64ToBlob = (base64: string, mimeType: string = 'image/jpeg'): Blob => {
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

/**
 * Wraps a download function with multi-download browser warning bypass
 * Some browsers block multiple downloads - this helps work around that
 */
export const withMultiDownloadWarning = (
    downloadFn: () => Promise<void>,
    onWarning?: () => void
): (() => Promise<void>) => {
    return async () => {
        try {
            await downloadFn();
        } catch (err) {
            if (err instanceof Error && err.message.includes('download')) {
                onWarning?.();
            }
            throw err;
        }
    };
};
