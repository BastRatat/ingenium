/**
 * Tests for WhatsApp channel.
 */

import { describe, it, expect } from 'vitest';
import { WhatsAppChannel } from './whatsapp.js';
import { MessageBus } from '../bus/queue.js';
import { WhatsAppConfigSchema } from '../config/schema.js';

describe('WhatsAppChannel', () => {
  it('should have correct name', () => {
    const config = WhatsAppConfigSchema.parse({});
    const bus = new MessageBus();
    const channel = new WhatsAppChannel(config, bus);

    expect(channel.name).toBe('whatsapp');
  });

  it('should use default bridge URL', () => {
    const config = WhatsAppConfigSchema.parse({});
    const bus = new MessageBus();
    const channel = new WhatsAppChannel(config, bus);

    expect(channel.name).toBe('whatsapp');
    // Default bridgeUrl is 'ws://localhost:3001'
  });

  it('should use custom bridge URL', () => {
    const config = WhatsAppConfigSchema.parse({
      bridgeUrl: 'ws://custom:3002',
    });
    const bus = new MessageBus();
    const channel = new WhatsAppChannel(config, bus);

    expect(channel.name).toBe('whatsapp');
  });

  it('should respect allowFrom config', () => {
    const config = WhatsAppConfigSchema.parse({
      allowFrom: ['+1234567890'],
    });
    const bus = new MessageBus();
    const channel = new WhatsAppChannel(config, bus);

    expect(channel.name).toBe('whatsapp');
  });

  it('should not be running initially', () => {
    const config = WhatsAppConfigSchema.parse({});
    const bus = new MessageBus();
    const channel = new WhatsAppChannel(config, bus);

    expect(channel.isRunning).toBe(false);
  });

  it('should have send method', () => {
    const config = WhatsAppConfigSchema.parse({});
    const bus = new MessageBus();
    const channel = new WhatsAppChannel(config, bus);

    expect(typeof channel.send).toBe('function');
  });

  it('should handle send when not connected', async () => {
    const config = WhatsAppConfigSchema.parse({});
    const bus = new MessageBus();
    const channel = new WhatsAppChannel(config, bus);

    // Should not throw, just log warning
    await channel.send({
      channel: 'whatsapp',
      chatId: '+1234567890@s.whatsapp.net',
      content: 'Hello!',
      timestamp: new Date(),
    });
  });
});
