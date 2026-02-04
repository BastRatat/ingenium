/**
 * Channel manager for coordinating chat channels.
 */

import type { MessageBus } from '../bus/queue.js';
import type { Config } from '../config/schema.js';
import type { Channel } from './base.js';
import { TelegramChannel } from './telegram.js';
import { WhatsAppChannel } from './whatsapp.js';

/**
 * Channel status information.
 */
export interface ChannelStatus {
  enabled: boolean;
  running: boolean;
}

/**
 * Manages chat channels and coordinates message routing.
 *
 * Responsibilities:
 * - Initialize enabled channels (Telegram, WhatsApp, etc.)
 * - Start/stop channels
 * - Route outbound messages
 */
export class ChannelManager {
  private config: Config;
  private bus: MessageBus;
  private channels: Map<string, Channel> = new Map();
  private dispatchTask: Promise<void> | null = null;
  private dispatchRunning = false;

  constructor(config: Config, bus: MessageBus) {
    this.config = config;
    this.bus = bus;
    this.initChannels();
  }

  private initChannels(): void {
    // Telegram channel
    if (this.config.channels.telegram.enabled) {
      try {
        const channel = new TelegramChannel(this.config.channels.telegram, this.bus);
        this.channels.set('telegram', channel);
        console.log('Telegram channel enabled');
      } catch (error) {
        console.warn(`Telegram channel not available: ${error}`);
      }
    }

    // WhatsApp channel
    if (this.config.channels.whatsapp.enabled) {
      try {
        const channel = new WhatsAppChannel(this.config.channels.whatsapp, this.bus);
        this.channels.set('whatsapp', channel);
        console.log('WhatsApp channel enabled');
      } catch (error) {
        console.warn(`WhatsApp channel not available: ${error}`);
      }
    }
  }

  /**
   * Start all enabled channels and the outbound dispatcher.
   */
  async startAll(): Promise<void> {
    if (this.channels.size === 0) {
      console.warn('No channels enabled');
      return;
    }

    // Start outbound dispatcher
    this.dispatchRunning = true;
    this.dispatchTask = this.dispatchOutbound();

    // Start all channels concurrently
    const startPromises: Promise<void>[] = [];
    for (const [name, channel] of this.channels) {
      console.log(`Starting ${name} channel...`);
      startPromises.push(
        channel.start().catch((error) => {
          console.error(`Error starting ${name} channel:`, error);
        })
      );
    }

    // Wait for all channels (they should run forever)
    await Promise.all(startPromises);
  }

  /**
   * Stop all channels and the dispatcher.
   */
  async stopAll(): Promise<void> {
    console.log('Stopping all channels...');

    // Stop dispatcher
    this.dispatchRunning = false;
    if (this.dispatchTask) {
      // The dispatch loop will exit on its own
      await this.dispatchTask.catch(() => {});
      this.dispatchTask = null;
    }

    // Stop all channels
    for (const [name, channel] of this.channels) {
      try {
        await channel.stop();
        console.log(`Stopped ${name} channel`);
      } catch (error) {
        console.error(`Error stopping ${name}:`, error);
      }
    }
  }

  private async dispatchOutbound(): Promise<void> {
    console.log('Outbound dispatcher started');

    while (this.dispatchRunning) {
      try {
        // Use timeout to allow checking dispatchRunning flag
        const msg = await Promise.race([
          this.bus.consumeOutbound(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
        ]);

        if (msg === null) continue;

        const channel = this.channels.get(msg.channel);
        if (channel) {
          try {
            await channel.send(msg);
          } catch (error) {
            console.error(`Error sending to ${msg.channel}:`, error);
          }
        } else {
          console.warn(`Unknown channel: ${msg.channel}`);
        }
      } catch (error) {
        if (this.dispatchRunning) {
          console.error('Dispatch error:', error);
        }
      }
    }
  }

  /**
   * Get a channel by name.
   */
  getChannel(name: string): Channel | undefined {
    return this.channels.get(name);
  }

  /**
   * Get status of all channels.
   */
  getStatus(): Record<string, ChannelStatus> {
    const status: Record<string, ChannelStatus> = {};
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
  get enabledChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Register a custom channel.
   */
  registerChannel(channel: Channel): void {
    this.channels.set(channel.name, channel);
  }

  /**
   * Unregister a channel by name.
   */
  unregisterChannel(name: string): void {
    this.channels.delete(name);
  }
}

/**
 * Create a channel manager.
 */
export function createChannelManager(config: Config, bus: MessageBus): ChannelManager {
  return new ChannelManager(config, bus);
}
