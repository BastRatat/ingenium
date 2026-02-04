/**
 * Event bus queue module.
 */
import { AsyncQueue, withTimeout } from '../utils/async-queue.js';
/**
 * Async message bus that decouples chat channels from the agent core.
 *
 * Channels push messages to the inbound queue, and the agent processes
 * them and pushes responses to the outbound queue.
 */
export class MessageBus {
    logger;
    inbound = new AsyncQueue();
    outbound = new AsyncQueue();
    outboundSubscribers = new Map();
    running = false;
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Publish a message from a channel to the agent.
     */
    async publishInbound(msg) {
        await this.inbound.put(msg);
    }
    /**
     * Consume the next inbound message (blocks until available).
     */
    async consumeInbound() {
        return this.inbound.get();
    }
    /**
     * Publish a response from the agent to channels.
     */
    async publishOutbound(msg) {
        await this.outbound.put(msg);
    }
    /**
     * Consume the next outbound message (blocks until available).
     */
    async consumeOutbound() {
        return this.outbound.get();
    }
    /**
     * Subscribe to outbound messages for a specific channel.
     */
    subscribeOutbound(channel, callback) {
        const subscribers = this.outboundSubscribers.get(channel);
        if (subscribers) {
            subscribers.push(callback);
        }
        else {
            this.outboundSubscribers.set(channel, [callback]);
        }
    }
    /**
     * Unsubscribe a callback from a channel.
     */
    unsubscribeOutbound(channel, callback) {
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
    async dispatchOutbound() {
        this.running = true;
        while (this.running) {
            try {
                // Use timeout to periodically check running flag
                const msg = await withTimeout(this.outbound.get(), 1000);
                const subscribers = this.outboundSubscribers.get(msg.channel) ?? [];
                for (const callback of subscribers) {
                    try {
                        await callback(msg);
                    }
                    catch (error) {
                        this.logger?.error({ error, channel: msg.channel }, 'Error dispatching to channel');
                    }
                }
            }
            catch (error) {
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
    stop() {
        this.running = false;
    }
    /**
     * Check if the dispatcher is running.
     */
    get isRunning() {
        return this.running;
    }
    /**
     * Number of pending inbound messages.
     */
    get inboundSize() {
        return this.inbound.size;
    }
    /**
     * Number of pending outbound messages.
     */
    get outboundSize() {
        return this.outbound.size;
    }
}
//# sourceMappingURL=queue.js.map