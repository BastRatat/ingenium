/**
 * Spawn tool implementation.
 */
import type { ToolParameters } from './base.js';
import { BaseTool } from './base.js';
/**
 * Interface for subagent manager.
 * Will be implemented in the agent module.
 */
export interface ISubagentManager {
    spawn(options: {
        task: string;
        label?: string;
        originChannel: string;
        originChatId: string;
    }): Promise<string>;
}
/**
 * Options for spawn tool.
 */
export interface SpawnToolOptions {
    /**
     * The subagent manager instance.
     */
    manager: ISubagentManager;
    /**
     * Default origin channel.
     */
    originChannel?: string;
    /**
     * Default origin chat ID.
     */
    originChatId?: string;
}
/**
 * Tool to spawn a subagent for background task execution.
 *
 * The subagent runs asynchronously and announces its result back
 * to the main agent when complete.
 */
export declare class SpawnTool extends BaseTool {
    readonly name = "spawn";
    readonly description: string;
    readonly parameters: ToolParameters;
    private manager;
    private originChannel;
    private originChatId;
    constructor(options: SpawnToolOptions);
    /**
     * Set the origin context for subagent announcements.
     */
    setContext(channel: string, chatId: string): void;
    execute(params: Record<string, unknown>): Promise<string>;
}
/**
 * Create a spawn tool.
 */
export declare function createSpawnTool(options: SpawnToolOptions): SpawnTool;
//# sourceMappingURL=spawn.d.ts.map