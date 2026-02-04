/**
 * Tool registry for dynamic tool management.
 */
import type { Tool, ToolParameters } from './base.js';
import type { ToolDefinition } from '../../providers/base.js';
/**
 * Registry for agent tools.
 *
 * Allows dynamic registration and execution of tools.
 */
export declare class ToolRegistry {
    private tools;
    /**
     * Register a tool.
     */
    register(tool: Tool): void;
    /**
     * Register multiple tools.
     */
    registerAll(tools: Tool[]): void;
    /**
     * Unregister a tool by name.
     */
    unregister(name: string): void;
    /**
     * Get a tool by name.
     */
    get(name: string): Tool | undefined;
    /**
     * Check if a tool is registered.
     */
    has(name: string): boolean;
    /**
     * Get all tool definitions in OpenAI format.
     */
    getDefinitions(): ToolDefinition[];
    /**
     * Execute a tool by name with given parameters.
     *
     * @param name - Tool name.
     * @param params - Tool parameters.
     * @returns Tool execution result as string.
     */
    execute(name: string, params: Record<string, unknown>): Promise<string>;
    /**
     * Get list of registered tool names.
     */
    get toolNames(): string[];
    /**
     * Get the number of registered tools.
     */
    get size(): number;
    /**
     * Check if a tool is registered (alias for has).
     */
    contains(name: string): boolean;
    /**
     * Clear all registered tools.
     */
    clear(): void;
}
/**
 * Create a simple tool from a function.
 */
export declare function createTool(name: string, description: string, parameters: ToolParameters, execute: (params: Record<string, unknown>) => Promise<string>): Tool;
//# sourceMappingURL=registry.d.ts.map