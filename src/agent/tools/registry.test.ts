/**
 * Tests for tool registry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry, createTool } from './registry.js';
import type { Tool } from './base.js';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  const mockTool: Tool = {
    name: 'mock_tool',
    description: 'A mock tool',
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'string' },
      },
      required: ['input'],
    },
    execute: async (params) => `Received: ${params['input']}`,
  };

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register', () => {
    it('should register a tool', () => {
      registry.register(mockTool);
      expect(registry.has('mock_tool')).toBe(true);
    });

    it('should overwrite existing tool with same name', () => {
      const tool2: Tool = { ...mockTool, description: 'Updated' };
      registry.register(mockTool);
      registry.register(tool2);
      expect(registry.get('mock_tool')?.description).toBe('Updated');
    });
  });

  describe('registerAll', () => {
    it('should register multiple tools', () => {
      const tool2: Tool = { ...mockTool, name: 'tool2' };
      registry.registerAll([mockTool, tool2]);
      expect(registry.size).toBe(2);
    });
  });

  describe('unregister', () => {
    it('should remove a tool', () => {
      registry.register(mockTool);
      registry.unregister('mock_tool');
      expect(registry.has('mock_tool')).toBe(false);
    });

    it('should not throw for non-existent tool', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('get', () => {
    it('should return tool by name', () => {
      registry.register(mockTool);
      expect(registry.get('mock_tool')).toBe(mockTool);
    });

    it('should return undefined for unknown tool', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered tool', () => {
      registry.register(mockTool);
      expect(registry.has('mock_tool')).toBe(true);
    });

    it('should return false for unregistered tool', () => {
      expect(registry.has('unknown')).toBe(false);
    });
  });

  describe('getDefinitions', () => {
    it('should return tool schemas', () => {
      registry.register(mockTool);
      const definitions = registry.getDefinitions();
      expect(definitions).toHaveLength(1);
      expect(definitions[0]?.type).toBe('function');
      expect(definitions[0]?.function.name).toBe('mock_tool');
    });
  });

  describe('execute', () => {
    it('should execute tool and return result', async () => {
      registry.register(mockTool);
      const result = await registry.execute('mock_tool', { input: 'test' });
      expect(result).toBe('Received: test');
    });

    it('should return error for unknown tool', async () => {
      const result = await registry.execute('unknown', {});
      expect(result).toBe("Error: Tool 'unknown' not found");
    });

    it('should catch and return tool errors', async () => {
      const errorTool: Tool = {
        ...mockTool,
        name: 'error_tool',
        execute: async () => {
          throw new Error('Tool failed');
        },
      };
      registry.register(errorTool);
      const result = await registry.execute('error_tool', {});
      expect(result).toBe('Error executing error_tool: Tool failed');
    });
  });

  describe('toolNames', () => {
    it('should return list of tool names', () => {
      registry.register(mockTool);
      const tool2: Tool = { ...mockTool, name: 'tool2' };
      registry.register(tool2);
      expect(registry.toolNames).toContain('mock_tool');
      expect(registry.toolNames).toContain('tool2');
    });
  });

  describe('size', () => {
    it('should return number of registered tools', () => {
      expect(registry.size).toBe(0);
      registry.register(mockTool);
      expect(registry.size).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all tools', () => {
      registry.register(mockTool);
      registry.clear();
      expect(registry.size).toBe(0);
    });
  });
});

describe('createTool', () => {
  it('should create a tool from function', async () => {
    const tool = createTool(
      'add',
      'Add two numbers',
      {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' },
        },
        required: ['a', 'b'],
      },
      async (params) => {
        const a = params['a'] as number;
        const b = params['b'] as number;
        return String(a + b);
      }
    );

    expect(tool.name).toBe('add');
    expect(tool.description).toBe('Add two numbers');
    const result = await tool.execute({ a: 2, b: 3 });
    expect(result).toBe('5');
  });
});
