/**
 * Shell execution tool implementation.
 */
import type { ToolParameters } from './base.js';
import { BaseTool } from './base.js';
/**
 * Options for shell tool.
 */
export interface ExecToolOptions {
    /**
     * Command timeout in milliseconds.
     */
    timeout?: number;
    /**
     * Default working directory.
     */
    workingDir?: string;
    /**
     * Maximum output length in characters.
     */
    maxOutputLength?: number;
}
/**
 * Tool to execute shell commands.
 */
export declare class ExecTool extends BaseTool {
    readonly name = "exec";
    readonly description = "Execute a shell command and return its output. Use with caution.";
    readonly parameters: ToolParameters;
    private timeout;
    private workingDir;
    private maxOutputLength;
    constructor(options?: ExecToolOptions);
    execute(params: Record<string, unknown>): Promise<string>;
}
/**
 * Create an exec tool with default options.
 */
export declare function createExecTool(options?: ExecToolOptions): ExecTool;
//# sourceMappingURL=shell.d.ts.map