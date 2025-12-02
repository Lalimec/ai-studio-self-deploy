import { Constance } from './endpoints';
import { fetchViaWebhookProxy } from './apiUtils';

/**
 * Converts a File object to a data URL.
 * @param file The file to convert.
 * @returns A promise that resolves to the data URL.
 */
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert file to data URL'));
            }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(file);
    });
};

/**
 * Uploads a video file to Google Cloud Storage via N8n webhook.
 * @param videoFile The video file to upload.
 * @returns A promise that resolves to the public GCS URL of the uploaded video.
 */
export const uploadVideoToGCS = async (videoFile: File): Promise<string> => {
    // Convert the video file to a data URL
    const dataUrl = await fileToDataUrl(videoFile);

    const payload = {
        file_url: dataUrl,
        filename: videoFile.name
    };

    // Use webhook proxy to avoid CORS issues
    const result = await fetchViaWebhookProxy<{ file_url?: string; error?: string; message?: string }>(
        Constance.endpoints.videoUpload,
        payload
    );

    if (result && result.file_url) {
        return result.file_url;
    }

    throw new Error('Video upload endpoint did not return a valid file_url.');
};
