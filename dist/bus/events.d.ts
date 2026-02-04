/**
 * Event bus events module.
 */
/**
 * Message received from a chat channel.
 */
export interface InboundMessage {
    /** Channel identifier: telegram, whatsapp, cli, system */
    channel: string;
    /** User identifier */
    senderId: string;
    /** Chat/channel identifier */
    chatId: string;
    /** Message text content */
    content: string;
    /** When the message was received */
    timestamp: Date;
    /** Media URLs attached to message */
    media: string[];
    /** Channel-specific metadata */
    metadata: Record<string, unknown>;
}
/**
 * Message to send to a chat channel.
 */
export interface OutboundMessage {
    /** Target channel */
    channel: string;
    /** Target chat identifier */
    chatId: string;
    /** Message content to send */
    content: string;
    /** Optional message to reply to */
    replyTo?: string;
    /** Optional media URLs to attach */
    media?: string[];
    /** Optional channel-specific metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Get the session key for an inbound message.
 * @param msg - Inbound message
 * @returns Session key in format "channel:chatId"
 */
export declare function getSessionKey(msg: InboundMessage): string;
/**
 * Create an inbound message with defaults.
 * @param partial - Partial message data
 * @returns Complete InboundMessage
 */
export declare function createInboundMessage(partial: Omit<InboundMessage, 'timestamp' | 'media' | 'metadata'> & {
    timestamp?: Date;
    media?: string[];
    metadata?: Record<string, unknown>;
}): InboundMessage;
/**
 * Create an outbound message.
 * @param partial - Message data
 * @returns Complete OutboundMessage
 */
export declare function createOutboundMessage(partial: Pick<OutboundMessage, 'channel' | 'chatId' | 'content'> & {
    replyTo?: string;
    media?: string[];
    metadata?: Record<string, unknown>;
}): OutboundMessage;
//# sourceMappingURL=events.d.ts.map