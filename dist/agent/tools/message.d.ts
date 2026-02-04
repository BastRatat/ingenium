/**
 * Message tool implementation.
 */
import type { ToolParameters } from './base.js';
import { BaseTool } from './base.js';
import type { OutboundMessage } from '../../bus/events.js';
/**
 * Callback type for sending messages.
 */
export type SendCallback = (message: OutboundMessage) => Promise<void>;
/**
 * Options for message tool.
 */
export interface MessageToolOptions {
    /**
     * Callback for sending messages.
     */
    sendCallback?: SendCallback;
    /**
     * Default channel to send to.
     */
    defaultChannel?: string;
    /**
     * Default chat ID to send to.
     */
    defaultChatId?: string;
}
/**
 * Tool to send messages to users on chat channels.
 */
export declare class MessageTool extends BaseTool {
    readonly name = "message";
    readonly description = "Send a message to the user. Use this when you want to communicate something.";
    readonly parameters: ToolParameters;
    private sendCallback;
    private defaultChannel;
    private defaultChatId;
    constructor(options?: MessageToolOptions);
    /**
     * Set the current message context.
     */
    setContext(channel: string, chatId: string): void;
    /**
     * Set the callback for sending messages.
     */
    setSendCallback(callback: SendCallback): void;
    execute(params: Record<string, unknown>): Promise<string>;
}
/**
 * Create a message tool.
 */
export declare function createMessageTool(options?: MessageToolOptions): MessageTool;
//# sourceMappingURL=message.d.ts.map