/**
 * Context builder for assembling agent prompts.
 */
import { MemoryStore } from './memory.js';
import { SkillsLoader } from './skills.js';
/**
 * Content block for multimodal messages.
 */
export interface ContentBlock {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
    };
}
/**
 * Extended message with tool calls.
 */
export interface ExtendedMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | ContentBlock[];
    tool_calls?: ToolCallBlock[];
    tool_call_id?: string;
    name?: string;
}
/**
 * Tool call block for assistant messages.
 */
export interface ToolCallBlock {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
/**
 * Builds the context (system prompt + messages) for the agent.
 *
 * Assembles bootstrap files, memory, skills, and conversation history
 * into a coherent prompt for the LLM.
 */
export declare class ContextBuilder {
    readonly workspace: string;
    readonly memory: MemoryStore;
    readonly skills: SkillsLoader;
    constructor(workspace: string);
    /**
     * Build the system prompt from bootstrap files, memory, and skills.
     *
     * @param _skillNames - Optional list of skills to include (unused, for future).
     * @returns Complete system prompt.
     */
    buildSystemPrompt(_skillNames?: string[]): Promise<string>;
    /**
     * Get the core identity section.
     */
    private getIdentity;
    /**
     * Load all bootstrap files from workspace.
     */
    private loadBootstrapFiles;
    /**
     * Build the complete message list for an LLM call.
     *
     * @param history - Previous conversation messages.
     * @param currentMessage - The new user message.
     * @param skillNames - Optional skills to include.
     * @param media - Optional list of local file paths for images/media.
     * @returns List of messages including system prompt.
     */
    buildMessages(history: Array<{
        role: string;
        content: string;
    }>, currentMessage: string, skillNames?: string[], media?: string[]): Promise<ExtendedMessage[]>;
    /**
     * Build user message content with optional base64-encoded images.
     */
    private buildUserContent;
    /**
     * Guess MIME type from file extension.
     */
    private guessMimeType;
    /**
     * Add a tool result to the message list.
     *
     * @param messages - Current message list.
     * @param toolCallId - ID of the tool call.
     * @param toolName - Name of the tool.
     * @param result - Tool execution result.
     * @returns Updated message list.
     */
    addToolResult(messages: ExtendedMessage[], toolCallId: string, toolName: string, result: string): ExtendedMessage[];
    /**
     * Add an assistant message to the message list.
     *
     * @param messages - Current message list.
     * @param content - Message content.
     * @param toolCalls - Optional tool calls.
     * @returns Updated message list.
     */
    addAssistantMessage(messages: ExtendedMessage[], content: string | null, toolCalls?: ToolCallBlock[]): ExtendedMessage[];
}
/**
 * Create a context builder.
 */
export declare function createContextBuilder(workspace: string): ContextBuilder;
//# sourceMappingURL=context.d.ts.map