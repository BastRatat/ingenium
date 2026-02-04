/**
 * Tests for message tool.
 */

import { describe, it, expect, vi } from 'vitest';
import { MessageTool, createMessageTool } from './message.js';
import type { OutboundMessage } from '../../bus/events.js';

describe('MessageTool', () => {
  it('should send message with callback', async () => {
    const sentMessages: OutboundMessage[] = [];
    const sendCallback = vi.fn(async (msg: OutboundMessage) => {
      sentMessages.push(msg);
    });

    const tool = new MessageTool({
      sendCallback,
      defaultChannel: 'telegram',
      defaultChatId: '12345',
    });

    const result = await tool.execute({ content: 'Hello!' });

    expect(result).toBe('Message sent to telegram:12345');
    expect(sendCallback).toHaveBeenCalledTimes(1);
    expect(sentMessages[0]?.content).toBe('Hello!');
    expect(sentMessages[0]?.channel).toBe('telegram');
    expect(sentMessages[0]?.chatId).toBe('12345');
  });

  it('should use param channel/chatId over defaults', async () => {
    const sendCallback = vi.fn(async () => {});

    const tool = new MessageTool({
      sendCallback,
      defaultChannel: 'telegram',
      defaultChatId: '12345',
    });

    const result = await tool.execute({
      content: 'Hello!',
      channel: 'discord',
      chat_id: '67890',
    });

    expect(result).toBe('Message sent to discord:67890');
  });

  it('should return error when no channel specified', async () => {
    const tool = new MessageTool({});
    const result = await tool.execute({ content: 'Hello!' });
    expect(result).toBe('Error: No target channel/chat specified');
  });

  it('should return error when callback not configured', async () => {
    const tool = new MessageTool({
      defaultChannel: 'telegram',
      defaultChatId: '12345',
    });
    const result = await tool.execute({ content: 'Hello!' });
    expect(result).toBe('Error: Message sending not configured');
  });

  it('should return error for invalid content', async () => {
    const tool = new MessageTool({});
    const result = await tool.execute({ content: 123 });
    expect(result).toBe('Error: content must be a string');
  });

  it('should handle callback errors', async () => {
    const sendCallback = vi.fn(async () => {
      throw new Error('Network error');
    });

    const tool = new MessageTool({
      sendCallback,
      defaultChannel: 'telegram',
      defaultChatId: '12345',
    });

    const result = await tool.execute({ content: 'Hello!' });
    expect(result).toBe('Error sending message: Network error');
  });

  it('should allow setting context', async () => {
    const sendCallback = vi.fn(async () => {});
    const tool = new MessageTool({ sendCallback });

    tool.setContext('whatsapp', '+1234567890');
    await tool.execute({ content: 'Hello!' });

    expect(sendCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'whatsapp',
        chatId: '+1234567890',
      })
    );
  });

  it('should allow setting callback', async () => {
    const tool = new MessageTool({
      defaultChannel: 'test',
      defaultChatId: 'test',
    });

    const newCallback = vi.fn(async () => {});
    tool.setSendCallback(newCallback);

    await tool.execute({ content: 'Hello!' });
    expect(newCallback).toHaveBeenCalled();
  });

  it('should have correct schema', () => {
    const tool = new MessageTool({});
    expect(tool.name).toBe('message');
    expect(tool.parameters.required).toContain('content');
  });
});

describe('createMessageTool', () => {
  it('should create tool with options', () => {
    const tool = createMessageTool({ defaultChannel: 'test' });
    expect(tool).toBeInstanceOf(MessageTool);
  });
});
