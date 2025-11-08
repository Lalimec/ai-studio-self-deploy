import { Constance } from './endpoints';

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

    const response = await fetch(Constance.endpoints.videoUpload, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let errorMsg = `Video upload failed with status ${response.status}.`;
        try {
            const errorBody = await response.json();
            errorMsg = errorBody.error || errorBody.message || errorMsg;
        } catch (e) {
            // response was not json, or something else went wrong
        }
        throw new Error(errorMsg);
    }

    const result = await response.json();
    if (result && result.file_url) {
        return result.file_url;
    }

    throw new Error('Video upload endpoint did not return a valid file_url.');
};
