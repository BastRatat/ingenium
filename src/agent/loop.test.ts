/**
 * Tests for AgentLoop.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AgentLoop } from './loop.js';
import { MessageBus } from '../bus/queue.js';
import type { LLMProvider, LLMResponse, ChatOptions } from '../providers/base.js';

// Mock provider factory
function createMockProvider(responses: Array<Partial<LLMResponse>> = []): LLMProvider {
  let callIndex = 0;

  return {
    getDefaultModel: () => 'test-model',
    chat: vi.fn(async (_options: ChatOptions): Promise<LLMResponse> => {
      const response = responses[callIndex] ?? {
        content: 'Default response',
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
      callIndex++;
      return response as LLMResponse;
    }),
  };
}

describe('AgentLoop', () => {
  let testDir: string;
  let bus: MessageBus;
  let provider: LLMProvider;
  let loop: AgentLoop;

  beforeEach(async () => {
    testDir = join(tmpdir(), `loop-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    bus = new MessageBus();
    provider = createMockProvider([
      {
        content: 'Hello! How can I help?',
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
      },
    ]);

    loop = new AgentLoop({
      bus,
      provider,
      workspace: testDir,
    });
  });

  afterEach(async () => {
    loop.stop();
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create with default model', () => {
      const l = new AgentLoop({
        bus,
        provider,
        workspace: testDir,
      });

      expect(l.model).toBe('test-model');
    });

    it('should use provided model', () => {
      const l = new AgentLoop({
        bus,
        provider,
        workspace: testDir,
        model: 'custom-model',
      });

      expect(l.model).toBe('custom-model');
    });

    it('should use default max iterations', () => {
      expect(loop.maxIterations).toBe(20);
    });

    it('should use provided max iterations', () => {
      const l = new AgentLoop({
        bus,
        provider,
        workspace: testDir,
        maxIterations: 10,
      });

      expect(l.maxIterations).toBe(10);
    });
  });

  describe('processMessage', () => {
    it('should process simple message', async () => {
      const response = await loop.processMessage({
        channel: 'cli',
        senderId: 'user',
        chatId: 'direct',
        content: 'Hello',
        timestamp: new Date(),
        media: [],
        metadata: {},
      });

      expect(response).not.toBeNull();
      expect(response?.content).toBe('Hello! How can I help?');
      expect(response?.channel).toBe('cli');
      expect(response?.chatId).toBe('direct');
    });

    it('should save to session', async () => {
      await loop.processMessage({
        channel: 'telegram',
        senderId: 'user123',
        chatId: '456',
        content: 'Test message',
        timestamp: new Date(),
        media: [],
        metadata: {},
      });

      // Get session and verify
      const session = await loop.sessions.getOrCreate('telegram:456');
      expect(session.messages.length).toBeGreaterThanOrEqual(2); // user + assistant
    });

    it('should handle tool calls', async () => {
      const mockProvider = createMockProvider([
        {
          content: null,
          toolCalls: [
            {
              id: 'call-1',
              name: 'list_dir',
              arguments: { path: testDir },
            },
          ],
          finishReason: 'tool_calls',
          usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        },
        {
          content: 'I listed the directory.',
          toolCalls: [],
          finishReason: 'stop',
          usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
        },
      ]);

      const l = new AgentLoop({
        bus,
        provider: mockProvider,
        workspace: testDir,
      });

      const response = await l.processMessage({
        channel: 'cli',
        senderId: 'user',
        chatId: 'direct',
        content: 'List the directory',
        timestamp: new Date(),
        media: [],
        metadata: {},
      });

      expect(response?.content).toBe('I listed the directory.');
      expect(mockProvider.chat).toHaveBeenCalledTimes(2);
    });

    it('should respect max iterations', async () => {
      // Provider always returns tool calls (infinite loop scenario)
      const mockProvider = createMockProvider(
        Array(25).fill({
          content: null,
          toolCalls: [
            {
              id: 'call-infinite',
              name: 'list_dir',
              arguments: { path: testDir },
            },
          ],
          finishReason: 'tool_calls',
          usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        })
      );

      const l = new AgentLoop({
        bus,
        provider: mockProvider,
        workspace: testDir,
        maxIterations: 5,
      });

      const response = await l.processMessage({
        channel: 'cli',
        senderId: 'user',
        chatId: 'direct',
        content: 'Infinite loop test',
        timestamp: new Date(),
        media: [],
        metadata: {},
      });

      // Should stop at max iterations
      expect(mockProvider.chat).toHaveBeenCalledTimes(5);
      expect(response?.content).toContain('completed processing');
    });
  });

  describe('processDirect', () => {
    it('should process direct CLI message', async () => {
      const response = await loop.processDirect('Hello there');

      expect(response).toBe('Hello! How can I help?');
    });
  });

  describe('run and stop', () => {
    it('should track running state', () => {
      expect(loop.isRunning()).toBe(false);
    });

    it('should stop running loop', () => {
      loop.stop();
      expect(loop.isRunning()).toBe(false);
    });
  });

  describe('system messages', () => {
    it('should process system messages from subagents', async () => {
      const response = await loop.processMessage({
        channel: 'system',
        senderId: 'subagent',
        chatId: 'telegram:123',
        content: '[Subagent completed] Task result here',
        timestamp: new Date(),
        media: [],
        metadata: {},
      });

      expect(response).not.toBeNull();
      expect(response?.channel).toBe('telegram');
      expect(response?.chatId).toBe('123');
    });
  });
});

describe('createAgentLoop', () => {
  it('should create an AgentLoop instance', async () => {
    const { createAgentLoop } = await import('./loop.js');
    const testDir = join(tmpdir(), `loop-factory-test-${Date.now()}`);
    const bus = new MessageBus();
    const provider = createMockProvider();

    try {
      await mkdir(testDir, { recursive: true });
      const loop = createAgentLoop({
        bus,
        provider,
        workspace: testDir,
      });
      expect(loop).toBeInstanceOf(AgentLoop);
    } finally {
      if (existsSync(testDir)) {
        await rm(testDir, { recursive: true, force: true });
      }
    }
  });
});
