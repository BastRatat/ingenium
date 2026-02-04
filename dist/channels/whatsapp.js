/**
 * WhatsApp channel implementation using Node.js WebSocket bridge.
 */
import WebSocket from 'ws';
import { BaseChannel } from './base.js';
/**
 * WhatsApp channel that connects to a Node.js bridge.
 *
 * The bridge uses @whiskeysockets/baileys to handle the WhatsApp Web protocol.
 * Communication between TypeScript and the bridge is via WebSocket.
 */
export class WhatsAppChannel extends BaseChannel {
    name = 'whatsapp';
    ws = null;
    connected = false;
    whatsappConfig;
    reconnectDelay = 5000;
    constructor(config, bus) {
        super(config, bus);
        this.whatsappConfig = config;
    }
    async start() {
        const bridgeUrl = this.whatsappConfig.bridgeUrl;
        console.log(`Connecting to WhatsApp bridge at ${bridgeUrl}...`);
        this._running = true;
        while (this._running) {
            try {
                await this.connect(bridgeUrl);
            }
            catch (error) {
                this.connected = false;
                this.ws = null;
                if (this._running) {
                    console.warn(`WhatsApp bridge connection error: ${error}`);
                    console.log(`Reconnecting in ${this.reconnectDelay / 1000} seconds...`);
                    await this.sleep(this.reconnectDelay);
                }
            }
        }
    }
    async connect(url) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            ws.on('open', () => {
                this.ws = ws;
                this.connected = true;
                console.log('Connected to WhatsApp bridge');
            });
            ws.on('message', async (data) => {
                try {
                    const message = data.toString();
                    await this.handleBridgeMessage(message);
                }
                catch (error) {
                    console.error('Error handling bridge message:', error);
                }
            });
            ws.on('close', () => {
                this.connected = false;
                this.ws = null;
                if (this._running) {
                    reject(new Error('Connection closed'));
                }
                else {
                    resolve();
                }
            });
            ws.on('error', (error) => {
                reject(error);
            });
        });
    }
    async stop() {
        this._running = false;
        this.connected = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    async send(msg) {
        if (!this.ws || !this.connected) {
            console.warn('WhatsApp bridge not connected');
            return;
        }
        try {
            const payload = JSON.stringify({
                type: 'send',
                to: msg.chatId,
                text: msg.content,
            });
            this.ws.send(payload);
        }
        catch (error) {
            console.error('Error sending WhatsApp message:', error);
        }
    }
    async handleBridgeMessage(raw) {
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch {
            console.warn(`Invalid JSON from bridge: ${raw.slice(0, 100)}`);
            return;
        }
        switch (data.type) {
            case 'message': {
                const sender = data.sender ?? '';
                let content = data.content ?? '';
                // Extract phone number from JID (e.g., "1234567890@s.whatsapp.net")
                const chatId = sender.includes('@') ? sender.split('@')[0] ?? sender : sender;
                // Handle voice messages (transcription not yet supported)
                if (content === '[Voice Message]') {
                    content = '[Voice Message: Transcription not available for WhatsApp yet]';
                }
                await this.handleMessage({
                    senderId: chatId ?? '',
                    chatId: sender, // Use full JID for replies
                    content,
                    metadata: {
                        messageId: data.id,
                        timestamp: data.timestamp,
                        isGroup: data.isGroup ?? false,
                    },
                });
                break;
            }
            case 'status': {
                const status = data.status;
                console.log(`WhatsApp status: ${status}`);
                if (status === 'connected') {
                    this.connected = true;
                }
                else if (status === 'disconnected') {
                    this.connected = false;
                }
                break;
            }
            case 'qr':
                console.log('Scan QR code in the bridge terminal to connect WhatsApp');
                break;
            case 'error':
                console.error(`WhatsApp bridge error: ${data.error}`);
                break;
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
/**
 * Create a WhatsApp channel.
 */
export function createWhatsAppChannel(config, bus) {
    return new WhatsAppChannel(config, bus);
}
//# sourceMappingURL=whatsapp.js.map