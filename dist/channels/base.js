/**
 * Base channel interface for chat platforms.
 */
import { createInboundMessage } from '../bus/events.js';
/**
 * Base implementation for channels with common functionality.
 */
export class BaseChannel {
    _running = false;
    config;
    bus;
    constructor(config, bus) {
        this.config = config;
        this.bus = bus;
    }
    get isRunning() {
        return this._running;
    }
    /**
     * Check if a sender is allowed to use this bot.
     */
    isAllowed(senderId) {
        const allowList = this.config.allowFrom;
        // If no allow list, allow everyone
        if (!allowList || allowList.length === 0) {
            return true;
        }
        const senderStr = String(senderId);
        if (allowList.includes(senderStr)) {
            return true;
        }
        // Handle composite IDs like "12345|username"
        if (senderStr.includes('|')) {
            for (const part of senderStr.split('|')) {
                if (part && allowList.includes(part)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Handle an incoming message from the chat platform.
     * Checks permissions and forwards to the bus.
     */
    async handleMessage(options) {
        if (!this.isAllowed(options.senderId)) {
            return;
        }
        const msgOptions = {
            channel: this.name,
            senderId: String(options.senderId),
            chatId: String(options.chatId),
            content: options.content,
        };
        if (options.media) {
            msgOptions.media = options.media;
        }
        if (options.metadata) {
            msgOptions.metadata = options.metadata;
        }
        const msg = createInboundMessage(msgOptions);
        await this.bus.publishInbound(msg);
    }
}
//# sourceMappingURL=base.js.map