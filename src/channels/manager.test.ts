/**
 * Tests for channel manager.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChannelManager } from './manager.js';
import { MessageBus } from '../bus/queue.js';
import { ConfigSchema } from '../config/schema.js';
import type { Channel } from './base.js';
import type { OutboundMessage } from '../bus/events.js';

// Mock channel for testing
class MockChannel implements Channel {
  readonly name: string;
  private _running = false;
  public sentMessages: OutboundMessage[] = [];
  public startCalled = false;
  public stopCalled = false;

  constructor(name: string) {
    this.name = name;
  }

  get isRunning(): boolean {
    return this._running;
  }

  async start(): Promise<void> {
    this.startCalled = true;
    this._running = true;
  }

  async stop(): Promise<void> {
    this.stopCalled = true;
    this._running = false;
  }

  async send(message: OutboundMessage): Promise<void> {
    this.sentMessages.push(message);
  }
}

describe('ChannelManager', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  describe('initialization', () => {
    it('should create with no channels when all disabled', () => {
      const config = ConfigSchema.parse({});
      const manager = new ChannelManager(config, bus);

      expect(manager.enabledChannels).toEqual([]);
    });
  });

  describe('registerChannel', () => {
    it('should register custom channel', () => {
      const config = ConfigSchema.parse({});
      const manager = new ChannelManager(config, bus);

      const mockChannel = new MockChannel('custom');
      manager.registerChannel(mockChannel);

      expect(manager.enabledChannels).toContain('custom');
      expect(manager.getChannel('custom')).toBe(mockChannel);
    });
  });

  describe('unregisterChannel', () => {
    it('should unregister channel', () => {
      const config = ConfigSchema.parse({});
      const manager = new ChannelManager(config, bus);

      const mockChannel = new MockChannel('custom');
      manager.registerChannel(mockChannel);
      manager.unregisterChannel('custom');

      expect(manager.enabledChannels).not.toContain('custom');
    });
  });

  describe('getChannel', () => {
    it('should return undefined for unknown channel', () => {
      const config = ConfigSchema.parse({});
      const manager = new ChannelManager(config, bus);

      expect(manager.getChannel('unknown')).toBeUndefined();
    });
  });

  describe('getStatus', () => {
    it('should return status of all channels', () => {
      const config = ConfigSchema.parse({});
      const manager = new ChannelManager(config, bus);

      const channel1 = new MockChannel('channel1');
      const channel2 = new MockChannel('channel2');
      manager.registerChannel(channel1);
      manager.registerChannel(channel2);

      const status = manager.getStatus();

      expect(status['channel1']).toEqual({ enabled: true, running: false });
      expect(status['channel2']).toEqual({ enabled: true, running: false });
    });
  });

  describe('startAll/stopAll', () => {
    it('should start and stop all registered channels', async () => {
      const config = ConfigSchema.parse({});
      const manager = new ChannelManager(config, bus);

      const channel = new MockChannel('test');
      manager.registerChannel(channel);

      // Start in background (don't await, it runs forever)
      const startPromise = manager.startAll();

      // Give it time to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(channel.startCalled).toBe(true);
      expect(channel.isRunning).toBe(true);

      // Stop all
      await manager.stopAll();

      expect(channel.stopCalled).toBe(true);
      expect(channel.isRunning).toBe(false);
    });

    it('should warn when no channels enabled', async () => {
      const config = ConfigSchema.parse({});
      const manager = new ChannelManager(config, bus);

      const consoleSpy = vi.spyOn(console, 'warn');

      await manager.startAll();

      expect(consoleSpy).toHaveBeenCalledWith('No channels enabled');
      consoleSpy.mockRestore();
    });
  });

  describe('outbound dispatch', () => {
    it('should dispatch messages to correct channel', async () => {
      const config = ConfigSchema.parse({});
      const manager = new ChannelManager(config, bus);

      const channel = new MockChannel('test');
      manager.registerChannel(channel);

      // Start manager
      const startPromise = manager.startAll();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Publish outbound message
      await bus.publishOutbound({
        channel: 'test',
        chatId: '123',
        content: 'Hello!',
        timestamp: new Date(),
      });

      // Wait for dispatch
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(channel.sentMessages).toHaveLength(1);
      expect(channel.sentMessages[0]?.content).toBe('Hello!');

      await manager.stopAll();
    });
  });
});
