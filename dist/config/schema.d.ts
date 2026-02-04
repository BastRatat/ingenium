/**
 * Configuration schema using Zod.
 */
import { z } from 'zod';
/**
 * WhatsApp channel configuration.
 */
export declare const WhatsAppConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    bridgeUrl: z.ZodDefault<z.ZodString>;
    allowFrom: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type WhatsAppConfig = z.infer<typeof WhatsAppConfigSchema>;
/**
 * Telegram channel configuration.
 */
export declare const TelegramConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    token: z.ZodDefault<z.ZodString>;
    allowFrom: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type TelegramConfig = z.infer<typeof TelegramConfigSchema>;
/**
 * Configuration for chat channels.
 */
export declare const ChannelsConfigSchema: z.ZodObject<{
    whatsapp: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        bridgeUrl: z.ZodDefault<z.ZodString>;
        allowFrom: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>, z.ZodTransform<{
        enabled: boolean;
        bridgeUrl: string;
        allowFrom: string[];
    }, {
        enabled: boolean;
        bridgeUrl: string;
        allowFrom: string[];
    } | undefined>>;
    telegram: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        token: z.ZodDefault<z.ZodString>;
        allowFrom: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>, z.ZodTransform<{
        enabled: boolean;
        token: string;
        allowFrom: string[];
    }, {
        enabled: boolean;
        token: string;
        allowFrom: string[];
    } | undefined>>;
}, z.core.$strip>;
export type ChannelsConfig = z.infer<typeof ChannelsConfigSchema>;
/**
 * Default agent configuration.
 */
export declare const AgentDefaultsSchema: z.ZodObject<{
    workspace: z.ZodDefault<z.ZodString>;
    model: z.ZodDefault<z.ZodString>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    temperature: z.ZodDefault<z.ZodNumber>;
    maxToolIterations: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type AgentDefaults = z.infer<typeof AgentDefaultsSchema>;
/**
 * Agent configuration.
 */
export declare const AgentsConfigSchema: z.ZodObject<{
    defaults: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        workspace: z.ZodDefault<z.ZodString>;
        model: z.ZodDefault<z.ZodString>;
        maxTokens: z.ZodDefault<z.ZodNumber>;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxToolIterations: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>, z.ZodTransform<{
        workspace: string;
        model: string;
        maxTokens: number;
        temperature: number;
        maxToolIterations: number;
    }, {
        workspace: string;
        model: string;
        maxTokens: number;
        temperature: number;
        maxToolIterations: number;
    } | undefined>>;
}, z.core.$strip>;
export type AgentsConfig = z.infer<typeof AgentsConfigSchema>;
/**
 * LLM provider configuration.
 */
export declare const ProviderConfigSchema: z.ZodObject<{
    apiKey: z.ZodDefault<z.ZodString>;
    apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
/**
 * Configuration for LLM providers.
 */
export declare const ProvidersConfigSchema: z.ZodObject<{
    anthropic: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodDefault<z.ZodString>;
        apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>, z.ZodTransform<{
        apiKey: string;
        apiBase: string | null;
    }, {
        apiKey: string;
        apiBase: string | null;
    } | undefined>>;
    openai: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodDefault<z.ZodString>;
        apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>, z.ZodTransform<{
        apiKey: string;
        apiBase: string | null;
    }, {
        apiKey: string;
        apiBase: string | null;
    } | undefined>>;
    openrouter: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodDefault<z.ZodString>;
        apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>, z.ZodTransform<{
        apiKey: string;
        apiBase: string | null;
    }, {
        apiKey: string;
        apiBase: string | null;
    } | undefined>>;
    groq: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodDefault<z.ZodString>;
        apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>, z.ZodTransform<{
        apiKey: string;
        apiBase: string | null;
    }, {
        apiKey: string;
        apiBase: string | null;
    } | undefined>>;
    zhipu: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodDefault<z.ZodString>;
        apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>, z.ZodTransform<{
        apiKey: string;
        apiBase: string | null;
    }, {
        apiKey: string;
        apiBase: string | null;
    } | undefined>>;
    vllm: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodDefault<z.ZodString>;
        apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>, z.ZodTransform<{
        apiKey: string;
        apiBase: string | null;
    }, {
        apiKey: string;
        apiBase: string | null;
    } | undefined>>;
    gemini: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodDefault<z.ZodString>;
        apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>, z.ZodTransform<{
        apiKey: string;
        apiBase: string | null;
    }, {
        apiKey: string;
        apiBase: string | null;
    } | undefined>>;
}, z.core.$strip>;
export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;
/**
 * Gateway/server configuration.
 */
export declare const GatewayConfigSchema: z.ZodObject<{
    host: z.ZodDefault<z.ZodString>;
    port: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;
/**
 * Web search tool configuration.
 */
export declare const WebSearchConfigSchema: z.ZodObject<{
    apiKey: z.ZodDefault<z.ZodString>;
    maxResults: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type WebSearchConfig = z.infer<typeof WebSearchConfigSchema>;
/**
 * Web tools configuration.
 */
export declare const WebToolsConfigSchema: z.ZodObject<{
    search: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodDefault<z.ZodString>;
        maxResults: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>, z.ZodTransform<{
        apiKey: string;
        maxResults: number;
    }, {
        apiKey: string;
        maxResults: number;
    } | undefined>>;
}, z.core.$strip>;
export type WebToolsConfig = z.infer<typeof WebToolsConfigSchema>;
/**
 * Tools configuration.
 */
export declare const ToolsConfigSchema: z.ZodObject<{
    web: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        search: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            apiKey: z.ZodDefault<z.ZodString>;
            maxResults: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>, z.ZodTransform<{
            apiKey: string;
            maxResults: number;
        }, {
            apiKey: string;
            maxResults: number;
        } | undefined>>;
    }, z.core.$strip>>, z.ZodTransform<{
        search: {
            apiKey: string;
            maxResults: number;
        };
    }, {
        search: {
            apiKey: string;
            maxResults: number;
        };
    } | undefined>>;
}, z.core.$strip>;
export type ToolsConfig = z.infer<typeof ToolsConfigSchema>;
/**
 * Root configuration for ingenium.
 */
export declare const ConfigSchema: z.ZodObject<{
    agents: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        defaults: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            workspace: z.ZodDefault<z.ZodString>;
            model: z.ZodDefault<z.ZodString>;
            maxTokens: z.ZodDefault<z.ZodNumber>;
            temperature: z.ZodDefault<z.ZodNumber>;
            maxToolIterations: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>, z.ZodTransform<{
            workspace: string;
            model: string;
            maxTokens: number;
            temperature: number;
            maxToolIterations: number;
        }, {
            workspace: string;
            model: string;
            maxTokens: number;
            temperature: number;
            maxToolIterations: number;
        } | undefined>>;
    }, z.core.$strip>>, z.ZodTransform<{
        defaults: {
            workspace: string;
            model: string;
            maxTokens: number;
            temperature: number;
            maxToolIterations: number;
        };
    }, {
        defaults: {
            workspace: string;
            model: string;
            maxTokens: number;
            temperature: number;
            maxToolIterations: number;
        };
    } | undefined>>;
    channels: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        whatsapp: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            bridgeUrl: z.ZodDefault<z.ZodString>;
            allowFrom: z.ZodDefault<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>, z.ZodTransform<{
            enabled: boolean;
            bridgeUrl: string;
            allowFrom: string[];
        }, {
            enabled: boolean;
            bridgeUrl: string;
            allowFrom: string[];
        } | undefined>>;
        telegram: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            token: z.ZodDefault<z.ZodString>;
            allowFrom: z.ZodDefault<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>, z.ZodTransform<{
            enabled: boolean;
            token: string;
            allowFrom: string[];
        }, {
            enabled: boolean;
            token: string;
            allowFrom: string[];
        } | undefined>>;
    }, z.core.$strip>>, z.ZodTransform<{
        whatsapp: {
            enabled: boolean;
            bridgeUrl: string;
            allowFrom: string[];
        };
        telegram: {
            enabled: boolean;
            token: string;
            allowFrom: string[];
        };
    }, {
        whatsapp: {
            enabled: boolean;
            bridgeUrl: string;
            allowFrom: string[];
        };
        telegram: {
            enabled: boolean;
            token: string;
            allowFrom: string[];
        };
    } | undefined>>;
    providers: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        anthropic: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            apiKey: z.ZodDefault<z.ZodString>;
            apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>, z.ZodTransform<{
            apiKey: string;
            apiBase: string | null;
        }, {
            apiKey: string;
            apiBase: string | null;
        } | undefined>>;
        openai: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            apiKey: z.ZodDefault<z.ZodString>;
            apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>, z.ZodTransform<{
            apiKey: string;
            apiBase: string | null;
        }, {
            apiKey: string;
            apiBase: string | null;
        } | undefined>>;
        openrouter: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            apiKey: z.ZodDefault<z.ZodString>;
            apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>, z.ZodTransform<{
            apiKey: string;
            apiBase: string | null;
        }, {
            apiKey: string;
            apiBase: string | null;
        } | undefined>>;
        groq: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            apiKey: z.ZodDefault<z.ZodString>;
            apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>, z.ZodTransform<{
            apiKey: string;
            apiBase: string | null;
        }, {
            apiKey: string;
            apiBase: string | null;
        } | undefined>>;
        zhipu: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            apiKey: z.ZodDefault<z.ZodString>;
            apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>, z.ZodTransform<{
            apiKey: string;
            apiBase: string | null;
        }, {
            apiKey: string;
            apiBase: string | null;
        } | undefined>>;
        vllm: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            apiKey: z.ZodDefault<z.ZodString>;
            apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>, z.ZodTransform<{
            apiKey: string;
            apiBase: string | null;
        }, {
            apiKey: string;
            apiBase: string | null;
        } | undefined>>;
        gemini: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            apiKey: z.ZodDefault<z.ZodString>;
            apiBase: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>, z.ZodTransform<{
            apiKey: string;
            apiBase: string | null;
        }, {
            apiKey: string;
            apiBase: string | null;
        } | undefined>>;
    }, z.core.$strip>>, z.ZodTransform<{
        anthropic: {
            apiKey: string;
            apiBase: string | null;
        };
        openai: {
            apiKey: string;
            apiBase: string | null;
        };
        openrouter: {
            apiKey: string;
            apiBase: string | null;
        };
        groq: {
            apiKey: string;
            apiBase: string | null;
        };
        zhipu: {
            apiKey: string;
            apiBase: string | null;
        };
        vllm: {
            apiKey: string;
            apiBase: string | null;
        };
        gemini: {
            apiKey: string;
            apiBase: string | null;
        };
    }, {
        anthropic: {
            apiKey: string;
            apiBase: string | null;
        };
        openai: {
            apiKey: string;
            apiBase: string | null;
        };
        openrouter: {
            apiKey: string;
            apiBase: string | null;
        };
        groq: {
            apiKey: string;
            apiBase: string | null;
        };
        zhipu: {
            apiKey: string;
            apiBase: string | null;
        };
        vllm: {
            apiKey: string;
            apiBase: string | null;
        };
        gemini: {
            apiKey: string;
            apiBase: string | null;
        };
    } | undefined>>;
    gateway: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        host: z.ZodDefault<z.ZodString>;
        port: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>, z.ZodTransform<{
        host: string;
        port: number;
    }, {
        host: string;
        port: number;
    } | undefined>>;
    tools: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        web: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            search: z.ZodPipe<z.ZodOptional<z.ZodObject<{
                apiKey: z.ZodDefault<z.ZodString>;
                maxResults: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>>, z.ZodTransform<{
                apiKey: string;
                maxResults: number;
            }, {
                apiKey: string;
                maxResults: number;
            } | undefined>>;
        }, z.core.$strip>>, z.ZodTransform<{
            search: {
                apiKey: string;
                maxResults: number;
            };
        }, {
            search: {
                apiKey: string;
                maxResults: number;
            };
        } | undefined>>;
    }, z.core.$strip>>, z.ZodTransform<{
        web: {
            search: {
                apiKey: string;
                maxResults: number;
            };
        };
    }, {
        web: {
            search: {
                apiKey: string;
                maxResults: number;
            };
        };
    } | undefined>>;
}, z.core.$strip>;
export type Config = z.infer<typeof ConfigSchema>;
/**
 * Get the expanded workspace path from config.
 */
export declare function getWorkspacePathFromConfig(config: Config): string;
/**
 * Get API key in priority order.
 * Priority: OpenRouter > Anthropic > OpenAI > Gemini > Zhipu > Groq > vLLM
 */
export declare function getApiKey(config: Config): string | null;
/**
 * Get API base URL if using OpenRouter, Zhipu, or vLLM.
 */
export declare function getApiBase(config: Config): string | null;
/**
 * Create a default configuration.
 */
export declare function createDefaultConfig(): Config;
//# sourceMappingURL=schema.d.ts.map