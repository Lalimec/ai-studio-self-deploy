import { UpscalerSettings } from '../types';
import { Constance } from './endpoints';
import { processWithConcurrency } from './apiUtils';

export class UpscalerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UpscalerError';
    }
}

/**
 * Upscales an image using the Crystal Upscaler.
 * @param imageUrl Public URL of the image to upscale
 * @param scaleFactor Scale factor (1-4, default 2)
 * @returns URL of the upscaled image
 */
export const upscaleWithCrystal = async (
    imageUrl: string,
    scaleFactor: number = 2
): Promise<string> => {
    const payload = {
        image_url: imageUrl,
        scale_factor: scaleFactor,
    };

    const response = await fetch(Constance.endpoints.upscaler.crystal, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
        const errorMsg = result?.error || result?.Error || `Crystal upscaler failed with status ${response.status}`;
        throw new UpscalerError(errorMsg);
    }

    // Handle response format: { images: ["..."] } (array format like other studios)
    if (result?.images && Array.isArray(result.images) && result.images.length > 0) {
        return result.images[0];
    }

    // Handle response format: { image: { url: "..." } }
    if (result?.image?.url) {
        return result.image.url;
    }

    // Alternative response format: { url: "..." }
    if (result?.url) {
        return result.url;
    }

    console.error('Unexpected Crystal upscaler response format:', result);
    throw new UpscalerError('Crystal upscaler did not return a valid image URL.');
};

/**
 * Upscales an image using the SeedVR Upscaler.
 * @param imageUrl Public URL of the image to upscale
 * @param settings Upscaler settings
 * @returns URL of the upscaled image
 */
export const upscaleWithSeedVR = async (
    imageUrl: string,
    settings: UpscalerSettings
): Promise<string> => {
    const payload: Record<string, any> = {
        image_url: imageUrl,
        upscale_mode: settings.upscaleMode,
        upscale_factor: settings.scaleFactor,
        target_resolution: settings.targetResolution,
        // Hidden defaults - always sent but not exposed to user
        noise_scale: 0.1,
        output_format: 'jpg',
    };

    const response = await fetch(Constance.endpoints.upscaler.seedvr, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
        const errorMsg = result?.error || result?.Error || `SeedVR upscaler failed with status ${response.status}`;
        throw new UpscalerError(errorMsg);
    }

    // Handle response format: { images: ["..."] } (array format like other studios)
    if (result?.images && Array.isArray(result.images) && result.images.length > 0) {
        return result.images[0];
    }

    // Handle response format: { image: { url: "..." } }
    if (result?.image?.url) {
        return result.image.url;
    }

    // Alternative response format: { url: "..." }
    if (result?.url) {
        return result.url;
    }

    console.error('Unexpected SeedVR upscaler response format:', result);
    throw new UpscalerError('SeedVR upscaler did not return a valid image URL.');
};

/**
 * Routes to the appropriate upscaler based on settings.
 * @param imageUrl Public URL of the image to upscale
 * @param settings Upscaler settings including model selection
 * @returns URL of the upscaled image
 */
export const upscaleImage = async (
    imageUrl: string,
    settings: UpscalerSettings
): Promise<string> => {
    if (settings.model === 'crystal') {
        return upscaleWithCrystal(imageUrl, settings.scaleFactor);
    } else {
        return upscaleWithSeedVR(imageUrl, settings);
    }
};

export type UpscaleTask = {
    id: string;
    imageUrl: string;
    settings: UpscalerSettings;
};

/**
 * Upscales multiple images with concurrency control.
 * @param tasks Array of upscale tasks
 * @param onImageUpscaled Callback when an image is successfully upscaled
 * @param onError Callback when an image fails to upscale
 * @param concurrency Number of concurrent operations (default 3)
 */
export const upscaleAllImages = async (
    tasks: UpscaleTask[],
    onImageUpscaled: (id: string, upscaledUrl: string) => void,
    onError: (errorMessage: string) => void,
    concurrency: number = 3
): Promise<void> => {
    const processTask = async (task: UpscaleTask) => {
        try {
            const upscaledUrl = await upscaleImage(task.imageUrl, task.settings);
            onImageUpscaled(task.id, upscaledUrl);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            onError(`Failed to upscale image ${task.id}: ${message}`);
        }
    };

    await processWithConcurrency(tasks, processTask, concurrency);
};

/**
 * Returns the default upscaler settings.
 */
export const getDefaultUpscalerSettings = (): UpscalerSettings => ({
    model: 'seedvr',
    scaleFactor: 2,
    upscaleMode: 'target',
    targetResolution: '1440p',
});
