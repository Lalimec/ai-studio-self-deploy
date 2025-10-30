// A simple user ID to simulate different users. In a real app with authentication,
// this would be a hashed or anonymized user identifier provided by the backend.
const getUserId = () => {
    try {
        let userId = sessionStorage.getItem('ai_studio_user_id');
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            sessionStorage.setItem('ai_studio_user_id', userId);
        }
        return userId;
    } catch (e) {
        // sessionStorage might not be available (e.g., in some privacy modes)
        return 'user_unknown';
    }
};

interface LogPayload {
    [key: string]: any;
}

/**
 * Emits a structured log to the console in a format that Google Cloud Logging can parse.
 * This allows for creating log-based metrics and custom dashboards in Cloud Monitoring.
 * 
 * @param eventType A clear, machine-readable name for the event (e.g., 'GENERATE_HAIRSTYLES').
 * @param payload An object containing relevant parameters for the event.
 */
export const logUserAction = (eventType: string, payload: LogPayload = {}) => {
    const logEntry = {
        // Standard keys recognized by Cloud Logging
        severity: 'INFO',
        message: `User action: ${eventType}`,
        
        // Custom structured payload for filtering and metrics
        jsonPayload: {
            event_type: eventType,
            user_id: getUserId(),
            timestamp: new Date().toISOString(),
            ...payload,
        },
    };

    // console.log writes to stdout, which is captured by Cloud Run's logging agent.
    // JSON.stringify ensures it's a single, parsable log line.
    console.log(JSON.stringify(logEntry));
};
