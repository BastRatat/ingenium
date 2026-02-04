/**
 * WhatsApp channel implementation using Node.js WebSocket bridge.
 */
import type { OutboundMessage } from '../bus/events.js';
import type { MessageBus } from '../bus/queue.js';
import type { WhatsAppConfig } from '../config/schema.js';
import { BaseChannel } from './base.js';
/**
 * WhatsApp channel that connects to a Node.js bridge.
 *
 * The bridge uses @whiskeysockets/baileys to handle the WhatsApp Web protocol.
 * Communication between TypeScript and the bridge is via WebSocket.
 */
export declare class WhatsAppChannel extends BaseChannel {
    readonly name = "whatsapp";
    private ws;
    private connected;
    private whatsappConfig;
    private reconnectDelay;
    constructor(config: WhatsAppConfig, bus: MessageBus);
    start(): Promise<void>;
    private connect;
    stop(): Promise<void>;
    send(msg: OutboundMessage): Promise<void>;
    private handleBridgeMessage;
    private sleep;
}
/**
 * Create a WhatsApp channel.
 */
export declare function createWhatsAppChannel(config: WhatsAppConfig, bus: MessageBus): WhatsAppChannel;
//# sourceMappingURL=whatsapp.d.ts.map