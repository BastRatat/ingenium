/**
 * Tests for configuration schema.
 */

import { describe, it, expect } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  ConfigSchema,
  WhatsAppConfigSchema,
  TelegramConfigSchema,
  AgentDefaultsSchema,
  ProviderConfigSchema,
  GatewayConfigSchema,
  createDefaultConfig,
  getWorkspacePathFromConfig,
  getApiKey,
  getApiBase,
} from './schema.js';

describe('WhatsAppConfigSchema', () => {
  it('should parse with defaults', () => {
    const config = WhatsAppConfigSchema.parse({});
    expect(config.enabled).toBe(false);
    expect(config.bridgeUrl).toBe('ws://localhost:3001');
    expect(config.allowFrom).toEqual([]);
  });

  it('should parse with provided values', () => {
    const config = WhatsAppConfigSchema.parse({
      enabled: true,
      bridgeUrl: 'ws://custom:3002',
      allowFrom: ['+1234567890'],
    });
    expect(config.enabled).toBe(true);
    expect(config.bridgeUrl).toBe('ws://custom:3002');
    expect(config.allowFrom).toEqual(['+1234567890']);
  });
});

describe('TelegramConfigSchema', () => {
  it('should parse with defaults', () => {
    const config = TelegramConfigSchema.parse({});
    expect(config.enabled).toBe(false);
    expect(config.token).toBe('');
    expect(config.allowFrom).toEqual([]);
  });

  it('should parse with provided values', () => {
    const config = TelegramConfigSchema.parse({
      enabled: true,
      token: 'bot-token-123',
      allowFrom: ['user123', 'user456'],
    });
    expect(config.enabled).toBe(true);
    expect(config.token).toBe('bot-token-123');
    expect(config.allowFrom).toEqual(['user123', 'user456']);
  });
});

describe('AgentDefaultsSchema', () => {
  it('should parse with defaults', () => {
    const config = AgentDefaultsSchema.parse({});
    expect(config.workspace).toBe('~/.ingenium/workspace');
    expect(config.model).toBe('anthropic/claude-opus-4-5');
    expect(config.maxTokens).toBe(8192);
    expect(config.temperature).toBe(0.7);
    expect(config.maxToolIterations).toBe(20);
  });

  it('should validate temperature range', () => {
    expect(() =>
      AgentDefaultsSchema.parse({ temperature: -0.1 })
    ).toThrow();
    expect(() =>
      AgentDefaultsSchema.parse({ temperature: 2.1 })
    ).toThrow();
    expect(() =>
      AgentDefaultsSchema.parse({ temperature: 1.5 })
    ).not.toThrow();
  });

  it('should validate positive integers', () => {
    expect(() =>
      AgentDefaultsSchema.parse({ maxTokens: -1 })
    ).toThrow();
    expect(() =>
      AgentDefaultsSchema.parse({ maxToolIterations: 0 })
    ).toThrow();
  });
});

describe('ProviderConfigSchema', () => {
  it('should parse with defaults', () => {
    const config = ProviderConfigSchema.parse({});
    expect(config.apiKey).toBe('');
    expect(config.apiBase).toBeNull();
  });

  it('should accept apiBase as string or null', () => {
    const withBase = ProviderConfigSchema.parse({
      apiKey: 'key',
      apiBase: 'https://api.example.com',
    });
    expect(withBase.apiBase).toBe('https://api.example.com');

    const withNull = ProviderConfigSchema.parse({
      apiKey: 'key',
      apiBase: null,
    });
    expect(withNull.apiBase).toBeNull();
  });
});

describe('GatewayConfigSchema', () => {
  it('should parse with defaults', () => {
    const config = GatewayConfigSchema.parse({});
    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(18790);
  });
});

describe('ConfigSchema', () => {
  it('should parse empty object with all defaults', () => {
    const config = ConfigSchema.parse({});

    // Check nested defaults
    expect(config.agents.defaults.model).toBe('anthropic/claude-opus-4-5');
    expect(config.channels.telegram.enabled).toBe(false);
    expect(config.providers.anthropic.apiKey).toBe('');
    expect(config.gateway.port).toBe(18790);
    expect(config.tools.web.search.maxResults).toBe(5);
  });

  it('should parse partial config with overrides', () => {
    const config = ConfigSchema.parse({
      agents: {
        defaults: {
          model: 'openai/gpt-4',
          temperature: 0.5,
        },
      },
      providers: {
        openai: {
          apiKey: 'sk-123',
        },
      },
    });

    expect(config.agents.defaults.model).toBe('openai/gpt-4');
    expect(config.agents.defaults.temperature).toBe(0.5);
    // Other defaults should still apply
    expect(config.agents.defaults.maxTokens).toBe(8192);
    expect(config.providers.openai.apiKey).toBe('sk-123');
    expect(config.providers.anthropic.apiKey).toBe('');
  });
});

describe('createDefaultConfig', () => {
  it('should create config with all defaults', () => {
    const config = createDefaultConfig();
    expect(config.agents.defaults.workspace).toBe('~/.ingenium/workspace');
  });
});

describe('getWorkspacePathFromConfig', () => {
  it('should expand ~ to home directory', () => {
    const config = ConfigSchema.parse({});
    const path = getWorkspacePathFromConfig(config);
    expect(path).toBe(join(homedir(), '.ingenium/workspace'));
  });

  it('should use absolute path as-is', () => {
    const config = ConfigSchema.parse({
      agents: {
        defaults: {
          workspace: '/custom/workspace',
        },
      },
    });
    const path = getWorkspacePathFromConfig(config);
    expect(path).toBe('/custom/workspace');
  });
});

describe('getApiKey', () => {
  it('should return null when no keys configured', () => {
    const config = createDefaultConfig();
    expect(getApiKey(config)).toBeNull();
  });

  it('should prioritize openrouter', () => {
    const config = ConfigSchema.parse({
      providers: {
        openrouter: { apiKey: 'or-key' },
        anthropic: { apiKey: 'ant-key' },
      },
    });
    expect(getApiKey(config)).toBe('or-key');
  });

  it('should fall back to anthropic', () => {
    const config = ConfigSchema.parse({
      providers: {
        anthropic: { apiKey: 'ant-key' },
        openai: { apiKey: 'oai-key' },
      },
    });
    expect(getApiKey(config)).toBe('ant-key');
  });

  it('should fall back through priority chain', () => {
    const config = ConfigSchema.parse({
      providers: {
        groq: { apiKey: 'groq-key' },
      },
    });
    expect(getApiKey(config)).toBe('groq-key');
  });
});

describe('getApiBase', () => {
  it('should return null when no base configured', () => {
    const config = ConfigSchema.parse({
      providers: {
        anthropic: { apiKey: 'key' },
      },
    });
    expect(getApiBase(config)).toBeNull();
  });

  it('should return default openrouter base', () => {
    const config = ConfigSchema.parse({
      providers: {
        openrouter: { apiKey: 'key' },
      },
    });
    expect(getApiBase(config)).toBe('https://openrouter.ai/api/v1');
  });

  it('should return custom openrouter base', () => {
    const config = ConfigSchema.parse({
      providers: {
        openrouter: {
          apiKey: 'key',
          apiBase: 'https://custom.openrouter.ai/v1',
        },
      },
    });
    expect(getApiBase(config)).toBe('https://custom.openrouter.ai/v1');
  });

  it('should return zhipu base when configured', () => {
    const config = ConfigSchema.parse({
      providers: {
        zhipu: {
          apiKey: 'key',
          apiBase: 'https://api.zhipu.ai',
        },
      },
    });
    expect(getApiBase(config)).toBe('https://api.zhipu.ai');
  });

  it('should return vllm base when configured', () => {
    const config = ConfigSchema.parse({
      providers: {
        vllm: {
          apiBase: 'http://localhost:8000',
        },
      },
    });
    expect(getApiBase(config)).toBe('http://localhost:8000');
  });
});
