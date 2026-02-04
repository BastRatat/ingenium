/**
 * Base class for agent tools.
 */
import type { ToolDefinition } from '../../providers/base.js';
/**
 * JSON Schema for tool parameters.
 */
export interface ToolParameters {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
}
/**
 * Abstract interface for agent tools.
 *
 * Tools are capabilities that the agent can use to interact with
 * the environment, such as reading files, executing commands, etc.
 */
export interface Tool {
    /**
     * Tool name used in function calls.
     */
    readonly name: string;
    /**
     * Description of what the tool does.
     */
    readonly description: string;
    /**
     * JSON Schema for tool parameters.
     */
    readonly parameters: ToolParameters;
    /**
     * Execute the tool with given parameters.
     *
     * @param params - Tool-specific parameters.
     * @returns String result of the tool execution.
     */
    execute(params: Record<string, unknown>): Promise<string>;
}
/**
 * Convert a tool to OpenAI function schema format.
 */
export declare function toolToSchema(tool: Tool): ToolDefinition;
/**
 * Base class for tools that need mutable state.
 */
export declare abstract class BaseTool implements Tool {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly parameters: ToolParameters;
    abstract execute(params: Record<string, unknown>): Promise<string>;
    toSchema(): ToolDefinition;
}
//# sourceMappingURL=base.d.ts.map