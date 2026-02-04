/**
 * Anthropic LLM provider implementation.
 */
import type { LLMProvider, LLMResponse, ChatOptions, ProviderOptions } from './base.js';
/**
 * Anthropic LLM provider using the official SDK.
 */
export declare class AnthropicProvider implements LLMProvider {
    private client;
    private defaultModel;
    constructor(options?: ProviderOptions);
    chat(options: ChatOptions): Promise<LLMResponse>;
    getDefaultModel(): string;
}
//# sourceMappingURL=anthropic.d.ts.map