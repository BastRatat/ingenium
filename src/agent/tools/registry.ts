/**
 * Tool registry for dynamic tool management.
 */

import type { Tool, ToolParameters } from './base.js';
import { toolToSchema } from './base.js';
import type { ToolDefinition } from '../../providers/base.js';

/**
 * Registry for agent tools.
 *
 * Allows dynamic registration and execution of tools.
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a tool.
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools.
   */
  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Unregister a tool by name.
   */
  unregister(name: string): void {
    this.tools.delete(name);
  }

  /**
   * Get a tool by name.
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool definitions in OpenAI format.
   */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(toolToSchema);
  }

  /**
   * Execute a tool by name with given parameters.
   *
   * @param name - Tool name.
   * @param params - Tool parameters.
   * @returns Tool execution result as string.
   */
  async execute(name: string, params: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return `Error: Tool '${name}' not found`;
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Error executing ${name}: ${message}`;
    }
  }

  /**
   * Get list of registered tool names.
   */
  get toolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get the number of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Check if a tool is registered (alias for has).
   */
  contains(name: string): boolean {
    return this.has(name);
  }

  /**
   * Clear all registered tools.
   */
  clear(): void {
    this.tools.clear();
  }
}

/**
 * Create a simple tool from a function.
 */
export function createTool(
  name: string,
  description: string,
  parameters: ToolParameters,
  execute: (params: Record<string, unknown>) => Promise<string>
): Tool {
  return {
    name,
    description,
    parameters,
    execute,
  };
}
