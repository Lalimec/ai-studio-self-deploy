/**
 * Checks if the webhook proxy is available (production environment with server).
 * The proxy is available when service worker is registered (which only happens when
 * the server injects the registration script).
 */
const isWebhookProxyAvailable = (): boolean => {
    // In production, the server injects service worker registration
    // We can detect this by checking if we're served from the same origin
    // (not a dev server like localhost:5173)
    if (typeof window !== 'undefined') {
        // If we're on the server's port (3000) or a production domain, proxy is available
        const isDevServer = window.location.port === '5173';
        return !isDevServer;
    }
    return false;
};

/**
 * Makes a fetch request to an n8n webhook endpoint, routing through the server-side
 * proxy when available to avoid CORS issues.
 *
 * @param targetUrl - The full n8n webhook URL
 * @param payload - The JSON payload to send
 * @param options - Additional options
 * @returns The parsed JSON response
 */
export async function fetchViaWebhookProxy<T = any>(
    targetUrl: string,
    payload: any,
    options: {
        method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        maxRetries?: number;
        retryDelay?: number;
    } = {}
): Promise<T> {
    const { method = 'POST', maxRetries = 3, retryDelay = 1000 } = options;

    const useProxy = isWebhookProxyAvailable();
    const url = useProxy ? '/webhook-proxy' : targetUrl;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Add target URL header when using proxy
    if (useProxy) {
        headers['X-Target-URL'] = targetUrl;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method,
                headers,
                body: method !== 'GET' ? JSON.stringify(payload) : undefined,
            });

            if (!response.ok) {
                let errorMsg = `Request failed with status ${response.status}.`;
                try {
                    const errorBody = await response.json();
                    errorMsg = errorBody.error || errorBody.message || errorMsg;
                } catch (e) {
                    // Response was not JSON
                }
                throw new Error(errorMsg);
            }

            return await response.json() as T;
        } catch (error) {
            lastError = error as Error;

            // Check if it's a network/CORS error (TypeError with "fetch" in message)
            const isNetworkError = error instanceof TypeError &&
                (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed'));

            // Only retry on network errors, not on HTTP error responses
            if (isNetworkError && attempt < maxRetries - 1) {
                console.warn(`Network error on attempt ${attempt + 1}/${maxRetries}, retrying in ${retryDelay * Math.pow(2, attempt)}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
                continue;
            }

            // For non-network errors or last attempt, throw immediately
            break;
        }
    }

    throw lastError || new Error('Request failed after retries');
}

/**
 * Makes a fetch request to an n8n webhook endpoint that may return binary data,
 * routing through the server-side proxy when available.
 *
 * @param targetUrl - The full n8n webhook URL
 * @param payload - The JSON payload to send
 * @param options - Additional options
 * @returns The response object for custom handling
 */
export async function fetchBinaryViaWebhookProxy(
    targetUrl: string,
    payload: any,
    options: {
        method?: 'POST';
        maxRetries?: number;
        retryDelay?: number;
    } = {}
): Promise<Response> {
    const { method = 'POST', maxRetries = 3, retryDelay = 1000 } = options;

    const useProxy = isWebhookProxyAvailable();
    const url = useProxy ? '/webhook-proxy' : targetUrl;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Add headers when using proxy
    if (useProxy) {
        headers['X-Target-URL'] = targetUrl;
        headers['X-Response-Type'] = 'binary'; // Tell proxy to expect binary
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                // Try to get error message from response
                let errorMsg = `Request failed with status ${response.status}.`;
                try {
                    const errorBody = await response.clone().json();
                    errorMsg = errorBody.error || errorBody.message || errorMsg;
                } catch (e) {
                    // Response was not JSON, that's fine for binary
                }
                throw new Error(errorMsg);
            }

            return response;
        } catch (error) {
            lastError = error as Error;

            const isNetworkError = error instanceof TypeError &&
                (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed'));

            if (isNetworkError && attempt < maxRetries - 1) {
                console.warn(`Network error on attempt ${attempt + 1}/${maxRetries}, retrying...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
                continue;
            }

            break;
        }
    }

    throw lastError || new Error('Request failed after retries');
}

export async function processWithConcurrency<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    concurrency: number
): Promise<void> {
    const queue = [...items];
    const processNext = async (): Promise<void> => {
        if (queue.length === 0) return;
        const item = queue.shift()!;
        await processor(item);
        return processNext();
    };
    const workers = Array(concurrency).fill(null).map(() => processNext());
    await Promise.all(workers);
}

/**
 * Runs an array of promise-returning functions with a specified concurrency limit.
 * @param tasks - An array of functions, each returning a promise.
 * @param concurrencyLimit - The maximum number of tasks to run at once.
 * @param onTaskSuccess - A callback for each successfully resolved promise.
 * @param onTaskFail - A callback for each rejected promise.
 * @param onProgressUpdate - A callback that fires each time a task (success or fail) completes.
 * @returns The number of tasks that failed.
 */
export async function runConcurrentTasks<T>(
  tasks: (() => Promise<T>)[],
  concurrencyLimit: number,
  onTaskSuccess: (result: T) => void,
  onTaskFail: (error: any) => void,
  onProgressUpdate: (completed: number, total: number) => void
): Promise<number> {
  const totalTasks = tasks.length;
  let completedCount = 0;
  let failedCount = 0;
  const taskQueue = [...tasks];

  const worker = async () => {
    while (taskQueue.length > 0) {
      const task = taskQueue.shift();
      if (task) {
        try {
          const result = await task();
          onTaskSuccess(result);
        } catch (error) {
          failedCount++;
          onTaskFail(error);
          console.error("A generation task failed:", error);
        } finally {
          completedCount++;
          onProgressUpdate(completedCount, totalTasks);
        }
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrencyLimit, totalTasks) }, worker);
  await Promise.all(workers);

  return failedCount;
}
