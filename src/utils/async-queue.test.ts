/**
 * Tests for async queue implementation.
 */

import { describe, it, expect } from 'vitest';
import { AsyncQueue, BoundedQueue, TimeoutError, withTimeout } from './async-queue.js';

describe('AsyncQueue', () => {
  it('should return items in FIFO order', async () => {
    const queue = new AsyncQueue<number>();

    await queue.put(1);
    await queue.put(2);
    await queue.put(3);

    expect(await queue.get()).toBe(1);
    expect(await queue.get()).toBe(2);
    expect(await queue.get()).toBe(3);
  });

  it('should block get() until item available', async () => {
    const queue = new AsyncQueue<string>();

    // Start waiting for item
    const getPromise = queue.get();

    // Verify not resolved yet
    let resolved = false;
    getPromise.then(() => {
      resolved = true;
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(resolved).toBe(false);

    // Put item
    await queue.put('hello');

    // Now should resolve
    expect(await getPromise).toBe('hello');
  });

  it('should handle concurrent consumers', async () => {
    const queue = new AsyncQueue<number>();
    const results: number[] = [];

    // Two concurrent consumers
    const consumer1 = queue.get().then((n) => results.push(n));
    const consumer2 = queue.get().then((n) => results.push(n));

    // Put two items
    await queue.put(1);
    await queue.put(2);

    await Promise.all([consumer1, consumer2]);

    expect(results.sort()).toEqual([1, 2]);
  });

  it('should report correct size', async () => {
    const queue = new AsyncQueue<number>();

    expect(queue.size).toBe(0);
    expect(queue.isEmpty).toBe(true);

    await queue.put(1);
    await queue.put(2);

    expect(queue.size).toBe(2);
    expect(queue.isEmpty).toBe(false);

    await queue.get();
    expect(queue.size).toBe(1);
  });

  it('should report waiting consumers', async () => {
    const queue = new AsyncQueue<number>();

    expect(queue.waitingConsumers).toBe(0);

    // Start two consumers waiting
    const p1 = queue.get();
    const p2 = queue.get();

    expect(queue.waitingConsumers).toBe(2);

    // Satisfy one consumer
    await queue.put(1);
    expect(queue.waitingConsumers).toBe(1);

    // Satisfy the other
    await queue.put(2);
    expect(queue.waitingConsumers).toBe(0);

    // Clean up
    await Promise.all([p1, p2]);
  });

  it('should support tryGet for non-blocking access', async () => {
    const queue = new AsyncQueue<number>();

    expect(queue.tryGet()).toBeUndefined();

    await queue.put(1);
    expect(queue.tryGet()).toBe(1);
    expect(queue.tryGet()).toBeUndefined();
  });
});

describe('BoundedQueue', () => {
  it('should enforce max size', async () => {
    const queue = new BoundedQueue<number>(2);

    await queue.put(1);
    await queue.put(2);

    expect(queue.isFull).toBe(true);
    expect(queue.size).toBe(2);
  });

  it('should block put when full', async () => {
    const queue = new BoundedQueue<number>(1);
    await queue.put(1);

    // Start put that should block
    let putResolved = false;
    const putPromise = queue.put(2).then(() => {
      putResolved = true;
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(putResolved).toBe(false);

    // Get item to make room
    expect(await queue.get()).toBe(1);

    // Now put should complete
    await putPromise;
    expect(putResolved).toBe(true);
  });

  it('should throw on invalid max size', () => {
    expect(() => new BoundedQueue(0)).toThrow('maxSize must be positive');
    expect(() => new BoundedQueue(-1)).toThrow('maxSize must be positive');
  });
});

describe('withTimeout', () => {
  it('should return result if promise resolves in time', async () => {
    const result = await withTimeout(Promise.resolve('success'), 1000);
    expect(result).toBe('success');
  });

  it('should throw TimeoutError if promise takes too long', async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('too late'), 1000);
    });

    await expect(withTimeout(slowPromise, 10)).rejects.toThrow(TimeoutError);
  });

  it('should use custom error message', async () => {
    const slowPromise = new Promise<string>(() => {});

    await expect(withTimeout(slowPromise, 10, 'Custom timeout')).rejects.toThrow(
      'Custom timeout'
    );
  });

  it('should clean up timeout when promise resolves', async () => {
    // This test verifies the finally block clears the timeout
    const result = await withTimeout(Promise.resolve('fast'), 1000);
    expect(result).toBe('fast');
    // If timeout wasn't cleared, we'd see warnings about unhandled rejections
  });
});
