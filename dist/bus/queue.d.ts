/**
 * Event bus queue module.
 */
import type { Logger } from '../types/index.js';
import { AsyncQueue } from '../utils/async-queue.js';
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
export declare class MessageBus {
    private readonly logger?;
    readonly inbound: AsyncQueue<InboundMessage>;
    readonly outbound: AsyncQueue<OutboundMessage>;
    private readonly outboundSubscribers;
    private running;
    constructor(logger?: Logger | undefined);
    /**
     * Publish a message from a channel to the agent.
     */
    publishInbound(msg: InboundMessage): Promise<void>;
    /**
     * Consume the next inbound message (blocks until available).
     */
    consumeInbound(): Promise<InboundMessage>;
    /**
     * Publish a response from the agent to channels.
     */
    publishOutbound(msg: OutboundMessage): Promise<void>;
    /**
     * Consume the next outbound message (blocks until available).
     */
    consumeOutbound(): Promise<OutboundMessage>;
    /**
     * Subscribe to outbound messages for a specific channel.
     */
    subscribeOutbound(channel: string, callback: OutboundSubscriber): void;
    /**
     * Unsubscribe a callback from a channel.
     */
    unsubscribeOutbound(channel: string, callback: OutboundSubscriber): void;
    /**
     * Dispatch outbound messages to subscribed channels.
     * Run this as a background task.
     */
    dispatchOutbound(): Promise<void>;
    /**
     * Stop the dispatcher loop.
     */
    stop(): void;
    /**
     * Check if the dispatcher is running.
     */
    get isRunning(): boolean;
    /**
     * Number of pending inbound messages.
     */
    get inboundSize(): number;
    /**
     * Number of pending outbound messages.
     */
    get outboundSize(): number;
}
//# sourceMappingURL=queue.d.ts.map