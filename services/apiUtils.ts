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
