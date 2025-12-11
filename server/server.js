/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const https = require('https');
const path = require('path');
const WebSocket = require('ws');
const { URLSearchParams, URL } = require('url');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;
const externalApiBaseUrl = 'https://generativelanguage.googleapis.com';
const externalWsBaseUrl = 'wss://generativelanguage.googleapis.com';
// Support either API key env-var variant
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

const staticPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');


if (!apiKey) {
    // Only log an error, don't exit. The server will serve apps without proxy functionality
    console.error("Warning: GEMINI_API_KEY or API_KEY environment variable is not set! Proxy functionality will be disabled.");
}
else {
    console.log("API KEY FOUND (proxy will use this)")
}

// Limit body size to 50mb
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.set('trust proxy', 1 /* number of proxies between user and server */)

/**
 * Extract user email from IAP (Identity-Aware Proxy) headers.
 * IAP adds these headers server-side after authenticating the user.
 * Format: "accounts.google.com:user@domain.com"
 * @param {object} headers - Request headers
 * @returns {string|null} - User email or null if not available
 */
const getIAPUserEmail = (headers) => {
    const iapEmail = headers['x-goog-authenticated-user-email'];
    if (iapEmail && typeof iapEmail === 'string') {
        // Remove the "accounts.google.com:" prefix
        const parts = iapEmail.split(':');
        return parts.length > 1 ? parts[1] : iapEmail;
    }
    return null;
};

/**
 * Log request with user information from IAP headers.
 * @param {object} req - Express request object
 * @param {string} routeName - Name of the route for logging
 */
const logRequestWithUser = (req, routeName) => {
    const userEmail = getIAPUserEmail(req.headers);
    const userInfo = userEmail ? `[User: ${userEmail}]` : '[User: unknown]';
    console.log(`${routeName} ${userInfo} IP: ${req.ip} Path: ${req.path}`);
};
/**
 * Sanitize request body for logging.
 * Replaces data URLs with placeholders to avoid bloated logs.
 * @param {object} body - Request body
 * @returns {object} - Sanitized body safe for logging
 */
const sanitizeBodyForLogging = (body) => {
    if (!body || typeof body !== 'object') return body;

    const sanitized = {};
    for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string' && value.startsWith('data:')) {
            // Replace data URL with placeholder showing type and size
            const match = value.match(/^data:([^;]+)/);
            const mimeType = match ? match[1] : 'unknown';
            const sizeKB = Math.round(value.length / 1024);
            sanitized[key] = `[DATA_URL: ${mimeType}, ${sizeKB}KB]`;
        } else if (Array.isArray(value)) {
            // Handle arrays (e.g., image_urls)
            sanitized[key] = value.map(item => {
                if (typeof item === 'string' && item.startsWith('data:')) {
                    const match = item.match(/^data:([^;]+)/);
                    const mimeType = match ? match[1] : 'unknown';
                    const sizeKB = Math.round(item.length / 1024);
                    return `[DATA_URL: ${mimeType}, ${sizeKB}KB]`;
                }
                return item;
            });
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
};

/**
 * Log structured analytics event for Cloud Logging.
 * Outputs JSON format that Cloud Logging can parse and filter.
 * @param {string} eventType - Type of event (e.g., 'generation_start', 'generation_complete')
 * @param {object} data - Event data
 */
const logAnalyticsEvent = (eventType, data) => {
    // Sanitize body if present
    const sanitizedData = { ...data };
    if (sanitizedData.body) {
        sanitizedData.body = sanitizeBodyForLogging(sanitizedData.body);
    }

    const event = {
        severity: sanitizedData.error ? 'ERROR' : 'INFO',
        eventType,
        ...sanitizedData,
        timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(event));
};

/**
 * Extract model name from n8n webhook URL.
 * @param {string} url - The webhook URL
 * @returns {string} - Model name or 'unknown'
 */
const extractModelFromUrl = (url) => {
    if (!url) return 'unknown';

    // Map URL patterns to model names
    const patterns = [
        { match: 'nano-banana-pro', model: 'nano-banana-pro' },
        { match: 'nano-banana', model: 'nano-banana' },
        { match: 'seedream-v4.5', model: 'seedream-higgsfield' },
        { match: 'seedream', model: 'seedream' },
        { match: 'flux-kontext', model: 'flux' },
        { match: 'qwen', model: 'qwen' },
        { match: 'video-seedance', model: 'seedance-video' },
        { match: 'crystal-upscaler', model: 'crystal-upscaler' },
        { match: 'seedvr2-upscaler', model: 'seedvr-upscaler' },
        { match: 'marigold-depth', model: 'depth-map' },
        { match: 'stitch', model: 'video-stitcher' },
        { match: 'image-upload', model: 'image-upload' },
        { match: 'gcs-upload', model: 'video-upload' },
    ];

    for (const { match, model } of patterns) {
        if (url.includes(match)) return model;
    }

    return 'unknown';
};

/**
 * Determine studio from model name.
 * @param {string} model - Model name
 * @returns {string} - Studio name
 */
const getStudioFromModel = (model) => {
    const studioMap = {
        'nano-banana': 'image-studio',
        'nano-banana-pro': 'image-studio',
        'seedream': 'image-studio',
        'seedream-higgsfield': 'image-studio',
        'flux': 'image-studio',
        'qwen': 'image-studio',
        'seedance-video': 'video-studio',
        'crystal-upscaler': 'upscaler',
        'seedvr-upscaler': 'upscaler',
        'depth-map': 'depth-studio',
        'video-stitcher': 'video-studio',
        'image-upload': 'upload',
        'video-upload': 'upload',
    };
    return studioMap[model] || 'unknown';
};

// Rate limiter for the proxy
const proxyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // Set ratelimit window at 5min (in ms)
    max: 200, // Limit each IP to 200 requests per window
    message: 'Too many requests from this IP, please try again after 5 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // no `X-RateLimit-*` headers
    // Skip rate limiting for status check requests (polling)
    skip: (req) => {
        const targetUrl = req.headers['x-target-url'];
        if (targetUrl && typeof targetUrl === 'string') {
            // All status check URLs contain "/check/" in their path
            if (targetUrl.includes('/check/')) {
                return true; // Skip rate limiting for status checks
            }
        }
        return false;
    },
    handler: (req, res, next, options) => {
        const userEmail = getIAPUserEmail(req.headers);
        const userInfo = userEmail ? `[User: ${userEmail}]` : '';
        console.warn(`Rate limit exceeded ${userInfo} IP: ${req.ip}. Path: ${req.path}`);
        res.status(options.statusCode).send(options.message);
    }
});

// Apply the rate limiter to the /api-proxy route before the main proxy logic
app.use('/api-proxy', proxyLimiter);

// Apply the rate limiter to the /webhook-proxy route
app.use('/webhook-proxy', proxyLimiter);

// Analytics endpoint for frontend event tracking
// This allows the frontend to send structured events that get logged to Cloud Logging
app.post('/analytics', (req, res) => {
    const userEmail = getIAPUserEmail(req.headers);
    const event = req.body;

    if (!event || !event.eventType) {
        return res.status(400).json({ error: 'Missing eventType in request body' });
    }

    // Log the event with user context
    logAnalyticsEvent(event.eventType, {
        user: userEmail || event.user || 'unknown',
        studio: event.studio || 'unknown',
        model: event.model || 'unknown',
        action: event.action,
        count: event.count,
        duration_ms: event.duration_ms,
        error: event.error,
        metadata: event.metadata,
        source: 'frontend'
    });

    res.status(200).json({ success: true });
});

// Proxy route for Gemini API calls (HTTP)
app.use('/api-proxy', async (req, res, next) => {
    logRequestWithUser(req, '[API-PROXY]');
    // If the request is an upgrade request, it's for WebSockets, so pass to next middleware/handler
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        return next(); // Pass to the WebSocket upgrade handler
    }

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust as needed for security
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Goog-Api-Key');
        res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight response for 1 day
        return res.sendStatus(200);
    }

    if (req.body) { // Only log body if it exists
        console.log("  Request Body (from frontend):", req.body);
    }
    try {
        // Construct the target URL by taking the part of the path after /api-proxy/
        const targetPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
        const apiUrl = `${externalApiBaseUrl}/${targetPath}`;
        console.log(`HTTP Proxy: Forwarding request to ${apiUrl}`);

        // Prepare headers for the outgoing request
        const outgoingHeaders = {};
        // Copy most headers from the incoming request
        for (const header in req.headers) {
            // Exclude host-specific headers and others that might cause issues upstream
            if (!['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'sec-websocket-key', 'sec-websocket-version', 'sec-websocket-extensions'].includes(header.toLowerCase())) {
                outgoingHeaders[header] = req.headers[header];
            }
        }

        // Set the actual API key in the appropriate header
        outgoingHeaders['X-Goog-Api-Key'] = apiKey;

        // Set Content-Type from original request if present (for relevant methods)
        if (req.headers['content-type'] && ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            outgoingHeaders['Content-Type'] = req.headers['content-type'];
        } else if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            // Default Content-Type to application/json if no content type for post/put/patch
            outgoingHeaders['Content-Type'] = 'application/json';
        }

        // For GET or DELETE requests, ensure Content-Type is NOT sent,
        // even if the client erroneously included it.
        if (['GET', 'DELETE'].includes(req.method.toUpperCase())) {
            delete outgoingHeaders['Content-Type']; // Case-sensitive common practice
            delete outgoingHeaders['content-type']; // Just in case
        }

        // Ensure 'accept' is reasonable if not set
        if (!outgoingHeaders['accept']) {
            outgoingHeaders['accept'] = '*/*';
        }


        const axiosConfig = {
            method: req.method,
            url: apiUrl,
            headers: outgoingHeaders,
            responseType: 'stream',
            validateStatus: function (status) {
                return true; // Accept any status code, we'll pipe it through
            },
        };

        if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            axiosConfig.data = req.body;
        }
        // For GET, DELETE, etc., axiosConfig.data will remain undefined,
        // and axios will not send a request body.

        const apiResponse = await axios(axiosConfig);

        // Pass through response headers from Gemini API to the client
        // IMPORTANT: Cloud Run strips headers starting with X-Goog-* (reserved by Google)
        // So we rename them to X-Upload-* pattern that won't be stripped
        const criticalHeaders = {
            'x-goog-upload-url': 'X-Upload-URL',
            'x-goog-upload-status': 'X-Upload-Status',
            'x-goog-upload-chunk-granularity': 'X-Upload-Chunk-Granularity',
            'x-goog-upload-control-url': 'X-Upload-Control-URL',
        };

        for (const header in apiResponse.headers) {
            const lowerHeader = header.toLowerCase();

            // Rename critical upload headers to avoid Cloud Run stripping
            if (criticalHeaders[lowerHeader]) {
                const newHeaderName = criticalHeaders[lowerHeader];
                res.setHeader(newHeaderName, apiResponse.headers[header]);
                console.log(`[PROXY] Renamed header: ${header} → ${newHeaderName} = ${apiResponse.headers[header]}`);
            }
            // Pass through other headers normally
            else {
                res.setHeader(header, apiResponse.headers[header]);
            }
        }

        // Expose upload headers to the browser via CORS
        // NOTE: Cloud Run strips X-Goog-* headers, so we use X-Upload-* instead
        const exposedHeaders = [
            'X-Upload-URL',
            'X-Upload-Status',
            'X-Upload-Chunk-Granularity',
            'X-Upload-Control-URL',
        ];

        // Also expose other headers that might be useful
        for (const header in apiResponse.headers) {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.startsWith('x-guploader-') ||
                lowerHeader === 'x-google-trace' ||
                lowerHeader === 'content-length' ||
                lowerHeader === 'content-type') {
                exposedHeaders.push(header);
            }
        }

        const existingExposed = res.getHeader('Access-Control-Expose-Headers');
        const allExposed = existingExposed
            ? `${existingExposed}, ${exposedHeaders.join(', ')}`
            : exposedHeaders.join(', ');
        res.setHeader('Access-Control-Expose-Headers', allExposed);

        console.log(`[PROXY] CORS Exposed Headers: ${allExposed}`);

        res.status(apiResponse.status);


        apiResponse.data.on('data', (chunk) => {
            res.write(chunk);
        });

        apiResponse.data.on('end', () => {
            res.end();
        });

        apiResponse.data.on('error', (err) => {
            console.error('Error during streaming data from target API:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Proxy error during streaming from target' });
            } else {
                // If headers already sent, we can't send a JSON error, just end the response.
                res.end();
            }
        });

    } catch (error) {
        console.error('Proxy error before request to target API:', error);
        if (!res.headersSent) {
            if (error.response) {
                const errorData = {
                    status: error.response.status,
                    message: error.response.data?.error?.message || 'Proxy error from upstream API',
                    details: error.response.data?.error?.details || null
                };
                res.status(error.response.status).json(errorData);
            } else {
                res.status(500).json({ error: 'Proxy setup error', message: error.message });
            }
        }
    }
});

// Proxy route for n8n webhook calls (HTTP)
// This prevents CORS issues by making server-to-server requests
app.use('/webhook-proxy', async (req, res) => {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Target-URL, X-Response-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.sendStatus(200);
    }

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Get the target URL from the header
    const targetUrl = req.headers['x-target-url'];

    if (!targetUrl) {
        console.error('Webhook proxy: Missing X-Target-URL header');
        return res.status(400).json({ error: 'Missing X-Target-URL header' });
    }

    // Validate that the target URL is an allowed n8n webhook domain
    try {
        const urlObj = new URL(targetUrl);
        const allowedHosts = ['n8n.cemil.al']; // Add more allowed hosts as needed

        if (!allowedHosts.includes(urlObj.hostname)) {
            console.error(`Webhook proxy: Target host not allowed: ${urlObj.hostname}`);
            return res.status(403).json({ error: 'Target host not allowed' });
        }
    } catch (urlError) {
        console.error('Webhook proxy: Invalid target URL:', urlError);
        return res.status(400).json({ error: 'Invalid target URL' });
    }

    // Check if client expects binary response (e.g., video stitcher)
    const expectBinary = req.headers['x-response-type'] === 'binary';

    // Extract analytics context
    const userEmail = getIAPUserEmail(req.headers);
    const model = extractModelFromUrl(targetUrl);
    const studio = getStudioFromModel(model);
    const isStatusCheck = targetUrl.includes('/check/');
    const startTime = Date.now();

    // Log request start (skip status checks to reduce noise)
    if (!isStatusCheck) {
        logAnalyticsEvent('webhook_request', {
            user: userEmail || 'unknown',
            model,
            studio,
            targetUrl,
            method: req.method,
            body: req.body || {}
        });
    }

    try {
        const axiosConfig = {
            method: req.method,
            url: targetUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 300000, // 5 minute timeout for long-running operations
            validateStatus: function (status) {
                return true; // Accept any status code, we'll pass it through
            },
            // Use arraybuffer for binary responses, otherwise default
            responseType: expectBinary ? 'arraybuffer' : 'json',
        };

        // Include request body for POST/PUT/PATCH methods
        if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            axiosConfig.data = req.body;
        }

        const apiResponse = await axios(axiosConfig);
        const duration = Date.now() - startTime;

        // Log success event (skip status checks)
        if (!isStatusCheck) {
            logAnalyticsEvent('webhook_response', {
                user: userEmail || 'unknown',
                model,
                studio,
                status: apiResponse.status,
                duration_ms: duration,
                success: apiResponse.status >= 200 && apiResponse.status < 300
            });
        }

        // Pass through response headers
        for (const header in apiResponse.headers) {
            // Skip headers that might cause issues
            if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(header.toLowerCase())) {
                res.setHeader(header, apiResponse.headers[header]);
            }
        }

        res.status(apiResponse.status);

        // Handle response based on content type
        const contentType = apiResponse.headers['content-type'] || '';

        if (expectBinary || contentType.includes('video/') || contentType.includes('application/octet-stream')) {
            // Binary response - send as buffer
            res.setHeader('Content-Type', contentType || 'application/octet-stream');
            res.send(Buffer.from(apiResponse.data));
        } else {
            // JSON response
            res.json(apiResponse.data);
        }

    } catch (error) {
        const duration = Date.now() - startTime;

        // Log error event
        logAnalyticsEvent('webhook_error', {
            user: userEmail || 'unknown',
            model,
            studio,
            error: error.message,
            errorCode: error.code,
            duration_ms: duration
        });

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ error: 'Webhook service unavailable' });
        }
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'Webhook request timed out' });
        }

        return res.status(500).json({
            error: 'Webhook proxy error',
            message: error.message
        });
    }
});

const webSocketInterceptorScriptTag = `<script src="/public/websocket-interceptor.js" defer></script>`;

// Prepare service worker registration script content
const serviceWorkerRegistrationScript = `
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load' , () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
} else {
  console.log('Service workers are not supported in this browser.');
}
</script>
`;

// Serve index.html or placeholder based on API key and file availability
app.get('/', (req, res) => {
    const placeholderPath = path.join(publicPath, 'placeholder.html');

    // Try to serve index.html
    console.log("LOG: Route '/' accessed. Attempting to serve index.html.");
    const indexPath = path.join(staticPath, 'index.html');

    fs.readFile(indexPath, 'utf8', (err, indexHtmlData) => {
        if (err) {
            // index.html not found or unreadable, serve the original placeholder
            console.log('LOG: index.html not found or unreadable. Falling back to original placeholder.');
            return res.sendFile(placeholderPath);
        }

        // If API key is not set, serve original HTML without injection
        if (!apiKey) {
            console.log("LOG: API key not set. Serving original index.html without script injections.");
            return res.sendFile(indexPath);
        }

        // index.html found and apiKey set, inject scripts
        console.log("LOG: index.html read successfully. Injecting scripts.");
        let injectedHtml = indexHtmlData;


        if (injectedHtml.includes('<head>')) {
            // Inject WebSocket interceptor first, then service worker script
            injectedHtml = injectedHtml.replace(
                '<head>',
                `<head>${webSocketInterceptorScriptTag}${serviceWorkerRegistrationScript}`
            );
            console.log("LOG: Scripts injected into <head>.");
        } else {
            console.warn("WARNING: <head> tag not found in index.html. Prepending scripts to the beginning of the file as a fallback.");
            injectedHtml = `${webSocketInterceptorScriptTag}${serviceWorkerRegistrationScript}${indexHtmlData}`;
        }
        res.send(injectedHtml);
    });
});

app.get('/service-worker.js', (req, res) => {
    return res.sendFile(path.join(publicPath, 'service-worker.js'));
});

app.use('/public', express.static(publicPath));
app.use(express.static(staticPath));

// Start the HTTP server
const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`HTTP proxy active on /api-proxy/**`);
    console.log(`WebSocket proxy active on /api-proxy/**`);
    console.log(`Webhook proxy active on /webhook-proxy`);
});

// Create WebSocket server and attach it to the HTTP server
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathname = requestUrl.pathname;

    if (pathname.startsWith('/api-proxy/')) {
        if (!apiKey) {
            console.error("WebSocket proxy: API key not configured. Closing connection.");
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (clientWs) => {
            console.log('Client WebSocket connected to proxy for path:', pathname);

            const targetPathSegment = pathname.substring('/api-proxy'.length);
            const clientQuery = new URLSearchParams(requestUrl.search);
            clientQuery.set('key', apiKey);
            const targetGeminiWsUrl = `${externalWsBaseUrl}${targetPathSegment}?${clientQuery.toString()}`;
            console.log(`Attempting to connect to target WebSocket: ${targetGeminiWsUrl}`);

            const geminiWs = new WebSocket(targetGeminiWsUrl, {
                protocol: request.headers['sec-websocket-protocol'],
            });

            const messageQueue = [];

            geminiWs.on('open', () => {
                console.log('Proxy connected to Gemini WebSocket');
                // Send any queued messages
                while (messageQueue.length > 0) {
                    const message = messageQueue.shift();
                    if (geminiWs.readyState === WebSocket.OPEN) {
                        // console.log('Sending queued message from client -> Gemini');
                        geminiWs.send(message);
                    } else {
                        // Should not happen if we are in 'open' event, but good for safety
                        console.warn('Gemini WebSocket not open when trying to send queued message. Re-queuing.');
                        messageQueue.unshift(message); // Add it back to the front
                        break; // Stop processing queue for now
                    }
                }
            });

            geminiWs.on('message', (message) => {
                // console.log('Message from Gemini -> client');
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(message);
                }
            });

            geminiWs.on('close', (code, reason) => {
                console.log(`Gemini WebSocket closed: ${code} ${reason.toString()}`);
                if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
                    clientWs.close(code, reason.toString());
                }
            });

            geminiWs.on('error', (error) => {
                console.error('Error on Gemini WebSocket connection:', error);
                if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
                    clientWs.close(1011, 'Upstream WebSocket error');
                }
            });

            clientWs.on('message', (message) => {
                if (geminiWs.readyState === WebSocket.OPEN) {
                    // console.log('Message from client -> Gemini');
                    geminiWs.send(message);
                } else if (geminiWs.readyState === WebSocket.CONNECTING) {
                    // console.log('Queueing message from client -> Gemini (Gemini still connecting)');
                    messageQueue.push(message);
                } else {
                    console.warn('Client sent message but Gemini WebSocket is not open or connecting. Message dropped.');
                }
            });

            clientWs.on('close', (code, reason) => {
                console.log(`Client WebSocket closed: ${code} ${reason.toString()}`);
                if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) {
                    geminiWs.close(code, reason.toString());
                }
            });

            clientWs.on('error', (error) => {
                console.error('Error on client WebSocket connection:', error);
                if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) {
                    geminiWs.close(1011, 'Client WebSocket error');
                }
            });
        });
    } else {
        console.log(`WebSocket upgrade request for non-proxy path: ${pathname}. Closing connection.`);
        socket.destroy();
    }
});
