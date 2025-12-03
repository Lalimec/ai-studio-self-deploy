import { Constance } from './endpoints';
import { fetchViaWebhookProxy } from './apiUtils';

/**
 * Uploads an image from a data URL to a cloud bucket via a webhook.
 * If the input is already an HTTPS URL (from webhook-generated images), returns it as-is.
 * @param imageUrl The data URL or HTTPS URL of the image.
 * @param filename An optional filename for the uploaded image.
 * @returns A promise that resolves to the public URL of the image.
 */
export const uploadImageFromDataUrl = async (imageUrl: string, filename?: string): Promise<string> => {
    // If it's already an HTTPS URL (from webhook-generated images), return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }

    // It's a data URL - upload to GCS
    const payload = {
        image_url: imageUrl,
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