/**
 * Provider factory for creating LLM providers from configuration.
 */
import type { Config } from '../config/schema.js';
import type { LLMProvider } from './base.js';
/**
 * Supported provider types.
 */
export type ProviderType = 'anthropic' | 'openai' | 'openrouter' | 'groq' | 'zhipu' | 'vllm' | 'gemini';
/**
 * Detect provider type from model name.
 */
export declare function detectProviderFromModel(model: string): ProviderType;
/**
 * Create an LLM provider from configuration.
 */
export declare function createProviderFromConfig(config: Config): LLMProvider | null;
/**
 * Create a provider by type with explicit credentials.
 */
export declare function createProvider(type: ProviderType, apiKey: string, apiBase?: string): LLMProvider;
//# sourceMappingURL=factory.d.ts.map