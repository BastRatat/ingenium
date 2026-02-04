/**
 * Base channel interface for chat platforms.
 */
import type { OutboundMessage } from '../bus/events.js';
import type { MessageBus } from '../bus/queue.js';
/**
 * Base channel configuration interface.
 */
export interface ChannelConfig {
    enabled: boolean;
    allowFrom: string[];
}
/**
 * Abstract interface for chat channel implementations.
 *
 * Each channel (Telegram, WhatsApp, etc.) should implement this interface
 * to integrate with the ingenium message bus.
 */
export interface Channel {
    /**
     * Channel name (e.g., 'telegram', 'whatsapp').
     */
    readonly name: string;
    /**
     * Whether the channel is currently running.
     */
    readonly isRunning: boolean;
    /**
     * Start the channel and begin listening for messages.
     */
    start(): Promise<void>;
    /**
     * Stop the channel and clean up resources.
     */
    stop(): Promise<void>;
    /**
     * Send a message through this channel.
     */
    send(message: OutboundMessage): Promise<void>;
}
/**
 * Base implementation for channels with common functionality.
 */
export declare abstract class BaseChannel implements Channel {
    abstract readonly name: string;
    protected _running: boolean;
    protected config: ChannelConfig;
    protected bus: MessageBus;
    constructor(config: ChannelConfig, bus: MessageBus);
    get isRunning(): boolean;
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
    abstract send(message: OutboundMessage): Promise<void>;
    /**
     * Check if a sender is allowed to use this bot.
     */
    protected isAllowed(senderId: string): boolean;
    /**
     * Handle an incoming message from the chat platform.
     * Checks permissions and forwards to the bus.
     */
    protected handleMessage(options: {
        senderId: string;
        chatId: string;
        content: string;
        media?: string[];
        metadata?: Record<string, unknown>;
    }): Promise<void>;
}
//# sourceMappingURL=base.d.ts.map