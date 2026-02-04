/**
 * Event bus events module.
 */
/**
 * Get the session key for an inbound message.
 * @param msg - Inbound message
 * @returns Session key in format "channel:chatId"
 */
export function getSessionKey(msg) {
    return `${msg.channel}:${msg.chatId}`;
}
/**
 * Create an inbound message with defaults.
 * @param partial - Partial message data
 * @returns Complete InboundMessage
 */
export function createInboundMessage(partial) {
    return {
        channel: partial.channel,
        senderId: partial.senderId,
        chatId: partial.chatId,
        content: partial.content,
        timestamp: partial.timestamp ?? new Date(),
        media: partial.media ?? [],
        metadata: partial.metadata ?? {},
    };
}
/**
 * Create an outbound message.
 * @param partial - Message data
 * @returns Complete OutboundMessage
 */
export function createOutboundMessage(partial) {
    const msg = {
        channel: partial.channel,
        chatId: partial.chatId,
        content: partial.content,
    };
    // Only set optional properties if they have values
    // (exactOptionalPropertyTypes doesn't allow undefined assignment)
    if (partial.replyTo !== undefined) {
        msg.replyTo = partial.replyTo;
    }
    if (partial.media !== undefined) {
        msg.media = partial.media;
    }
    if (partial.metadata !== undefined) {
        msg.metadata = partial.metadata;
    }
    return msg;
}
//# sourceMappingURL=events.js.map