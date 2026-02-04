/**
 * Agent loop: the core processing engine.
 */
import { MessageBus, InboundMessage, OutboundMessage } from '../bus/index.js';
import type { LLMProvider } from '../providers/base.js';
import { ContextBuilder } from './context.js';
import { ToolRegistry } from './tools/registry.js';
import { SubagentManager } from './subagent.js';
import { SessionManager } from '../session/manager.js';
/**
 * Options for creating an AgentLoop.
 */
export interface AgentLoopOptions {
    bus: MessageBus;
    provider: LLMProvider;
    workspace: string;
    model?: string;
    maxIterations?: number;
    braveApiKey?: string;
}
/**
 * The agent loop is the core processing engine.
 *
 * It:
 * 1. Receives messages from the bus
 * 2. Builds context with history, memory, skills
 * 3. Calls the LLM
 * 4. Executes tool calls
 * 5. Sends responses back
 */
export declare class AgentLoop {
    readonly bus: MessageBus;
    readonly provider: LLMProvider;
    readonly workspace: string;
    readonly model: string;
    readonly maxIterations: number;
    readonly braveApiKey: string | null;
    readonly context: ContextBuilder;
    readonly sessions: SessionManager;
    readonly tools: ToolRegistry;
    readonly subagents: SubagentManager;
    private running;
    constructor(options: AgentLoopOptions);
    /**
     * Register the default set of tools.
     */
    private registerDefaultTools;
    /**
     * Run the agent loop, processing messages from the bus.
     */
    run(): Promise<void>;
    /**
     * Stop the agent loop.
     */
    stop(): void;
    /**
     * Process a single inbound message.
     *
     * @param msg - The inbound message to process.
     * @returns The response message, or null if no response needed.
     */
    processMessage(msg: InboundMessage): Promise<OutboundMessage | null>;
    /**
     * Process a system message (e.g., subagent announce).
     *
     * The chatId field contains "original_channel:original_chat_id" to route
     * the response back to the correct destination.
     */
    private processSystemMessage;
    /**
     * Convert ExtendedMessage[] to Message[] for the provider.
     */
    private convertMessages;
    /**
     * Process a message directly (for CLI usage).
     *
     * @param content - The message content.
     * @param _sessionKey - Session identifier (unused, for compatibility).
     * @returns The agent's response.
     */
    processDirect(content: string, _sessionKey?: string): Promise<string>;
    /**
     * Check if the agent loop is currently running.
     */
    isRunning(): boolean;
}
/**
 * Create an agent loop.
 */
export declare function createAgentLoop(options: AgentLoopOptions): AgentLoop;
//# sourceMappingURL=loop.d.ts.map