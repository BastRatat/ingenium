/**
 * Tool registry for dynamic tool management.
 */
import { toolToSchema } from './base.js';
/**
 * Registry for agent tools.
 *
 * Allows dynamic registration and execution of tools.
 */
export class ToolRegistry {
    tools = new Map();
    /**
     * Register a tool.
     */
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    /**
     * Register multiple tools.
     */
    registerAll(tools) {
        for (const tool of tools) {
            this.register(tool);
        }
    }
    /**
     * Unregister a tool by name.
     */
    unregister(name) {
        this.tools.delete(name);
    }
    /**
     * Get a tool by name.
     */
    get(name) {
        return this.tools.get(name);
    }
    /**
     * Check if a tool is registered.
     */
    has(name) {
        return this.tools.has(name);
    }
    /**
     * Get all tool definitions in OpenAI format.
     */
    getDefinitions() {
        return Array.from(this.tools.values()).map(toolToSchema);
    }
    /**
     * Execute a tool by name with given parameters.
     *
     * @param name - Tool name.
     * @param params - Tool parameters.
     * @returns Tool execution result as string.
     */
    async execute(name, params) {
        const tool = this.tools.get(name);
        if (!tool) {
            return `Error: Tool '${name}' not found`;
        }
        try {
            return await tool.execute(params);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return `Error executing ${name}: ${message}`;
        }
    }
    /**
     * Get list of registered tool names.
     */
    get toolNames() {
        return Array.from(this.tools.keys());
    }
    /**
     * Get the number of registered tools.
     */
    get size() {
        return this.tools.size;
    }
    /**
     * Check if a tool is registered (alias for has).
     */
    contains(name) {
        return this.has(name);
    }
    /**
     * Clear all registered tools.
     */
    clear() {
        this.tools.clear();
    }
}
/**
 * Create a simple tool from a function.
 */
export function createTool(name, description, parameters, execute) {
    return {
        name,
        description,
        parameters,
        execute,
    };
}
//# sourceMappingURL=registry.js.map