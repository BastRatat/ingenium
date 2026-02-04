/**
 * Subagent manager for background task execution.
 */
import { MessageBus } from '../bus/index.js';
import type { LLMProvider } from '../providers/base.js';
/**
 * Manages background subagent execution.
 *
 * Subagents are lightweight agent instances that run in the background
 * to handle specific tasks. They share the same LLM provider but have
 * isolated context and a focused system prompt.
 */
export declare class SubagentManager {
    readonly provider: LLMProvider;
    readonly workspace: string;
    readonly bus: MessageBus;
    readonly model: string;
    readonly braveApiKey: string | null;
    private runningTasks;
    constructor(options: {
        provider: LLMProvider;
        workspace: string;
        bus: MessageBus;
        model?: string;
        braveApiKey?: string;
    });
    /**
     * Spawn a subagent to execute a task in the background.
     *
     * @param options - Spawn options containing task, label, originChannel, originChatId.
     * @returns Status message indicating the subagent was started.
     */
    spawn(options: {
        task: string;
        label?: string;
        originChannel: string;
        originChatId: string;
    }): Promise<string>;
    /**
     * Execute the subagent task and announce the result.
     */
    private runSubagent;
    /**
     * Announce the subagent result to the main agent via the message bus.
     */
    private announceResult;
    /**
     * Build a focused system prompt for the subagent.
     */
    private buildSubagentPrompt;
    /**
     * Return the number of currently running subagents.
     */
    getRunningCount(): number;
    /**
     * Get IDs of all running subagents.
     */
    getRunningIds(): string[];
    /**
     * Cancel a running subagent by ID.
     */
    cancel(taskId: string): boolean;
}
/**
 * Create a subagent manager.
 */
export declare function createSubagentManager(options: {
    provider: LLMProvider;
    workspace: string;
    bus: MessageBus;
    model?: string;
    braveApiKey?: string;
}): SubagentManager;
//# sourceMappingURL=subagent.d.ts.map