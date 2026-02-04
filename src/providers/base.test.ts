/**
 * Tests for base provider types and helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  hasToolCalls,
  createEmptyResponse,
  type LLMResponse,
  type ToolCallRequest,
} from './base.js';

describe('hasToolCalls', () => {
  it('should return false for empty tool calls', () => {
    const response: LLMResponse = {
      content: 'Hello',
      toolCalls: [],
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    };
    expect(hasToolCalls(response)).toBe(false);
  });

  it('should return true when tool calls exist', () => {
    const toolCall: ToolCallRequest = {
      id: 'call_123',
      name: 'get_weather',
      arguments: { location: 'NYC' },
    };
    const response: LLMResponse = {
      content: null,
      toolCalls: [toolCall],
      finishReason: 'tool_calls',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    };
    expect(hasToolCalls(response)).toBe(true);
  });
});

describe('createEmptyResponse', () => {
  it('should create response with defaults', () => {
    const response = createEmptyResponse();
    expect(response.content).toBeNull();
    expect(response.toolCalls).toEqual([]);
    expect(response.finishReason).toBe('stop');
    expect(response.usage.promptTokens).toBe(0);
    expect(response.usage.completionTokens).toBe(0);
    expect(response.usage.totalTokens).toBe(0);
  });

  it('should create response with content', () => {
    const response = createEmptyResponse('Hello world');
    expect(response.content).toBe('Hello world');
    expect(response.finishReason).toBe('stop');
  });

  it('should create response with custom finish reason', () => {
    const response = createEmptyResponse('Error occurred', 'error');
    expect(response.content).toBe('Error occurred');
    expect(response.finishReason).toBe('error');
  });
});

describe('ToolCallRequest', () => {
  it('should have correct structure', () => {
    const toolCall: ToolCallRequest = {
      id: 'call_abc123',
      name: 'search_web',
      arguments: {
        query: 'TypeScript best practices',
        limit: 10,
      },
    };

    expect(toolCall.id).toBe('call_abc123');
    expect(toolCall.name).toBe('search_web');
    expect(toolCall.arguments).toEqual({
      query: 'TypeScript best practices',
      limit: 10,
    });
  });
});

describe('LLMResponse', () => {
  it('should handle text-only response', () => {
    const response: LLMResponse = {
      content: 'This is the response',
      toolCalls: [],
      finishReason: 'stop',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    };

    expect(response.content).toBe('This is the response');
    expect(hasToolCalls(response)).toBe(false);
    expect(response.usage.totalTokens).toBe(150);
  });

  it('should handle tool call response', () => {
    const response: LLMResponse = {
      content: null,
      toolCalls: [
        {
          id: 'call_1',
          name: 'read_file',
          arguments: { path: '/tmp/test.txt' },
        },
        {
          id: 'call_2',
          name: 'list_dir',
          arguments: { path: '/tmp' },
        },
      ],
      finishReason: 'tool_calls',
      usage: {
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
      },
    };

    expect(response.content).toBeNull();
    expect(hasToolCalls(response)).toBe(true);
    expect(response.toolCalls).toHaveLength(2);
    expect(response.toolCalls[0]?.name).toBe('read_file');
    expect(response.toolCalls[1]?.name).toBe('list_dir');
  });

  it('should handle mixed content and tool calls', () => {
    const response: LLMResponse = {
      content: 'Let me check that file for you.',
      toolCalls: [
        {
          id: 'call_1',
          name: 'read_file',
          arguments: { path: '/tmp/test.txt' },
        },
      ],
      finishReason: 'tool_calls',
      usage: {
        promptTokens: 150,
        completionTokens: 75,
        totalTokens: 225,
      },
    };

    expect(response.content).toBe('Let me check that file for you.');
    expect(hasToolCalls(response)).toBe(true);
  });
});
