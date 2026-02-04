/**
 * Tests for spawn tool.
 */

import { describe, it, expect, vi } from 'vitest';
import { SpawnTool, createSpawnTool, type SubagentManager } from './spawn.js';

describe('SpawnTool', () => {
  const createMockManager = (): SubagentManager => ({
    spawn: vi.fn(async (options) => `Spawned: ${options.task}`),
  });

  it('should spawn subagent with task', async () => {
    const manager = createMockManager();
    const tool = new SpawnTool({ manager });

    const result = await tool.execute({ task: 'Do something' });

    expect(result).toBe('Spawned: Do something');
    expect(manager.spawn).toHaveBeenCalledWith({
      task: 'Do something',
      label: undefined,
      originChannel: 'cli',
      originChatId: 'direct',
    });
  });

  it('should pass label to manager', async () => {
    const manager = createMockManager();
    const tool = new SpawnTool({ manager });

    await tool.execute({ task: 'Task', label: 'My Label' });

    expect(manager.spawn).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'My Label' })
    );
  });

  it('should use custom origin context', async () => {
    const manager = createMockManager();
    const tool = new SpawnTool({
      manager,
      originChannel: 'telegram',
      originChatId: '12345',
    });

    await tool.execute({ task: 'Task' });

    expect(manager.spawn).toHaveBeenCalledWith(
      expect.objectContaining({
        originChannel: 'telegram',
        originChatId: '12345',
      })
    );
  });

  it('should allow setting context', async () => {
    const manager = createMockManager();
    const tool = new SpawnTool({ manager });

    tool.setContext('whatsapp', '+1234567890');
    await tool.execute({ task: 'Task' });

    expect(manager.spawn).toHaveBeenCalledWith(
      expect.objectContaining({
        originChannel: 'whatsapp',
        originChatId: '+1234567890',
      })
    );
  });

  it('should return error for invalid task', async () => {
    const manager = createMockManager();
    const tool = new SpawnTool({ manager });

    const result = await tool.execute({ task: 123 });
    expect(result).toBe('Error: task must be a string');
  });

  it('should have correct schema', () => {
    const manager = createMockManager();
    const tool = new SpawnTool({ manager });

    expect(tool.name).toBe('spawn');
    expect(tool.parameters.required).toContain('task');
    expect(tool.description).toContain('subagent');
  });
});

describe('createSpawnTool', () => {
  it('should create tool with manager', () => {
    const manager: SubagentManager = {
      spawn: async () => 'ok',
    };
    const tool = createSpawnTool({ manager });
    expect(tool).toBeInstanceOf(SpawnTool);
  });
});
