/**
 * Analytics Service - Frontend Event Tracking
 * 
 * Sends structured events to the server's /analytics endpoint,
 * which then logs them to Cloud Logging for monitoring and analysis.
 */

export type AnalyticsEventType =
    | 'generation_start'
    | 'generation_complete'
    | 'generation_error'
    | 'studio_open'
    | 'action';

export interface AnalyticsEvent {
    eventType: AnalyticsEventType;
    studio?: string;
    model?: string;
    action?: string;
    count?: number;
    duration_ms?: number;
    error?: string;
    metadata?: Record<string, any>;
}

/**
 * Check if analytics endpoint is available (production environment).
 */
const isAnalyticsAvailable = (): boolean => {
    if (typeof window !== 'undefined') {
        // Vite dev server uses ports in the 5173+ range
        const port = parseInt(window.location.port, 10);
        const isDevServer = port >= 5173 && port < 5200;
        return !isDevServer;
    }
    return false;
};

/**
 * Track an analytics event.
 * Events are sent to the server asynchronously (fire and forget).
 * Errors are logged but don't affect the main application flow.
 */
export const trackEvent = async (event: AnalyticsEvent): Promise<void> => {
    // Only send analytics in production
    if (!isAnalyticsAvailable()) {
        console.debug('[Analytics]', event.eventType, event);
        return;
    }

    try {
        await fetch('/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });
    } catch (error) {
        // Silently fail - analytics should never break the app
        console.warn('[Analytics] Failed to track event:', error);
    }
};

/**
 * Track when a user opens a studio.
 */
export const trackStudioOpen = (studio: string): void => {
    trackEvent({
        eventType: 'studio_open',
        studio,
        action: 'open'
    });
};

/**
 * Track when a generation starts.
 */
export const trackGenerationStart = (
    studio: string,
    model: string,
    count: number = 1
): void => {
    trackEvent({
        eventType: 'generation_start',
        studio,
        model,
        count,
        action: 'generate'
    });
};

/**
 * Track when a generation completes successfully.
 */
export const trackGenerationComplete = (
    studio: string,
    model: string,
    count: number = 1,
    duration_ms?: number
): void => {
    trackEvent({
        eventType: 'generation_complete',
        studio,
        model,
        count,
        duration_ms,
        action: 'generate'
    });
};

/**
 * Track when a generation fails.
 */
export const trackGenerationError = (
    studio: string,
    model: string,
    error: string
): void => {
    trackEvent({
        eventType: 'generation_error',
        studio,
        model,
        error,
        action: 'generate'
    });
};

/**
 * Track a generic user action.
 */
export const trackAction = (
    studio: string,
    action: string,
    metadata?: Record<string, any>
): void => {
    trackEvent({
        eventType: 'action',
        studio,
        action,
        metadata
    });
};
