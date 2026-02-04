/**
 * Provider factory for creating LLM providers from configuration.
 */
import { getApiKey, getApiBase } from '../config/schema.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider, createOpenRouterProvider } from './openai.js';
/**
 * Build provider options, only including apiBase when defined.
 */
function buildProviderOptions(apiKey, apiBase) {
    const options = { apiKey };
    if (apiBase) {
        options.apiBase = apiBase;
    }
    return options;
}
/**
 * Build OpenAI provider options, only including apiBase when defined.
 */
function buildOpenAIOptions(apiKey, apiBase) {
    const options = { apiKey };
    if (apiBase) {
        options.apiBase = apiBase;
    }
    return options;
}
/**
 * Detect provider type from model name.
 */
export function detectProviderFromModel(model) {
    const lowerModel = model.toLowerCase();
    if (lowerModel.startsWith('anthropic/') || lowerModel.includes('claude')) {
        return 'anthropic';
    }
    if (lowerModel.startsWith('openai/') || lowerModel.includes('gpt')) {
        return 'openai';
    }
    if (lowerModel.startsWith('groq/')) {
        return 'groq';
    }
    if (lowerModel.startsWith('zhipu/') ||
        lowerModel.startsWith('zai/') ||
        lowerModel.includes('glm')) {
        return 'zhipu';
    }
    if (lowerModel.startsWith('gemini/')) {
        return 'gemini';
    }
    if (lowerModel.startsWith('hosted_vllm/')) {
        return 'vllm';
    }
    // Default to openrouter for unknown models
    return 'openrouter';
}
/**
 * Create an LLM provider from configuration.
 */
export function createProviderFromConfig(config) {
    const providers = config.providers;
    // Check for vLLM first since it may not require an API key
    if (providers.vllm.apiBase) {
        return new OpenAIProvider(buildOpenAIOptions(providers.vllm.apiKey || 'EMPTY', // vLLM may not require API key
        providers.vllm.apiBase));
    }
    const apiKey = getApiKey(config);
    const apiBase = getApiBase(config);
    if (!apiKey) {
        return null;
    }
    const model = config.agents.defaults.model;
    // Check for OpenRouter first (highest priority in getApiKey)
    if (providers.openrouter.apiKey) {
        return createOpenRouterProvider(providers.openrouter.apiKey);
    }
    // Check for Anthropic
    if (providers.anthropic.apiKey) {
        return new AnthropicProvider(buildProviderOptions(providers.anthropic.apiKey, providers.anthropic.apiBase));
    }
    // Check for OpenAI
    if (providers.openai.apiKey) {
        return new OpenAIProvider(buildOpenAIOptions(providers.openai.apiKey, providers.openai.apiBase));
    }
    // For Gemini, Groq, Zhipu, vLLM - use OpenAI-compatible interface
    // These providers typically expose OpenAI-compatible APIs
    if (providers.gemini.apiKey) {
        return new OpenAIProvider(buildOpenAIOptions(providers.gemini.apiKey, providers.gemini.apiBase ?? 'https://generativelanguage.googleapis.com/v1beta/openai/'));
    }
    if (providers.groq.apiKey) {
        return new OpenAIProvider(buildOpenAIOptions(providers.groq.apiKey, providers.groq.apiBase ?? 'https://api.groq.com/openai/v1'));
    }
    if (providers.zhipu.apiKey) {
        return new OpenAIProvider(buildOpenAIOptions(providers.zhipu.apiKey, providers.zhipu.apiBase ?? 'https://open.bigmodel.cn/api/paas/v4/'));
    }
    // Fallback: detect provider from model and use the API key
    const providerType = detectProviderFromModel(model);
    switch (providerType) {
        case 'anthropic':
            return new AnthropicProvider(buildProviderOptions(apiKey, apiBase));
        case 'openai':
        case 'openrouter':
        case 'groq':
        case 'zhipu':
        case 'gemini':
        case 'vllm':
            return new OpenAIProvider(buildOpenAIOptions(apiKey, apiBase));
        default:
            return new OpenAIProvider(buildOpenAIOptions(apiKey, apiBase));
    }
}
/**
 * Create a provider by type with explicit credentials.
 */
export function createProvider(type, apiKey, apiBase) {
    switch (type) {
        case 'anthropic':
            return new AnthropicProvider(buildProviderOptions(apiKey, apiBase));
        case 'openrouter':
            return createOpenRouterProvider(apiKey);
        case 'openai':
        case 'groq':
        case 'zhipu':
        case 'gemini':
        case 'vllm':
            return new OpenAIProvider(buildOpenAIOptions(apiKey, apiBase));
        default:
            return new OpenAIProvider(buildOpenAIOptions(apiKey, apiBase));
    }
}
//# sourceMappingURL=factory.js.map