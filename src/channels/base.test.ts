/**
 * Tests for base channel.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseChannel, type ChannelConfig } from './base.js';
import type { OutboundMessage } from '../bus/events.js';
import { MessageBus } from '../bus/queue.js';

class TestChannel extends BaseChannel {
  readonly name = 'test';
  public sentMessages: OutboundMessage[] = [];

  async start(): Promise<void> {
    this._running = true;
  }

  async stop(): Promise<void> {
    this._running = false;
  }

  async send(message: OutboundMessage): Promise<void> {
    this.sentMessages.push(message);
  }

  // Expose protected methods for testing
  public testIsAllowed(senderId: string): boolean {
    return this.isAllowed(senderId);
  }

  public async testHandleMessage(options: {
    senderId: string;
    chatId: string;
    content: string;
    media?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    return this.handleMessage(options);
  }
}

describe('BaseChannel', () => {
  let bus: MessageBus;
  let config: ChannelConfig;

  beforeEach(() => {
    bus = new MessageBus();
    config = {
      enabled: true,
      allowFrom: [],
    };
  });

  describe('isAllowed', () => {
    it('should allow everyone when allowFrom is empty', () => {
      const channel = new TestChannel(config, bus);
      expect(channel.testIsAllowed('anyone')).toBe(true);
      expect(channel.testIsAllowed('12345')).toBe(true);
    });

    it('should check allowFrom list', () => {
      config.allowFrom = ['user1', 'user2'];
      const channel = new TestChannel(config, bus);

      expect(channel.testIsAllowed('user1')).toBe(true);
      expect(channel.testIsAllowed('user2')).toBe(true);
      expect(channel.testIsAllowed('user3')).toBe(false);
    });

    it('should handle composite IDs with pipe separator', () => {
      config.allowFrom = ['12345', 'johndoe'];
      const channel = new TestChannel(config, bus);

      // Telegram-style ID: "12345|johndoe"
      expect(channel.testIsAllowed('12345|johndoe')).toBe(true);
      expect(channel.testIsAllowed('67890|janedoe')).toBe(false);
    });

    it('should match partial composite ID', () => {
      config.allowFrom = ['johndoe'];
      const channel = new TestChannel(config, bus);

      expect(channel.testIsAllowed('12345|johndoe')).toBe(true);
    });
  });

  describe('handleMessage', () => {
    it('should forward allowed messages to bus', async () => {
      const channel = new TestChannel(config, bus);

      await channel.testHandleMessage({
        senderId: 'user1',
        chatId: 'chat1',
        content: 'Hello!',
      });

      const msg = await bus.consumeInbound();
      expect(msg.channel).toBe('test');
      expect(msg.senderId).toBe('user1');
      expect(msg.chatId).toBe('chat1');
      expect(msg.content).toBe('Hello!');
    });

    it('should not forward disallowed messages', async () => {
      config.allowFrom = ['allowedUser'];
      const channel = new TestChannel(config, bus);

      await channel.testHandleMessage({
        senderId: 'blockedUser',
        chatId: 'chat1',
        content: 'Hello!',
      });

      // Message should not be in the bus
      // Use a timeout race to verify nothing was published
      const result = await Promise.race([
        bus.consumeInbound().then(() => 'received'),
        new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 50)),
      ]);

      expect(result).toBe('timeout');
    });

    it('should include media and metadata', async () => {
      const channel = new TestChannel(config, bus);

      await channel.testHandleMessage({
        senderId: 'user1',
        chatId: 'chat1',
        content: 'Photo',
        media: ['/path/to/image.jpg'],
        metadata: { messageId: 123 },
      });

      const msg = await bus.consumeInbound();
      expect(msg.media).toEqual(['/path/to/image.jpg']);
      expect(msg.metadata).toEqual({ messageId: 123 });
    });
  });

  describe('isRunning', () => {
    it('should track running state', async () => {
      const channel = new TestChannel(config, bus);

      expect(channel.isRunning).toBe(false);

      await channel.start();
      expect(channel.isRunning).toBe(true);

      await channel.stop();
      expect(channel.isRunning).toBe(false);
    });
  });
});
