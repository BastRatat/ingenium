/**
 * Tests for provider factory.
 */

import { describe, it, expect } from 'vitest';
import { ConfigSchema } from '../config/schema.js';
import {
  detectProviderFromModel,
  createProviderFromConfig,
  createProvider,
} from './factory.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';

describe('detectProviderFromModel', () => {
  it('should detect anthropic from model prefix', () => {
    expect(detectProviderFromModel('anthropic/claude-3-opus')).toBe('anthropic');
    expect(detectProviderFromModel('anthropic/claude-sonnet-4-5')).toBe('anthropic');
  });

  it('should detect anthropic from claude in name', () => {
    expect(detectProviderFromModel('claude-3-opus')).toBe('anthropic');
    expect(detectProviderFromModel('claude-instant')).toBe('anthropic');
  });

  it('should detect openai from model prefix', () => {
    expect(detectProviderFromModel('openai/gpt-4')).toBe('openai');
    expect(detectProviderFromModel('openai/gpt-3.5-turbo')).toBe('openai');
  });

  it('should detect openai from gpt in name', () => {
    expect(detectProviderFromModel('gpt-4o')).toBe('openai');
    expect(detectProviderFromModel('gpt-4-turbo')).toBe('openai');
  });

  it('should detect groq from prefix', () => {
    expect(detectProviderFromModel('groq/llama-3.1-70b')).toBe('groq');
  });

  it('should detect zhipu from prefix or glm', () => {
    expect(detectProviderFromModel('zhipu/glm-4')).toBe('zhipu');
    expect(detectProviderFromModel('zai/glm-4')).toBe('zhipu');
    expect(detectProviderFromModel('glm-4.7-flash')).toBe('zhipu');
  });

  it('should detect gemini from prefix', () => {
    expect(detectProviderFromModel('gemini/gemini-pro')).toBe('gemini');
  });

  it('should detect vllm from prefix', () => {
    expect(detectProviderFromModel('hosted_vllm/mistral-7b')).toBe('vllm');
  });

  it('should default to openrouter for unknown models', () => {
    expect(detectProviderFromModel('meta/llama-3.1-70b')).toBe('openrouter');
    expect(detectProviderFromModel('mistral/mixtral-8x7b')).toBe('openrouter');
  });
});

describe('createProviderFromConfig', () => {
  it('should return null when no API keys configured', () => {
    const config = ConfigSchema.parse({});
    const provider = createProviderFromConfig(config);
    expect(provider).toBeNull();
  });

  it('should create OpenRouter provider when configured', () => {
    const config = ConfigSchema.parse({
      providers: {
        openrouter: { apiKey: 'sk-or-test' },
      },
    });
    const provider = createProviderFromConfig(config);
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('should create Anthropic provider when configured', () => {
    const config = ConfigSchema.parse({
      providers: {
        anthropic: { apiKey: 'sk-ant-test' },
      },
    });
    const provider = createProviderFromConfig(config);
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('should create OpenAI provider when configured', () => {
    const config = ConfigSchema.parse({
      providers: {
        openai: { apiKey: 'sk-test' },
      },
    });
    const provider = createProviderFromConfig(config);
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('should prioritize openrouter over anthropic', () => {
    const config = ConfigSchema.parse({
      providers: {
        openrouter: { apiKey: 'sk-or-test' },
        anthropic: { apiKey: 'sk-ant-test' },
      },
    });
    const provider = createProviderFromConfig(config);
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider?.getDefaultModel()).toBe('anthropic/claude-opus-4-5');
  });

  it('should create Gemini provider as OpenAI-compatible', () => {
    const config = ConfigSchema.parse({
      providers: {
        gemini: { apiKey: 'gemini-test' },
      },
    });
    const provider = createProviderFromConfig(config);
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('should create Groq provider as OpenAI-compatible', () => {
    const config = ConfigSchema.parse({
      providers: {
        groq: { apiKey: 'groq-test' },
      },
    });
    const provider = createProviderFromConfig(config);
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('should create vLLM provider when apiBase is set', () => {
    const config = ConfigSchema.parse({
      providers: {
        vllm: { apiBase: 'http://localhost:8000' },
      },
    });
    const provider = createProviderFromConfig(config);
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });
});

describe('createProvider', () => {
  it('should create Anthropic provider', () => {
    const provider = createProvider('anthropic', 'test-key');
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('should create OpenAI provider', () => {
    const provider = createProvider('openai', 'test-key');
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.getDefaultModel()).toBe('gpt-4o');
  });

  it('should create OpenRouter provider', () => {
    const provider = createProvider('openrouter', 'test-key');
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.getDefaultModel()).toBe('anthropic/claude-opus-4-5');
  });

  it('should create provider with custom base URL', () => {
    const provider = createProvider('openai', 'test-key', 'https://custom.api.com');
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });
});
