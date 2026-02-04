/**
 * Base LLM provider abstraction.
 */
/**
 * A tool call request from the LLM.
 */
export interface ToolCallRequest {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}
/**
 * Response from an LLM provider.
 */
export interface LLMResponse {
    content: string | null;
    toolCalls: ToolCallRequest[];
    finishReason: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
/**
 * Check if response contains tool calls.
 */
export declare function hasToolCalls(response: LLMResponse): boolean;
/**
 * Create an empty LLM response.
 */
export declare function createEmptyResponse(content?: string | null, finishReason?: string): LLMResponse;
/**
 * Message role in a conversation.
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
/**
 * A message in a conversation.
 */
export interface Message {
    role: MessageRole;
    content: string;
    toolCallId?: string;
    name?: string;
}
/**
 * Tool definition for LLM function calling.
 */
export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, unknown>;
            required?: string[];
        };
    };
}
/**
 * Options for chat completion requests.
 */
export interface ChatOptions {
    messages: Message[];
    tools?: ToolDefinition[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
}
/**
 * Abstract base interface for LLM providers.
 *
 * Implementations should handle the specifics of each provider's API
 * while maintaining a consistent interface.
 */
export interface LLMProvider {
    /**
     * Send a chat completion request.
     */
    chat(options: ChatOptions): Promise<LLMResponse>;
    /**
     * Get the default model for this provider.
     */
    getDefaultModel(): string;
}
/**
 * Base configuration for LLM providers.
 */
export interface ProviderOptions {
    apiKey?: string;
    apiBase?: string;
}
//# sourceMappingURL=base.d.ts.map