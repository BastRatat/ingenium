/**
 * Channel manager for coordinating chat channels.
 */
import type { MessageBus } from '../bus/queue.js';
import type { Config } from '../config/schema.js';
import type { Channel } from './base.js';
/**
 * Channel status information.
 */
export interface ChannelStatus {
    enabled: boolean;
    running: boolean;
}
/**
 * Manages chat channels and coordinates message routing.
 *
 * Responsibilities:
 * - Initialize enabled channels (Telegram, WhatsApp, etc.)
 * - Start/stop channels
 * - Route outbound messages
 */
export declare class ChannelManager {
    private config;
    private bus;
    private channels;
    private dispatchTask;
    private dispatchRunning;
    constructor(config: Config, bus: MessageBus);
    private initChannels;
    /**
     * Start all enabled channels and the outbound dispatcher.
     */
    startAll(): Promise<void>;
    /**
     * Stop all channels and the dispatcher.
     */
    stopAll(): Promise<void>;
    private dispatchOutbound;
    /**
     * Get a channel by name.
     */
    getChannel(name: string): Channel | undefined;
    /**
     * Get status of all channels.
     */
    getStatus(): Record<string, ChannelStatus>;
    /**
     * Get list of enabled channel names.
     */
    get enabledChannels(): string[];
    /**
     * Register a custom channel.
     */
    registerChannel(channel: Channel): void;
    /**
     * Unregister a channel by name.
     */
    unregisterChannel(name: string): void;
}
/**
 * Create a channel manager.
 */
export declare function createChannelManager(config: Config, bus: MessageBus): ChannelManager;
//# sourceMappingURL=manager.d.ts.map