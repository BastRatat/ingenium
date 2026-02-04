/**
 * Async queue implementation for TypeScript.
 * Equivalent to Python's asyncio.Queue.
 */
/**
 * Error thrown when an async operation times out.
 */
export declare class TimeoutError extends Error {
    constructor(message?: string);
}
/**
 * Async queue equivalent to Python's asyncio.Queue.
 * Provides async get() that blocks until an item is available.
 */
export declare class AsyncQueue<T> {
    private queue;
    private resolvers;
    /**
     * Add an item to the queue.
     * If consumers are waiting, immediately deliver to first waiter.
     */
    put(item: T): Promise<void>;
    /**
     * Get an item from the queue.
     * Blocks (awaits) if queue is empty until an item is available.
     */
    get(): Promise<T>;
    /**
     * Try to get an item without blocking.
     * Returns undefined if queue is empty.
     */
    tryGet(): T | undefined;
    /**
     * Check if queue is empty.
     */
    get isEmpty(): boolean;
    /**
     * Number of items currently in queue.
     */
    get size(): number;
    /**
     * Number of consumers waiting for items.
     */
    get waitingConsumers(): number;
}
/**
 * Run a promise with a timeout.
 * @param promise - Promise to run
 * @param ms - Timeout in milliseconds
 * @param message - Optional error message
 * @returns Promise result or throws TimeoutError
 */
export declare function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T>;
/**
 * Bounded queue that applies backpressure when full.
 * put() will wait until there's room in the queue.
 */
export declare class BoundedQueue<T> {
    private readonly maxSize;
    private queue;
    private getResolvers;
    private putResolvers;
    constructor(maxSize: number);
    /**
     * Add item to queue. Blocks if queue is at capacity.
     */
    put(item: T): Promise<void>;
    /**
     * Get item from queue. Blocks if queue is empty.
     */
    get(): Promise<T>;
    get size(): number;
    get isFull(): boolean;
}
//# sourceMappingURL=async-queue.d.ts.map