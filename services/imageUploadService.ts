import { Constance } from './endpoints';
import { adaptUploadResponse, fetchAndAdapt } from './apiResponseAdapter';

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

    // Use centralized adapter for upload response handling
    const result = await fetchAndAdapt(
        Constance.endpoints.imageUpload,
        payload,
        adaptUploadResponse
    );

    return result.publicUrl;
};