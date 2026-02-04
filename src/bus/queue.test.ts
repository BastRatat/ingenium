/**
 * Tests for the message bus.
 */

import { describe, it, expect, vi } from 'vitest';
import { MessageBus } from './queue.js';
import { createInboundMessage, createOutboundMessage } from './events.js';

describe('MessageBus', () => {
  it('should publish and consume inbound messages', async () => {
    const bus = new MessageBus();

    const msg = createInboundMessage({
      channel: 'telegram',
      senderId: 'user123',
      chatId: 'chat456',
      content: 'Hello',
    });

    await bus.publishInbound(msg);
    const received = await bus.consumeInbound();

    expect(received.channel).toBe('telegram');
    expect(received.content).toBe('Hello');
  });

  it('should publish and consume outbound messages', async () => {
    const bus = new MessageBus();

    const msg = createOutboundMessage({
      channel: 'telegram',
      chatId: 'chat456',
      content: 'Response',
    });

    await bus.publishOutbound(msg);
    const received = await bus.consumeOutbound();

    expect(received.channel).toBe('telegram');
    expect(received.content).toBe('Response');
  });

  it('should track queue sizes', async () => {
    const bus = new MessageBus();

    expect(bus.inboundSize).toBe(0);
    expect(bus.outboundSize).toBe(0);

    await bus.publishInbound(
      createInboundMessage({
        channel: 'test',
        senderId: 'user',
        chatId: 'chat',
        content: 'msg1',
      })
    );

    await bus.publishInbound(
      createInboundMessage({
        channel: 'test',
        senderId: 'user',
        chatId: 'chat',
        content: 'msg2',
      })
    );

    expect(bus.inboundSize).toBe(2);

    await bus.consumeInbound();
    expect(bus.inboundSize).toBe(1);
  });

  it('should subscribe to outbound messages by channel', async () => {
    const bus = new MessageBus();
    const received: string[] = [];

    bus.subscribeOutbound('telegram', async (msg) => {
      received.push(msg.content);
    });

    // Manually dispatch (without running the loop)
    const msg = createOutboundMessage({
      channel: 'telegram',
      chatId: 'chat',
      content: 'test message',
    });

    await bus.publishOutbound(msg);
    const consumed = await bus.consumeOutbound();

    // Manually call subscriber
    const subscribers = bus['outboundSubscribers'].get('telegram');
    if (subscribers) {
      for (const sub of subscribers) {
        await sub(consumed);
      }
    }

    expect(received).toEqual(['test message']);
  });

  it('should unsubscribe from outbound messages', async () => {
    const bus = new MessageBus();
    const callback = vi.fn();

    bus.subscribeOutbound('telegram', callback);
    bus.unsubscribeOutbound('telegram', callback);

    // Check internal state
    const subscribers = bus['outboundSubscribers'].get('telegram');
    expect(subscribers).toEqual([]);
  });

  it('should stop the dispatch loop', () => {
    const bus = new MessageBus();

    expect(bus.isRunning).toBe(false);

    // Start dispatch in background
    const dispatchPromise = bus.dispatchOutbound();

    expect(bus.isRunning).toBe(true);

    bus.stop();

    // Give the loop time to notice the stop
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        expect(bus.isRunning).toBe(false);
        // Wait for dispatch to complete
        await dispatchPromise;
        resolve();
      }, 1200); // Wait for timeout cycle
    });
  });

  it('should handle multiple channels', async () => {
    const bus = new MessageBus();

    const telegramMessages: string[] = [];
    const whatsappMessages: string[] = [];

    bus.subscribeOutbound('telegram', async (msg) => {
      telegramMessages.push(msg.content);
    });

    bus.subscribeOutbound('whatsapp', async (msg) => {
      whatsappMessages.push(msg.content);
    });

    // Publish to both channels
    await bus.publishOutbound(
      createOutboundMessage({
        channel: 'telegram',
        chatId: 'tg-chat',
        content: 'telegram msg',
      })
    );

    await bus.publishOutbound(
      createOutboundMessage({
        channel: 'whatsapp',
        chatId: 'wa-chat',
        content: 'whatsapp msg',
      })
    );

    // Consume and dispatch manually
    const tgMsg = await bus.consumeOutbound();
    const waMsg = await bus.consumeOutbound();

    for (const sub of bus['outboundSubscribers'].get(tgMsg.channel) ?? []) {
      await sub(tgMsg);
    }
    for (const sub of bus['outboundSubscribers'].get(waMsg.channel) ?? []) {
      await sub(waMsg);
    }

    expect(telegramMessages).toEqual(['telegram msg']);
    expect(whatsappMessages).toEqual(['whatsapp msg']);
  });
});
