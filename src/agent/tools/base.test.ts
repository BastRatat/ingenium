/**
 * Tests for base tool types.
 */

import { describe, it, expect } from 'vitest';
import { toolToSchema, BaseTool, type Tool, type ToolParameters } from './base.js';

describe('toolToSchema', () => {
  it('should convert tool to OpenAI schema format', () => {
    const tool: Tool = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Input value' },
        },
        required: ['input'],
      },
      execute: async () => 'result',
    };

    const schema = toolToSchema(tool);

    expect(schema).toEqual({
      type: 'function',
      function: {
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Input value' },
          },
          required: ['input'],
        },
      },
    });
  });
});

describe('BaseTool', () => {
  it('should provide toSchema method', () => {
    class TestTool extends BaseTool {
      readonly name = 'test';
      readonly description = 'Test tool';
      readonly parameters: ToolParameters = {
        type: 'object',
        properties: {},
      };

      async execute(): Promise<string> {
        return 'executed';
      }
    }

    const tool = new TestTool();
    const schema = tool.toSchema();

    expect(schema.type).toBe('function');
    expect(schema.function.name).toBe('test');
  });
});
