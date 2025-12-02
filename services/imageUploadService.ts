import { Constance } from './endpoints';
import { fetchViaWebhookProxy } from './apiUtils';

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

    // Use webhook proxy to avoid CORS issues
    const result = await fetchViaWebhookProxy<{ image_url?: string; error?: string; message?: string }>(
        Constance.endpoints.imageUpload,
        payload
    );

    // If we got valid data, return it
    if (result && result.image_url) {
        return result.image_url;
    }

    throw new Error('Image upload endpoint did not return a valid image_url.');
};