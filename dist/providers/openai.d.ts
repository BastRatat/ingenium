/**
 * OpenAI-compatible LLM provider implementation.
 * Works with OpenAI, OpenRouter, and other OpenAI-compatible APIs.
 */
import type { LLMProvider, LLMResponse, ChatOptions, ProviderOptions } from './base.js';
/**
 * Options for OpenAI-compatible provider.
 */
export interface OpenAIProviderOptions extends ProviderOptions {
    /**
     * Whether this is an OpenRouter endpoint.
     */
    isOpenRouter?: boolean;
}
/**
 * OpenAI-compatible LLM provider.
 * Works with OpenAI, OpenRouter, vLLM, and other compatible APIs.
 */
export declare class OpenAIProvider implements LLMProvider {
    private client;
    private defaultModel;
    constructor(options?: OpenAIProviderOptions);
    chat(options: ChatOptions): Promise<LLMResponse>;
    getDefaultModel(): string;
}
/**
 * Create an OpenRouter provider.
 */
export declare function createOpenRouterProvider(apiKey: string): OpenAIProvider;
//# sourceMappingURL=openai.d.ts.map