/**
 * Tests for configuration loader.
 */

import { describe, it, expect } from 'vitest';
import {
  camelToSnake,
  snakeToCamel,
  convertKeysToSnake,
  convertKeysToCamel,
  getConfigPath,
  getDataDir,
} from './loader.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('camelToSnake', () => {
  it('should convert single word', () => {
    expect(camelToSnake('hello')).toBe('hello');
  });

  it('should convert camelCase to snake_case', () => {
    expect(camelToSnake('helloWorld')).toBe('hello_world');
    expect(camelToSnake('maxTokens')).toBe('max_tokens');
    expect(camelToSnake('maxToolIterations')).toBe('max_tool_iterations');
  });

  it('should handle multiple uppercase letters', () => {
    expect(camelToSnake('getAPIKey')).toBe('get_a_p_i_key');
  });

  it('should handle leading lowercase', () => {
    expect(camelToSnake('apiKey')).toBe('api_key');
  });
});

describe('snakeToCamel', () => {
  it('should convert single word', () => {
    expect(snakeToCamel('hello')).toBe('hello');
  });

  it('should convert snake_case to camelCase', () => {
    expect(snakeToCamel('hello_world')).toBe('helloWorld');
    expect(snakeToCamel('max_tokens')).toBe('maxTokens');
    expect(snakeToCamel('max_tool_iterations')).toBe('maxToolIterations');
  });

  it('should handle multiple underscores', () => {
    expect(snakeToCamel('get_api_key')).toBe('getApiKey');
  });
});

describe('convertKeysToSnake', () => {
  it('should convert object keys', () => {
    const input = {
      maxTokens: 8192,
      maxToolIterations: 20,
    };
    const output = convertKeysToSnake(input);
    expect(output).toEqual({
      max_tokens: 8192,
      max_tool_iterations: 20,
    });
  });

  it('should handle nested objects', () => {
    const input = {
      agents: {
        defaults: {
          maxTokens: 8192,
          modelName: 'gpt-4',
        },
      },
    };
    const output = convertKeysToSnake(input);
    expect(output).toEqual({
      agents: {
        defaults: {
          max_tokens: 8192,
          model_name: 'gpt-4',
        },
      },
    });
  });

  it('should handle arrays', () => {
    const input = {
      allowFrom: [{ userId: '123' }, { userId: '456' }],
    };
    const output = convertKeysToSnake(input);
    expect(output).toEqual({
      allow_from: [{ user_id: '123' }, { user_id: '456' }],
    });
  });

  it('should handle null and undefined', () => {
    expect(convertKeysToSnake(null)).toBeNull();
    expect(convertKeysToSnake(undefined)).toBeUndefined();
  });

  it('should handle primitive values', () => {
    expect(convertKeysToSnake('string')).toBe('string');
    expect(convertKeysToSnake(123)).toBe(123);
    expect(convertKeysToSnake(true)).toBe(true);
  });
});

describe('convertKeysToCamel', () => {
  it('should convert object keys', () => {
    const input = {
      max_tokens: 8192,
      max_tool_iterations: 20,
    };
    const output = convertKeysToCamel(input);
    expect(output).toEqual({
      maxTokens: 8192,
      maxToolIterations: 20,
    });
  });

  it('should handle nested objects', () => {
    const input = {
      agents: {
        defaults: {
          max_tokens: 8192,
          model_name: 'gpt-4',
        },
      },
    };
    const output = convertKeysToCamel(input);
    expect(output).toEqual({
      agents: {
        defaults: {
          maxTokens: 8192,
          modelName: 'gpt-4',
        },
      },
    });
  });

  it('should handle arrays', () => {
    const input = {
      allow_from: [{ user_id: '123' }, { user_id: '456' }],
    };
    const output = convertKeysToCamel(input);
    expect(output).toEqual({
      allowFrom: [{ userId: '123' }, { userId: '456' }],
    });
  });

  it('should handle null and undefined', () => {
    expect(convertKeysToCamel(null)).toBeNull();
    expect(convertKeysToCamel(undefined)).toBeUndefined();
  });
});

describe('path helpers', () => {
  it('getConfigPath returns ~/.ingenium/config.json', () => {
    expect(getConfigPath()).toBe(join(homedir(), '.ingenium', 'config.json'));
  });

  it('getDataDir returns ~/.ingenium', () => {
    expect(getDataDir()).toBe(join(homedir(), '.ingenium'));
  });
});

describe('round-trip conversion', () => {
  it('should preserve data through camel -> snake -> camel', () => {
    const original = {
      agents: {
        defaults: {
          maxTokens: 8192,
          temperature: 0.7,
          maxToolIterations: 20,
        },
      },
      channels: {
        telegram: {
          enabled: true,
          allowFrom: ['user1', 'user2'],
        },
      },
      providers: {
        openrouter: {
          apiKey: 'sk-123',
          apiBase: null,
        },
      },
    };

    const snake = convertKeysToSnake(original);
    const camel = convertKeysToCamel(snake);

    expect(camel).toEqual(original);
  });

  it('should preserve data through snake -> camel -> snake', () => {
    const original = {
      agents: {
        defaults: {
          max_tokens: 8192,
          temperature: 0.7,
          max_tool_iterations: 20,
        },
      },
      channels: {
        telegram: {
          enabled: true,
          allow_from: ['user1', 'user2'],
        },
      },
    };

    const camel = convertKeysToCamel(original);
    const snake = convertKeysToSnake(camel);

    expect(snake).toEqual(original);
  });
});
