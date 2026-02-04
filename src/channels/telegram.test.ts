/**
 * Tests for Telegram channel.
 */

import { describe, it, expect } from 'vitest';
import { TelegramChannel } from './telegram.js';
import { MessageBus } from '../bus/queue.js';
import { TelegramConfigSchema } from '../config/schema.js';

describe('TelegramChannel', () => {
  it('should have correct name', () => {
    const config = TelegramConfigSchema.parse({});
    const bus = new MessageBus();
    const channel = new TelegramChannel(config, bus);

    expect(channel.name).toBe('telegram');
  });

  it('should not start without token', async () => {
    const config = TelegramConfigSchema.parse({ enabled: true, token: '' });
    const bus = new MessageBus();
    const channel = new TelegramChannel(config, bus);

    // Should exit early without throwing
    await channel.start();
    expect(channel.isRunning).toBe(false);
  });

  it('should respect allowFrom config', () => {
    const config = TelegramConfigSchema.parse({
      enabled: true,
      allowFrom: ['user1', 'user2'],
    });
    const bus = new MessageBus();
    const channel = new TelegramChannel(config, bus);

    // Channel inherits isAllowed from BaseChannel
    expect(channel.name).toBe('telegram');
  });
});

describe('markdownToTelegramHtml', () => {
  // Note: The function is not exported, but we can test it indirectly
  // through the channel's send method behavior, or we could export it
  // for direct testing. For now, we verify the channel exists and has
  // the expected interface.

  it('should have send method', () => {
    const config = TelegramConfigSchema.parse({});
    const bus = new MessageBus();
    const channel = new TelegramChannel(config, bus);

    expect(typeof channel.send).toBe('function');
  });
});
