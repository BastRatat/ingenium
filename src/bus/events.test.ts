/**
 * Tests for message event types.
 */

import { describe, it, expect } from 'vitest';
import {
  createInboundMessage,
  createOutboundMessage,
  getSessionKey,
} from './events.js';

describe('createInboundMessage', () => {
  it('should create message with required fields', () => {
    const msg = createInboundMessage({
      channel: 'telegram',
      senderId: 'user123',
      chatId: 'chat456',
      content: 'Hello world',
    });

    expect(msg.channel).toBe('telegram');
    expect(msg.senderId).toBe('user123');
    expect(msg.chatId).toBe('chat456');
    expect(msg.content).toBe('Hello world');
  });

  it('should set default timestamp', () => {
    const before = new Date();
    const msg = createInboundMessage({
      channel: 'test',
      senderId: 'user',
      chatId: 'chat',
      content: 'test',
    });
    const after = new Date();

    expect(msg.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(msg.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should use provided timestamp', () => {
    const customTime = new Date('2024-01-15T10:30:00Z');
    const msg = createInboundMessage({
      channel: 'test',
      senderId: 'user',
      chatId: 'chat',
      content: 'test',
      timestamp: customTime,
    });

    expect(msg.timestamp).toBe(customTime);
  });

  it('should set default empty media array', () => {
    const msg = createInboundMessage({
      channel: 'test',
      senderId: 'user',
      chatId: 'chat',
      content: 'test',
    });

    expect(msg.media).toEqual([]);
  });

  it('should use provided media array', () => {
    const media = ['http://example.com/image.jpg'];
    const msg = createInboundMessage({
      channel: 'test',
      senderId: 'user',
      chatId: 'chat',
      content: 'test',
      media,
    });

    expect(msg.media).toEqual(media);
  });

  it('should set default empty metadata', () => {
    const msg = createInboundMessage({
      channel: 'test',
      senderId: 'user',
      chatId: 'chat',
      content: 'test',
    });

    expect(msg.metadata).toEqual({});
  });

  it('should use provided metadata', () => {
    const metadata = { messageId: 12345, isForwarded: true };
    const msg = createInboundMessage({
      channel: 'test',
      senderId: 'user',
      chatId: 'chat',
      content: 'test',
      metadata,
    });

    expect(msg.metadata).toEqual(metadata);
  });
});

describe('createOutboundMessage', () => {
  it('should create message with required fields', () => {
    const msg = createOutboundMessage({
      channel: 'telegram',
      chatId: 'chat456',
      content: 'Response',
    });

    expect(msg.channel).toBe('telegram');
    expect(msg.chatId).toBe('chat456');
    expect(msg.content).toBe('Response');
  });

  it('should not include optional fields when not provided', () => {
    const msg = createOutboundMessage({
      channel: 'test',
      chatId: 'chat',
      content: 'test',
    });

    expect('replyTo' in msg).toBe(false);
    expect('media' in msg).toBe(false);
    expect('metadata' in msg).toBe(false);
  });

  it('should include optional fields when provided', () => {
    const msg = createOutboundMessage({
      channel: 'test',
      chatId: 'chat',
      content: 'test',
      replyTo: 'msg123',
      media: ['image.jpg'],
      metadata: { key: 'value' },
    });

    expect(msg.replyTo).toBe('msg123');
    expect(msg.media).toEqual(['image.jpg']);
    expect(msg.metadata).toEqual({ key: 'value' });
  });
});

describe('getSessionKey', () => {
  it('should return channel:chatId format', () => {
    const msg = createInboundMessage({
      channel: 'telegram',
      senderId: 'user',
      chatId: '123456',
      content: 'test',
    });

    expect(getSessionKey(msg)).toBe('telegram:123456');
  });

  it('should handle system channel', () => {
    const msg = createInboundMessage({
      channel: 'system',
      senderId: 'subagent',
      chatId: 'telegram:original-chat',
      content: 'announcement',
    });

    expect(getSessionKey(msg)).toBe('system:telegram:original-chat');
  });
});
