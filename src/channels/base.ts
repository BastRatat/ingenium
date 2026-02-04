/**
 * Base channel interface for chat platforms.
 */

import type { OutboundMessage } from '../bus/events.js';
import { createInboundMessage } from '../bus/events.js';
import type { MessageBus } from '../bus/queue.js';

/**
 * Base channel configuration interface.
 */
export interface ChannelConfig {
  enabled: boolean;
  allowFrom: string[];
}

/**
 * Abstract interface for chat channel implementations.
 *
 * Each channel (Telegram, WhatsApp, etc.) should implement this interface
 * to integrate with the ingenium message bus.
 */
export interface Channel {
  /**
   * Channel name (e.g., 'telegram', 'whatsapp').
   */
  readonly name: string;

  /**
   * Whether the channel is currently running.
   */
  readonly isRunning: boolean;

  /**
   * Start the channel and begin listening for messages.
   */
  start(): Promise<void>;

  /**
   * Stop the channel and clean up resources.
   */
  stop(): Promise<void>;

  /**
   * Send a message through this channel.
   */
  send(message: OutboundMessage): Promise<void>;
}

/**
 * Base implementation for channels with common functionality.
 */
export abstract class BaseChannel implements Channel {
  abstract readonly name: string;
  protected _running = false;
  protected config: ChannelConfig;
  protected bus: MessageBus;

  constructor(config: ChannelConfig, bus: MessageBus) {
    this.config = config;
    this.bus = bus;
  }

  get isRunning(): boolean {
    return this._running;
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract send(message: OutboundMessage): Promise<void>;

  /**
   * Check if a sender is allowed to use this bot.
   */
  protected isAllowed(senderId: string): boolean {
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
  protected async handleMessage(options: {
    senderId: string;
    chatId: string;
    content: string;
    media?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.isAllowed(options.senderId)) {
      return;
    }

    const msgOptions: Parameters<typeof createInboundMessage>[0] = {
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
