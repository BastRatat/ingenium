/**
 * Channel manager for coordinating chat channels.
 */
import { TelegramChannel } from './telegram.js';
import { WhatsAppChannel } from './whatsapp.js';
/**
 * Manages chat channels and coordinates message routing.
 *
 * Responsibilities:
 * - Initialize enabled channels (Telegram, WhatsApp, etc.)
 * - Start/stop channels
 * - Route outbound messages
 */
export class ChannelManager {
    config;
    bus;
    channels = new Map();
    dispatchTask = null;
    dispatchRunning = false;
    constructor(config, bus) {
        this.config = config;
        this.bus = bus;
        this.initChannels();
    }
    initChannels() {
        // Telegram channel
        if (this.config.channels.telegram.enabled) {
            try {
                const channel = new TelegramChannel(this.config.channels.telegram, this.bus);
                this.channels.set('telegram', channel);
                console.log('Telegram channel enabled');
            }
            catch (error) {
                console.warn(`Telegram channel not available: ${error}`);
            }
        }
        // WhatsApp channel
        if (this.config.channels.whatsapp.enabled) {
            try {
                const channel = new WhatsAppChannel(this.config.channels.whatsapp, this.bus);
                this.channels.set('whatsapp', channel);
                console.log('WhatsApp channel enabled');
            }
            catch (error) {
                console.warn(`WhatsApp channel not available: ${error}`);
            }
        }
    }
    /**
     * Start all enabled channels and the outbound dispatcher.
     */
    async startAll() {
        if (this.channels.size === 0) {
            console.warn('No channels enabled');
            return;
        }
        // Start outbound dispatcher
        this.dispatchRunning = true;
        this.dispatchTask = this.dispatchOutbound();
        // Start all channels concurrently
        const startPromises = [];
        for (const [name, channel] of this.channels) {
            console.log(`Starting ${name} channel...`);
            startPromises.push(channel.start().catch((error) => {
                console.error(`Error starting ${name} channel:`, error);
            }));
        }
        // Wait for all channels (they should run forever)
        await Promise.all(startPromises);
    }
    /**
     * Stop all channels and the dispatcher.
     */
    async stopAll() {
        console.log('Stopping all channels...');
        // Stop dispatcher
        this.dispatchRunning = false;
        if (this.dispatchTask) {
            // The dispatch loop will exit on its own
            await this.dispatchTask.catch(() => { });
            this.dispatchTask = null;
        }
        // Stop all channels
        for (const [name, channel] of this.channels) {
            try {
                await channel.stop();
                console.log(`Stopped ${name} channel`);
            }
            catch (error) {
                console.error(`Error stopping ${name}:`, error);
            }
        }
    }
    async dispatchOutbound() {
        console.log('Outbound dispatcher started');
        while (this.dispatchRunning) {
            try {
                // Use timeout to allow checking dispatchRunning flag
                const msg = await Promise.race([
                    this.bus.consumeOutbound(),
                    new Promise((resolve) => setTimeout(() => resolve(null), 1000)),
                ]);
                if (msg === null)
                    continue;
                const channel = this.channels.get(msg.channel);
                if (channel) {
                    try {
                        await channel.send(msg);
                    }
                    catch (error) {
                        console.error(`Error sending to ${msg.channel}:`, error);
                    }
                }
                else {
                    console.warn(`Unknown channel: ${msg.channel}`);
                }
            }
            catch (error) {
                if (this.dispatchRunning) {
                    console.error('Dispatch error:', error);
                }
            }
        }
    }
    /**
     * Get a channel by name.
     */
    getChannel(name) {
        return this.channels.get(name);
    }
    /**
     * Get status of all channels.
     */
    getStatus() {
        const status = {};
        for (const [name, channel] of this.channels) {
            status[name] = {
                enabled: true,
                running: channel.isRunning,
            };
        }
        return status;
    }
    /**
     * Get list of enabled channel names.
     */
    get enabledChannels() {
        return Array.from(this.channels.keys());
    }
    /**
     * Register a custom channel.
     */
    registerChannel(channel) {
        this.channels.set(channel.name, channel);
    }
    /**
     * Unregister a channel by name.
     */
    unregisterChannel(name) {
        this.channels.delete(name);
    }
}
/**
 * Create a channel manager.
 */
export function createChannelManager(config, bus) {
    return new ChannelManager(config, bus);
}
//# sourceMappingURL=manager.js.map