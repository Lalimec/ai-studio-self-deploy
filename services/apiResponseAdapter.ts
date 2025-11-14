/**
 * Centralized API Response Adapter
 *
 * This service implements DRY (Don't Repeat Yourself) and SSOT (Single Source of Truth)
 * principles for parsing API responses across the application.
 *
 * It intelligently routes response parsing based on:
 * - Model type (native Gemini vs external webhooks)
 * - Endpoint being called
 * - API category (image, video, text, upload)
 *
 * Architecture:
 * 1. Main Adapter Functions - Entry points that inspect context and route
 * 2. Native Parsers - Handle Google Gemini SDK responses
 * 3. Webhook Parsers - Handle n8n webhook responses
 * 4. Error Handlers - Unified error parsing and formatting
 */

import { GenerateContentResponse } from '@google/genai';
import { Constance } from './endpoints';

// ============================================================================
// TYPE DEFINITIONS - Response Schemas
// ============================================================================

/**
 * Native Gemini API response types
 */
export interface NativeImageResponse {
    candidates?: Array<{
        content: {
            parts: Array<{
                inlineData?: {
                    data: string;
                    mimeType: string;
                };
                text?: string;
            }>;
        };
    }>;
    text?: string;
}

export interface NativeTextResponse {
    text: string;
    candidates?: any[];
}

/**
 * Webhook response types (n8n endpoints)
 */
export interface WebhookImageResponse {
    images?: string[]; // Array of base64 strings
    error?: string;
    message?: string;
}

export interface WebhookVideoInitResponse {
    request_id?: string;
    Error?: string;
}

export interface WebhookVideoStatusResponse {
    status?: 'generating' | 'completed' | 'failed' | string;
    videos?: string[];
    Error?: string;
    error?: string;
}

export interface WebhookUploadResponse {
    image_url?: string;
    file_url?: string;
    error?: string;
}

export interface WebhookStitcherResponse {
    url?: string;
    stitched_video_url?: string;
}

/**
 * Standardized output types
 */
export interface ImageGenerationResult {
    dataUrl: string; // format: data:image/{type};base64,{data}
}

export interface VideoGenerationResult {
    requestId: string;
}

export interface VideoStatusResult {
    status: 'generating' | 'completed' | 'failed';
    videoUrl?: string;
}

export interface UploadResult {
    publicUrl: string;
}

export interface StitcherResult {
    videoUrl: string;
}

export interface ApiError {
    message: string;
    originalError?: any;
    isUserFacing: boolean;
    isSafetyFilter?: boolean;
    isQuotaExceeded?: boolean;
}

// ============================================================================
// CONTEXT DETECTION - Determine which parser to use
// ============================================================================

/**
 * Determines if a model uses native Gemini API
 */
export const isNativeGeminiModel = (model: string): boolean => {
    return model === Constance.models.image.flash ||
           model.startsWith('gemini-') ||
           model.startsWith('imagen-');
};

/**
 * Determines if a model uses n8n webhook
 */
export const isWebhookModel = (model: string): boolean => {
    return model === Constance.models.image.nanoBanana ||
           model === Constance.models.image.seedream ||
           model === Constance.models.image.flux;
};

/**
 * Maps model ID to endpoint URL (for webhook detection)
 */
export const getEndpointForModel = (model: string): string | null => {
    switch (model) {
        case Constance.models.image.nanoBanana:
            return Constance.endpoints.image.nanoBanana;
        case Constance.models.image.seedream:
            return Constance.endpoints.image.seedream;
        case Constance.models.image.flux:
            return Constance.endpoints.image.flux;
        default:
            return null;
    }
};

// ============================================================================
// NATIVE GEMINI API PARSERS
// ============================================================================

/**
 * Parses native Gemini image generation response
 * Used by: gemini-2.5-flash-image, imagen-* models
 */
export const parseNativeImageResponse = (response: NativeImageResponse): ImageGenerationResult => {
    // Check for inlineData in candidates
    for (const part of response.candidates?.[0]?.content.parts ?? []) {
        if (part.inlineData) {
            const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            return { dataUrl };
        }
    }

    // Handle cases where the model returns text instead of an image (e.g., safety rejection)
    if (response.text) {
        throw createApiError(
            "The model returned a text response instead of an image. This may be due to a safety policy violation or an unclear prompt.",
            { modelText: response.text, isSafetyFilter: true }
        );
    }

    throw createApiError(
        'Image generation failed. The model did not return an image.',
        { response }
    );
};

/**
 * Parses native Gemini text generation response
 * Used by: gemini-2.5-flash, gemini-2.5-pro for text tasks
 */
export const parseNativeTextResponse = (response: NativeTextResponse): string => {
    if (response.text) {
        return response.text;
    }

    throw createApiError(
        'Text generation failed. The model did not return text.',
        { response }
    );
};

/**
 * Parses native Gemini JSON response (structured output)
 * Used by: Video Analyzer analysis, Ad Cloner prompt generation
 */
export const parseNativeJsonResponse = <T>(response: NativeTextResponse, expectedKeys?: string[]): T => {
    try {
        const jsonText = response.text.trim();

        // Try to extract JSON from markdown code blocks
        const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
        const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[2]) : jsonText;

        const parsed = JSON.parse(jsonString);

        // Validate expected keys if provided
        if (expectedKeys) {
            for (const key of expectedKeys) {
                if (!(key in parsed)) {
                    throw new Error(`Missing required key: ${key}`);
                }
            }
        }

        return parsed as T;
    } catch (parseError: any) {
        throw createApiError(
            `Failed to parse JSON response: ${parseError.message}`,
            { originalResponse: response.text, parseError }
        );
    }
};

// ============================================================================
// N8N WEBHOOK PARSERS
// ============================================================================

/**
 * Parses n8n webhook image generation response
 * Used by: Nano Banana, Seedream, Flux Kontext Pro
 */
export const parseWebhookImageResponse = (response: WebhookImageResponse): ImageGenerationResult => {
    // Check for error first
    if (response.error || response.message) {
        throw createApiError(
            response.error || response.message || 'Image generation failed',
            { response }
        );
    }

    // Validate images array
    if (!response.images || !Array.isArray(response.images) || response.images.length === 0) {
        throw createApiError(
            'Image generation response did not contain a valid images array',
            { response }
        );
    }

    // Validate base64 string
    const base64String = response.images[0];
    if (typeof base64String !== 'string') {
        throw createApiError(
            'Image generation response contained invalid image data',
            { response }
        );
    }

    // Return as data URL
    const dataUrl = `data:image/jpeg;base64,${base64String}`;
    return { dataUrl };
};

/**
 * Parses n8n webhook video generation initiation response
 * Used by: Seedance V1 Pro (initial request)
 */
export const parseWebhookVideoInitResponse = (response: WebhookVideoInitResponse): VideoGenerationResult => {
    // Check for error
    if (response.Error) {
        throw createApiError(
            `Video generation initiation failed: ${response.Error}`,
            { response }
        );
    }

    // Validate request_id
    if (!response.request_id) {
        throw createApiError(
            'Video generation response did not contain a request_id',
            { response }
        );
    }

    return { requestId: response.request_id };
};

/**
 * Parses n8n webhook video status polling response
 * Used by: Seedance V1 Pro (status checks)
 */
export const parseWebhookVideoStatusResponse = (response: WebhookVideoStatusResponse): VideoStatusResult => {
    // Check for errors
    if (response.Error || response.error) {
        throw createApiError(
            `Video generation failed: ${response.Error || response.error}`,
            { response }
        );
    }

    // Check for completion with video URL
    if (response.videos && Array.isArray(response.videos) && response.videos.length > 0) {
        return {
            status: 'completed',
            videoUrl: response.videos[0]
        };
    }

    // Check status
    if (response.status === 'generating') {
        return { status: 'generating' };
    }

    // If status is not generating and no videos, it's a failure
    if (response.status && response.status !== 'generating') {
        throw createApiError(
            `Video generation failed with status: ${response.status}`,
            { response }
        );
    }

    // Unknown state - treat as still generating
    return { status: 'generating' };
};

/**
 * Parses n8n webhook upload response (image/video)
 * Used by: Image upload to GCS, Video upload to GCS
 */
export const parseWebhookUploadResponse = (response: WebhookUploadResponse): UploadResult => {
    // Check for error
    if (response.error) {
        throw createApiError(
            `Upload failed: ${response.error}`,
            { response }
        );
    }

    // Get URL from either field
    const publicUrl = response.image_url || response.file_url;

    if (!publicUrl) {
        throw createApiError(
            'Upload response did not contain a valid URL',
            { response }
        );
    }

    return { publicUrl };
};

/**
 * Parses n8n webhook video stitcher response
 * Used by: Timeline Studio video stitching
 */
export const parseWebhookStitcherResponse = (response: WebhookStitcherResponse): StitcherResult => {
    const videoUrl = response.url || response.stitched_video_url;

    if (!videoUrl || typeof videoUrl !== 'string') {
        throw createApiError(
            'Stitching service did not return a valid video URL',
            { response }
        );
    }

    return { videoUrl };
};

// ============================================================================
// ERROR HANDLING - Unified error parsing
// ============================================================================

/**
 * Creates a standardized API error
 */
export const createApiError = (message: string, details?: any): ApiError => {
    const error: ApiError = {
        message,
        originalError: details,
        isUserFacing: true,
        isSafetyFilter: details?.isSafetyFilter || false,
        isQuotaExceeded: false
    };

    // Check for quota errors
    if (message.includes('429') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('quota')) {
        error.isQuotaExceeded = true;
    }

    // Check for safety filter errors
    if (message.includes('SAFETY') ||
        message.includes('safety') ||
        message.includes('policy violation')) {
        error.isSafetyFilter = true;
    }

    return error;
};

/**
 * Parses generic error responses (works for both native and webhook)
 */
export const parseErrorResponse = (error: any, taskContext?: string): string => {
    const prefix = taskContext ? `Failed on ${taskContext}` : 'Operation failed';

    // Try to extract structured error from response
    const errorMessage = error.message || String(error);

    // Look for JSON error object in message
    const jsonMatch = errorMessage.match(/{.*}/s);
    if (jsonMatch) {
        try {
            const errorJson = JSON.parse(jsonMatch[0]);
            const apiMessage = errorJson?.error?.message || errorJson?.Error || 'An unknown API error occurred.';
            return `${prefix}: ${apiMessage.split('. For more information')[0]}`;
        } catch (e) {
            // JSON parsing failed, fall back to simpler checks
        }
    }

    // Check for common error patterns
    if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        return `${prefix}: Your API key has exceeded its quota.`;
    }

    if (errorMessage.includes('SAFETY') || errorMessage.includes('safety')) {
        return `${prefix}: Generation failed due to safety filters.`;
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return `${prefix}: Network error. Please check your connection.`;
    }

    // Return cleaned error message
    return `${prefix}: ${errorMessage}`;
};

// ============================================================================
// MAIN ADAPTER FUNCTIONS - Smart routing based on context
// ============================================================================

/**
 * Adapts image generation response based on model type
 * @param rawResponse - The raw API response (native SDK response or parsed JSON from webhook)
 * @param model - The model identifier used for generation
 * @param endpoint - Optional endpoint URL (for webhook detection)
 * @returns Standardized image result with data URL
 */
export const adaptImageGenerationResponse = (
    rawResponse: any,
    model: string,
    endpoint?: string
): ImageGenerationResult => {
    // Determine parser based on model/endpoint
    if (isNativeGeminiModel(model)) {
        return parseNativeImageResponse(rawResponse as NativeImageResponse);
    }

    if (isWebhookModel(model) || endpoint) {
        return parseWebhookImageResponse(rawResponse as WebhookImageResponse);
    }

    // Fallback: try webhook parser (most common)
    return parseWebhookImageResponse(rawResponse as WebhookImageResponse);
};

/**
 * Adapts video generation initiation response
 * @param rawResponse - The raw webhook response
 * @returns Standardized result with request ID
 */
export const adaptVideoInitResponse = (rawResponse: any): VideoGenerationResult => {
    return parseWebhookVideoInitResponse(rawResponse as WebhookVideoInitResponse);
};

/**
 * Adapts video status polling response
 * @param rawResponse - The raw webhook response
 * @returns Standardized status result
 */
export const adaptVideoStatusResponse = (rawResponse: any): VideoStatusResult => {
    return parseWebhookVideoStatusResponse(rawResponse as WebhookVideoStatusResponse);
};

/**
 * Adapts upload response (image or video)
 * @param rawResponse - The raw webhook response
 * @returns Standardized upload result with public URL
 */
export const adaptUploadResponse = (rawResponse: any): UploadResult => {
    return parseWebhookUploadResponse(rawResponse as WebhookUploadResponse);
};

/**
 * Adapts video stitcher response
 * @param rawResponse - The raw webhook response
 * @returns Standardized stitcher result with video URL
 */
export const adaptStitcherResponse = (rawResponse: any): StitcherResult => {
    return parseWebhookStitcherResponse(rawResponse as WebhookStitcherResponse);
};

/**
 * Adapts text generation response (native Gemini only)
 * @param rawResponse - The raw SDK response
 * @returns Text string
 */
export const adaptTextGenerationResponse = (rawResponse: any): string => {
    return parseNativeTextResponse(rawResponse as NativeTextResponse);
};

/**
 * Adapts JSON response with schema validation (native Gemini only)
 * @param rawResponse - The raw SDK response
 * @param expectedKeys - Optional array of required top-level keys
 * @returns Parsed JSON object
 */
export const adaptJsonResponse = <T>(rawResponse: any, expectedKeys?: string[]): T => {
    return parseNativeJsonResponse<T>(rawResponse as NativeTextResponse, expectedKeys);
};

// ============================================================================
// CONVENIENCE FUNCTIONS - HTTP response handling
// ============================================================================

/**
 * Fetches and parses a webhook response with automatic error handling
 * @param endpoint - The webhook endpoint URL
 * @param payload - The request payload
 * @param parser - The adapter function to use for parsing
 * @returns Parsed and adapted response
 */
export const fetchAndAdapt = async <T>(
    endpoint: string,
    payload: any,
    parser: (rawResponse: any) => T
): Promise<T> => {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        // Try to parse JSON response
        let result: any;
        try {
            result = await response.json();
        } catch (parseError) {
            throw createApiError(
                `Failed to parse API response: ${response.statusText}`,
                { status: response.status, parseError }
            );
        }

        // Check HTTP status
        if (!response.ok) {
            // Extract error message from result if available
            const errorMsg = result?.error || result?.message || result?.Error ||
                           `Request failed with status ${response.status}`;
            throw createApiError(errorMsg, { status: response.status, result });
        }

        // Parse using provided adapter
        return parser(result);
    } catch (error: any) {
        // Re-throw ApiError as-is
        if (error.isUserFacing !== undefined) {
            throw error;
        }

        // Wrap other errors
        throw createApiError(
            error.message || 'Request failed',
            { originalError: error }
        );
    }
};
