/**
 * Tests for ContextBuilder.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ContextBuilder } from './context.js';

describe('ContextBuilder', () => {
  let testDir: string;
  let builder: ContextBuilder;

  beforeEach(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `context-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    builder = new ContextBuilder(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('buildSystemPrompt', () => {
    it('should include core identity', async () => {
      const prompt = await builder.buildSystemPrompt();

      expect(prompt).toContain('# ingenium');
      expect(prompt).toContain('You are ingenium');
      expect(prompt).toContain('helpful AI assistant');
    });

    it('should include workspace path', async () => {
      const prompt = await builder.buildSystemPrompt();
      expect(prompt).toContain(testDir);
    });

    it('should include current time', async () => {
      const prompt = await builder.buildSystemPrompt();
      // Should contain a date-like string
      expect(prompt).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should load bootstrap files when present', async () => {
      await writeFile(join(testDir, 'SOUL.md'), '# Soul\n\nMy personality', 'utf-8');
      await writeFile(join(testDir, 'USER.md'), '# User\n\nUser info', 'utf-8');

      const prompt = await builder.buildSystemPrompt();

      expect(prompt).toContain('## SOUL.md');
      expect(prompt).toContain('My personality');
      expect(prompt).toContain('## USER.md');
      expect(prompt).toContain('User info');
    });

    it('should include memory context when present', async () => {
      const memoryDir = join(testDir, 'memory');
      await mkdir(memoryDir, { recursive: true });
      await writeFile(join(memoryDir, 'MEMORY.md'), '# Long-term memory content', 'utf-8');

      const prompt = await builder.buildSystemPrompt();

      expect(prompt).toContain('# Memory');
      expect(prompt).toContain('Long-term memory content');
    });
  });

  describe('buildMessages', () => {
    it('should include system prompt', async () => {
      const messages = await builder.buildMessages([], 'Hello');

      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0]?.role).toBe('system');
      expect(messages[0]?.content).toContain('ingenium');
    });

    it('should include history', async () => {
      const history = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' },
      ];

      const messages = await builder.buildMessages(history, 'New message');

      // system + 2 history + 1 current
      expect(messages).toHaveLength(4);
      expect(messages[1]?.content).toBe('Previous message');
      expect(messages[2]?.content).toBe('Previous response');
    });

    it('should include current message', async () => {
      const messages = await builder.buildMessages([], 'Hello world');

      const lastMessage = messages[messages.length - 1];
      expect(lastMessage?.role).toBe('user');
      expect(lastMessage?.content).toBe('Hello world');
    });
  });

  describe('addToolResult', () => {
    it('should add tool result message', async () => {
      const messages = await builder.buildMessages([], 'Test');

      builder.addToolResult(messages, 'call-123', 'read_file', 'File content here');

      const lastMessage = messages[messages.length - 1];
      expect(lastMessage?.role).toBe('tool');
      expect(lastMessage?.tool_call_id).toBe('call-123');
      expect(lastMessage?.name).toBe('read_file');
      expect(lastMessage?.content).toBe('File content here');
    });
  });

  describe('addAssistantMessage', () => {
    it('should add assistant message without tool calls', async () => {
      const messages = await builder.buildMessages([], 'Test');

      builder.addAssistantMessage(messages, 'Here is my response');

      const lastMessage = messages[messages.length - 1];
      expect(lastMessage?.role).toBe('assistant');
      expect(lastMessage?.content).toBe('Here is my response');
      expect(lastMessage?.tool_calls).toBeUndefined();
    });

    it('should add assistant message with tool calls', async () => {
      const messages = await builder.buildMessages([], 'Test');

      const toolCalls = [
        {
          id: 'call-1',
          type: 'function' as const,
          function: { name: 'read_file', arguments: '{"path": "/tmp/test"}' },
        },
      ];

      builder.addAssistantMessage(messages, 'Let me read that file', toolCalls);

      const lastMessage = messages[messages.length - 1];
      expect(lastMessage?.role).toBe('assistant');
      expect(lastMessage?.content).toBe('Let me read that file');
      expect(lastMessage?.tool_calls).toHaveLength(1);
      expect(lastMessage?.tool_calls?.[0]?.id).toBe('call-1');
    });

    it('should handle null content', async () => {
      const messages = await builder.buildMessages([], 'Test');

      builder.addAssistantMessage(messages, null);

      const lastMessage = messages[messages.length - 1];
      expect(lastMessage?.content).toBe('');
    });
  });
});

describe('createContextBuilder', () => {
  it('should create a ContextBuilder instance', async () => {
    const { createContextBuilder } = await import('./context.js');
    const testDir = join(tmpdir(), `context-factory-test-${Date.now()}`);

    try {
      const builder = createContextBuilder(testDir);
      expect(builder).toBeInstanceOf(ContextBuilder);
    } finally {
      // Cleanup
      if (existsSync(testDir)) {
        await rm(testDir, { recursive: true, force: true });
      }
    }
  });
});
