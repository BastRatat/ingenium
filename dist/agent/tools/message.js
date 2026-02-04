/**
 * Message tool implementation.
 */
import { BaseTool } from './base.js';
import { createOutboundMessage } from '../../bus/events.js';
/**
 * Tool to send messages to users on chat channels.
 */
export class MessageTool extends BaseTool {
    name = 'message';
    description = 'Send a message to the user. Use this when you want to communicate something.';
    parameters = {
        type: 'object',
        properties: {
            content: {
                type: 'string',
                description: 'The message content to send',
            },
            channel: {
                type: 'string',
                description: 'Optional: target channel (telegram, discord, etc.)',
            },
            chat_id: {
                type: 'string',
                description: 'Optional: target chat/user ID',
            },
        },
        required: ['content'],
    };
    sendCallback;
    defaultChannel;
    defaultChatId;
    constructor(options = {}) {
        super();
        this.sendCallback = options.sendCallback;
        this.defaultChannel = options.defaultChannel ?? '';
        this.defaultChatId = options.defaultChatId ?? '';
    }
    /**
     * Set the current message context.
     */
    setContext(channel, chatId) {
        this.defaultChannel = channel;
        this.defaultChatId = chatId;
    }
    /**
     * Set the callback for sending messages.
     */
    setSendCallback(callback) {
        this.sendCallback = callback;
    }
    async execute(params) {
        const content = params['content'];
        const channel = params['channel'];
        const chatId = params['chat_id'];
        if (typeof content !== 'string') {
            return 'Error: content must be a string';
        }
        const targetChannel = typeof channel === 'string' ? channel : this.defaultChannel;
        const targetChatId = typeof chatId === 'string' ? chatId : this.defaultChatId;
        if (!targetChannel || !targetChatId) {
            return 'Error: No target channel/chat specified';
        }
        if (!this.sendCallback) {
            return 'Error: Message sending not configured';
        }
        const msg = createOutboundMessage({
            channel: targetChannel,
            chatId: targetChatId,
            content,
        });
        try {
            await this.sendCallback(msg);
            return `Message sent to ${targetChannel}:${targetChatId}`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return `Error sending message: ${message}`;
        }
    }
}
/**
 * Create a message tool.
 */
export function createMessageTool(options) {
    return new MessageTool(options);
}
//# sourceMappingURL=message.js.map