import { Constance } from './endpoints';

/**
 * Uploads an image from a data URL to a cloud bucket via a webhook.
 * @param dataUrl The data URL of the image to upload.
 * @param filename An optional filename for the uploaded image.
 * @returns A promise that resolves to the public URL of the uploaded image.
 */
export const uploadImageFromDataUrl = async (dataUrl: string, filename?: string): Promise<string> => {
    const payload = {
        image_url: dataUrl,
        filename: filename
    };

    const response = await fetch(Constance.endpoints.imageUpload, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let errorMsg = `Image upload failed with status ${response.status}.`;
        try {
            const errorBody = await response.json();
            errorMsg = errorBody.error || errorBody.message || errorMsg;
        } catch (e) {
            // response was not json, or something else went wrong
        }
        throw new Error(errorMsg);
    }
    
    const result = await response.json();
    if (result && result.image_url) {
        return result.image_url;
    }

    throw new Error('Image upload endpoint did not return a valid image_url.');
};