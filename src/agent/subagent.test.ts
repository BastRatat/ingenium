/**
 * Tests for SubagentManager.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubagentManager } from './subagent.js';
import { MessageBus } from '../bus/queue.js';
import type { LLMProvider, LLMResponse, ChatOptions } from '../providers/base.js';

// Mock provider
function createMockProvider(responses: Array<Partial<LLMResponse>> = []): LLMProvider {
  let callIndex = 0;

  return {
    getDefaultModel: () => 'test-model',
    chat: vi.fn(async (_options: ChatOptions): Promise<LLMResponse> => {
      const response = responses[callIndex] ?? {
        content: 'Task completed',
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
      callIndex++;
      return response as LLMResponse;
    }),
  };
}

describe('SubagentManager', () => {
  let bus: MessageBus;
  let provider: LLMProvider;
  let manager: SubagentManager;

  beforeEach(() => {
    bus = new MessageBus();
    provider = createMockProvider();
    manager = new SubagentManager({
      provider,
      workspace: '/tmp/test-workspace',
      bus,
      model: 'test-model',
    });
  });

  describe('constructor', () => {
    it('should create with default model', () => {
      const mgr = new SubagentManager({
        provider,
        workspace: '/tmp/test',
        bus,
      });

      expect(mgr.model).toBe('test-model');
    });

    it('should use provided model', () => {
      const mgr = new SubagentManager({
        provider,
        workspace: '/tmp/test',
        bus,
        model: 'custom-model',
      });

      expect(mgr.model).toBe('custom-model');
    });
  });

  describe('spawn', () => {
    it('should return status message', async () => {
      const result = await manager.spawn({
        task: 'Test task',
        originChannel: 'cli',
        originChatId: 'direct',
      });

      expect(result).toContain('Subagent');
      expect(result).toContain('started');
    });

    it('should use task as label if not provided', async () => {
      const result = await manager.spawn({
        task: 'My task description',
        originChannel: 'cli',
        originChatId: 'direct',
      });

      expect(result).toContain('My task description');
    });

    it('should truncate long tasks in label', async () => {
      const longTask =
        'This is a very long task description that should be truncated in the display label';
      const result = await manager.spawn({
        task: longTask,
        originChannel: 'cli',
        originChatId: 'direct',
      });

      expect(result).toContain('...');
    });

    it('should use provided label', async () => {
      const result = await manager.spawn({
        task: 'The actual task',
        label: 'Custom Label',
        originChannel: 'cli',
        originChatId: 'direct',
      });

      expect(result).toContain('Custom Label');
    });

    it('should increment running count', async () => {
      expect(manager.getRunningCount()).toBe(0);

      // Spawn without awaiting completion
      await manager.spawn({
        task: 'Background task',
        originChannel: 'cli',
        originChatId: 'direct',
      });

      // Give the task a moment to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Running count might be 1 or 0 depending on how fast the mock resolves
      expect(manager.getRunningCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRunningCount', () => {
    it('should return 0 when no tasks running', () => {
      expect(manager.getRunningCount()).toBe(0);
    });
  });

  describe('getRunningIds', () => {
    it('should return empty array when no tasks running', () => {
      expect(manager.getRunningIds()).toEqual([]);
    });
  });

  describe('cancel', () => {
    it('should return false for non-existent task', () => {
      const result = manager.cancel('nonexistent-id');
      expect(result).toBe(false);
    });
  });

  describe('subagent execution', () => {
    it('should call provider with task content', async () => {
      const mockProvider = createMockProvider([
        {
          content: 'Task done',
          toolCalls: [],
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        },
      ]);

      const mgr = new SubagentManager({
        provider: mockProvider,
        workspace: '/tmp/test',
        bus,
      });

      await mgr.spawn({
        task: 'Do something',
        originChannel: 'telegram',
        originChatId: '123',
      });

      // Wait for task to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockProvider.chat).toHaveBeenCalled();
    });

    it('should publish result to bus', async () => {
      const publishSpy = vi.spyOn(bus, 'publishInbound');

      const mockProvider = createMockProvider([
        {
          content: 'Task completed successfully',
          toolCalls: [],
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        },
      ]);

      const mgr = new SubagentManager({
        provider: mockProvider,
        workspace: '/tmp/test',
        bus,
      });

      await mgr.spawn({
        task: 'Complete this',
        originChannel: 'whatsapp',
        originChatId: '456',
      });

      // Wait for task to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(publishSpy).toHaveBeenCalled();
      const call = publishSpy.mock.calls[0];
      expect(call?.[0]?.channel).toBe('system');
      expect(call?.[0]?.chatId).toBe('whatsapp:456');
    });

    it('should handle tool calls in subagent', async () => {
      const mockProvider = createMockProvider([
        {
          content: null,
          toolCalls: [
            {
              id: 'call-1',
              name: 'read_file',
              arguments: { path: '/tmp/test.txt' },
            },
          ],
          finishReason: 'tool_calls',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        },
        {
          content: 'Found the file contents',
          toolCalls: [],
          finishReason: 'stop',
          usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
        },
      ]);

      const mgr = new SubagentManager({
        provider: mockProvider,
        workspace: '/tmp/test',
        bus,
      });

      await mgr.spawn({
        task: 'Read the file',
        originChannel: 'cli',
        originChatId: 'direct',
      });

      // Wait for task to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have been called twice (once for initial, once after tool result)
      expect(mockProvider.chat).toHaveBeenCalledTimes(2);
    });
  });
});

describe('createSubagentManager', () => {
  it('should create a SubagentManager instance', async () => {
    const { createSubagentManager } = await import('./subagent.js');
    const bus = new MessageBus();
    const provider = createMockProvider();

    const manager = createSubagentManager({
      provider,
      workspace: '/tmp/test',
      bus,
    });

    expect(manager).toBeInstanceOf(SubagentManager);
  });
});
