/**
 * Event bus queue module.
 */

import type { Logger } from '../types/index.js';
import { AsyncQueue, withTimeout } from '../utils/async-queue.js';
import type { InboundMessage, OutboundMessage } from './events.js';

/**
 * Callback type for outbound message subscribers.
 */
export type OutboundSubscriber = (msg: OutboundMessage) => Promise<void>;

/**
 * Async message bus that decouples chat channels from the agent core.
 *
 * Channels push messages to the inbound queue, and the agent processes
 * them and pushes responses to the outbound queue.
 */
export class MessageBus {
  readonly inbound = new AsyncQueue<InboundMessage>();
  readonly outbound = new AsyncQueue<OutboundMessage>();

  private readonly outboundSubscribers = new Map<string, OutboundSubscriber[]>();
  private running = false;

  constructor(private readonly logger?: Logger) {}

  /**
   * Publish a message from a channel to the agent.
   */
  async publishInbound(msg: InboundMessage): Promise<void> {
    await this.inbound.put(msg);
  }

  /**
   * Consume the next inbound message (blocks until available).
   */
  async consumeInbound(): Promise<InboundMessage> {
    return this.inbound.get();
  }

  /**
   * Publish a response from the agent to channels.
   */
  async publishOutbound(msg: OutboundMessage): Promise<void> {
    await this.outbound.put(msg);
  }

  /**
   * Consume the next outbound message (blocks until available).
   */
  async consumeOutbound(): Promise<OutboundMessage> {
    return this.outbound.get();
  }

  /**
   * Subscribe to outbound messages for a specific channel.
   */
  subscribeOutbound(channel: string, callback: OutboundSubscriber): void {
    const subscribers = this.outboundSubscribers.get(channel);
    if (subscribers) {
      subscribers.push(callback);
    } else {
      this.outboundSubscribers.set(channel, [callback]);
    }
  }

  /**
   * Unsubscribe a callback from a channel.
   */
  unsubscribeOutbound(channel: string, callback: OutboundSubscriber): void {
    const subscribers = this.outboundSubscribers.get(channel);
    if (subscribers) {
      const index = subscribers.indexOf(callback);
      if (index !== -1) {
        subscribers.splice(index, 1);
      }
    }
  }

  /**
   * Dispatch outbound messages to subscribed channels.
   * Run this as a background task.
   */
  async dispatchOutbound(): Promise<void> {
    this.running = true;

    while (this.running) {
      try {
        // Use timeout to periodically check running flag
        const msg = await withTimeout(this.outbound.get(), 1000);

        const subscribers = this.outboundSubscribers.get(msg.channel) ?? [];
        for (const callback of subscribers) {
          try {
            await callback(msg);
          } catch (error) {
            this.logger?.error(
              { error, channel: msg.channel },
              'Error dispatching to channel'
            );
          }
        }
      } catch (error) {
        // Timeout is expected - continue loop
        if (error instanceof Error && error.name === 'TimeoutError') {
          continue;
        }
        // Log unexpected errors
        this.logger?.error({ error }, 'Unexpected error in dispatch loop');
      }
    }
  }

  /**
   * Stop the dispatcher loop.
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Check if the dispatcher is running.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Number of pending inbound messages.
   */
  get inboundSize(): number {
    return this.inbound.size;
  }

  /**
   * Number of pending outbound messages.
   */
  get outboundSize(): number {
    return this.outbound.size;
  }
}
