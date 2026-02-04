/**
 * Async queue implementation for TypeScript.
 * Equivalent to Python's asyncio.Queue.
 */

/**
 * Error thrown when an async operation times out.
 */
export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Async queue equivalent to Python's asyncio.Queue.
 * Provides async get() that blocks until an item is available.
 */
export class AsyncQueue<T> {
  private queue: T[] = [];
  private resolvers: Array<(value: T) => void> = [];

  /**
   * Add an item to the queue.
   * If consumers are waiting, immediately deliver to first waiter.
   */
  async put(item: T): Promise<void> {
    if (this.resolvers.length > 0) {
      // Consumer waiting - deliver directly
      const resolve = this.resolvers.shift()!;
      resolve(item);
    } else {
      // No consumer waiting - queue the item
      this.queue.push(item);
    }
  }

  /**
   * Get an item from the queue.
   * Blocks (awaits) if queue is empty until an item is available.
   */
  async get(): Promise<T> {
    if (this.queue.length > 0) {
      // Item available - return immediately
      return this.queue.shift()!;
    }

    // No item - wait for one
    return new Promise<T>((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  /**
   * Try to get an item without blocking.
   * Returns undefined if queue is empty.
   */
  tryGet(): T | undefined {
    return this.queue.shift();
  }

  /**
   * Check if queue is empty.
   */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Number of items currently in queue.
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Number of consumers waiting for items.
   */
  get waitingConsumers(): number {
    return this.resolvers.length;
  }
}

/**
 * Run a promise with a timeout.
 * @param promise - Promise to run
 * @param ms - Timeout in milliseconds
 * @param message - Optional error message
 * @returns Promise result or throws TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new TimeoutError(message ?? `Timeout after ${ms}ms`)),
      ms
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Bounded queue that applies backpressure when full.
 * put() will wait until there's room in the queue.
 */
export class BoundedQueue<T> {
  private queue: T[] = [];
  private getResolvers: Array<(value: T) => void> = [];
  private putResolvers: Array<() => void> = [];

  constructor(private readonly maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be positive');
    }
  }

  /**
   * Add item to queue. Blocks if queue is at capacity.
   */
  async put(item: T): Promise<void> {
    // Wait until there's room
    while (this.queue.length >= this.maxSize) {
      await new Promise<void>((resolve) => {
        this.putResolvers.push(resolve);
      });
    }

    if (this.getResolvers.length > 0) {
      // Consumer waiting - deliver directly
      const resolve = this.getResolvers.shift()!;
      resolve(item);
    } else {
      this.queue.push(item);
    }
  }

  /**
   * Get item from queue. Blocks if queue is empty.
   */
  async get(): Promise<T> {
    if (this.queue.length > 0) {
      const item = this.queue.shift()!;

      // Notify a waiting producer that there's room
      if (this.putResolvers.length > 0) {
        const resolve = this.putResolvers.shift()!;
        resolve();
      }

      return item;
    }

    return new Promise<T>((resolve) => {
      this.getResolvers.push(resolve);
    });
  }

  get size(): number {
    return this.queue.length;
  }

  get isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }
}
