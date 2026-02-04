/**
 * Telegram channel implementation using Telegraf.
 */
import type { OutboundMessage } from '../bus/events.js';
import type { MessageBus } from '../bus/queue.js';
import type { TelegramConfig } from '../config/schema.js';
import { BaseChannel } from './base.js';
/**
 * Telegram channel using Telegraf with long polling.
 */
export declare class TelegramChannel extends BaseChannel {
    readonly name = "telegram";
    private bot;
    private telegramConfig;
    private transcriber;
    private mediaDir;
    constructor(config: TelegramConfig, bus: MessageBus, groqApiKey?: string);
    start(): Promise<void>;
    stop(): Promise<void>;
    send(msg: OutboundMessage): Promise<void>;
    private handleTelegramMessage;
}
/**
 * Create a Telegram channel.
 */
export declare function createTelegramChannel(config: TelegramConfig, bus: MessageBus, groqApiKey?: string): TelegramChannel;
//# sourceMappingURL=telegram.d.ts.map