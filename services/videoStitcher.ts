// This service uses an n8n webhook to stitch multiple videos together.
import { Constance } from './endpoints';
import { adaptStitcherResponse } from './apiResponseAdapter';

type ProgressCallback = (progress: number, message: string) => void;

/**
 * Stitches multiple videos together using a remote service.
 * @param videoUrls An array of URLs for the videos to stitch.
 * @param onProgress A callback to report progress updates.
 * @returns A promise that resolves to a Blob of the stitched MP4 video.
 */
export async function stitchVideos(videoUrls: string[], onProgress: ProgressCallback): Promise<Blob> {
    if (videoUrls.length < 2) {
        throw new Error("At least two videos are required to stitch.");
    }

    onProgress(10, "Sending request to stitching service...");

    const response = await fetch(Constance.endpoints.videoStitcher, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_urls: videoUrls }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Stitching service error response:", errorText);
        throw new Error(`Stitching service failed with status ${response.status}.`);
    }

    onProgress(50, "Stitching in progress... this can take a moment.");
    
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
        const result = await response.json();

        // Use centralized adapter to parse stitcher response
        const stitcherResult = adaptStitcherResponse(result);

        onProgress(75, "Downloading stitched video...");

        const videoResponse = await fetch(stitcherResult.videoUrl);
        if (!videoResponse.ok) {
            throw new Error(`Failed to download stitched video from URL: ${videoResponse.statusText}`);
        }

        const videoBlob = await videoResponse.blob();
        onProgress(100, "Stitching complete!");
        return videoBlob;

    } else if (contentType && contentType.includes('video/')) {
        // The response is the video file itself
        onProgress(90, "Receiving stitched video file...");
        const videoBlob = await response.blob();
        onProgress(100, "Stitching complete!");
        return videoBlob;
    } else {
        // Fallback for unexpected content type
        const responseText = await response.text();
        console.error("Unexpected stitcher response:", responseText);
        throw new Error(`Unexpected response from stitching service. Content-Type: ${contentType}`);
    }
}