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

    // Try to parse the response body regardless of status code
    // (Some webhooks may return data with non-200 status codes)
    let result;
    try {
        result = await response.json();
    } catch (e) {
        // Response was not JSON
        if (!response.ok) {
            throw new Error(`Image upload failed with status ${response.status}. Response was not JSON.`);
        }
        throw new Error('Image upload endpoint returned non-JSON response.');
    }

    // If we got valid data, return it even if status code was non-200
    if (result && result.image_url) {
        if (!response.ok) {
            console.warn(`Image upload returned status ${response.status} but included valid image_url. Proceeding anyway.`);
        }
        return result.image_url;
    }

    // If response was not OK and we didn't get valid data, throw appropriate error
    if (!response.ok) {
        const errorMsg = result?.error || result?.message || `Image upload failed with status ${response.status}.`;
        throw new Error(errorMsg);
    }

    throw new Error('Image upload endpoint did not return a valid image_url.');
};