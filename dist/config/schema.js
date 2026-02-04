/**
 * Configuration schema using Zod.
 */
import { z } from 'zod';
import { homedir } from 'node:os';
import { join } from 'node:path';
/**
 * WhatsApp channel configuration.
 */
export const WhatsAppConfigSchema = z.object({
    enabled: z.boolean().default(false),
    bridgeUrl: z.string().default('ws://localhost:3001'),
    allowFrom: z.array(z.string()).default([]),
});
/**
 * Telegram channel configuration.
 */
export const TelegramConfigSchema = z.object({
    enabled: z.boolean().default(false),
    token: z.string().default(''),
    allowFrom: z.array(z.string()).default([]),
});
/**
 * Configuration for chat channels.
 */
export const ChannelsConfigSchema = z.object({
    whatsapp: WhatsAppConfigSchema.optional().transform((v) => WhatsAppConfigSchema.parse(v ?? {})),
    telegram: TelegramConfigSchema.optional().transform((v) => TelegramConfigSchema.parse(v ?? {})),
});
/**
 * Default agent configuration.
 */
export const AgentDefaultsSchema = z.object({
    workspace: z.string().default('~/.ingenium/workspace'),
    model: z.string().default('anthropic/claude-opus-4-5'),
    maxTokens: z.number().int().positive().default(8192),
    temperature: z.number().min(0).max(2).default(0.7),
    maxToolIterations: z.number().int().positive().default(20),
});
/**
 * Agent configuration.
 */
export const AgentsConfigSchema = z.object({
    defaults: AgentDefaultsSchema.optional().transform((v) => AgentDefaultsSchema.parse(v ?? {})),
});
/**
 * LLM provider configuration.
 */
export const ProviderConfigSchema = z.object({
    apiKey: z.string().default(''),
    apiBase: z.string().nullable().default(null),
});
/**
 * Configuration for LLM providers.
 */
export const ProvidersConfigSchema = z.object({
    anthropic: ProviderConfigSchema.optional().transform((v) => ProviderConfigSchema.parse(v ?? {})),
    openai: ProviderConfigSchema.optional().transform((v) => ProviderConfigSchema.parse(v ?? {})),
    openrouter: ProviderConfigSchema.optional().transform((v) => ProviderConfigSchema.parse(v ?? {})),
    groq: ProviderConfigSchema.optional().transform((v) => ProviderConfigSchema.parse(v ?? {})),
    zhipu: ProviderConfigSchema.optional().transform((v) => ProviderConfigSchema.parse(v ?? {})),
    vllm: ProviderConfigSchema.optional().transform((v) => ProviderConfigSchema.parse(v ?? {})),
    gemini: ProviderConfigSchema.optional().transform((v) => ProviderConfigSchema.parse(v ?? {})),
});
/**
 * Gateway/server configuration.
 */
export const GatewayConfigSchema = z.object({
    host: z.string().default('0.0.0.0'),
    port: z.number().int().positive().default(18790),
});
/**
 * Web search tool configuration.
 */
export const WebSearchConfigSchema = z.object({
    apiKey: z.string().default(''),
    maxResults: z.number().int().positive().default(5),
});
/**
 * Web tools configuration.
 */
export const WebToolsConfigSchema = z.object({
    search: WebSearchConfigSchema.optional().transform((v) => WebSearchConfigSchema.parse(v ?? {})),
});
/**
 * Tools configuration.
 */
export const ToolsConfigSchema = z.object({
    web: WebToolsConfigSchema.optional().transform((v) => WebToolsConfigSchema.parse(v ?? {})),
});
/**
 * Root configuration for ingenium.
 */
export const ConfigSchema = z.object({
    agents: AgentsConfigSchema.optional().transform((v) => AgentsConfigSchema.parse(v ?? {})),
    channels: ChannelsConfigSchema.optional().transform((v) => ChannelsConfigSchema.parse(v ?? {})),
    providers: ProvidersConfigSchema.optional().transform((v) => ProvidersConfigSchema.parse(v ?? {})),
    gateway: GatewayConfigSchema.optional().transform((v) => GatewayConfigSchema.parse(v ?? {})),
    tools: ToolsConfigSchema.optional().transform((v) => ToolsConfigSchema.parse(v ?? {})),
});
/**
 * Get the expanded workspace path from config.
 */
export function getWorkspacePathFromConfig(config) {
    const workspace = config.agents.defaults.workspace;
    if (workspace.startsWith('~')) {
        return join(homedir(), workspace.slice(1));
    }
    return workspace;
}
/**
 * Get API key in priority order.
 * Priority: OpenRouter > Anthropic > OpenAI > Gemini > Zhipu > Groq > vLLM
 */
export function getApiKey(config) {
    const providers = config.providers;
    return (providers.openrouter.apiKey ||
        providers.anthropic.apiKey ||
        providers.openai.apiKey ||
        providers.gemini.apiKey ||
        providers.zhipu.apiKey ||
        providers.groq.apiKey ||
        providers.vllm.apiKey ||
        null);
}
/**
 * Get API base URL if using OpenRouter, Zhipu, or vLLM.
 */
export function getApiBase(config) {
    const providers = config.providers;
    if (providers.openrouter.apiKey) {
        return providers.openrouter.apiBase ?? 'https://openrouter.ai/api/v1';
    }
    if (providers.zhipu.apiKey) {
        return providers.zhipu.apiBase;
    }
    if (providers.vllm.apiBase) {
        return providers.vllm.apiBase;
    }
    return null;
}
/**
 * Create a default configuration.
 */
export function createDefaultConfig() {
    return ConfigSchema.parse({});
}
//# sourceMappingURL=schema.js.map