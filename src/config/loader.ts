/**
 * Configuration loading utilities.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { Config, ConfigSchema, createDefaultConfig } from './schema.js';
import type { Logger } from '../types/index.js';

/**
 * Get the default configuration file path.
 */
export function getConfigPath(): string {
  return join(homedir(), '.ingenium', 'config.json');
}

/**
 * Get the ingenium data directory.
 */
export function getDataDir(): string {
  return join(homedir(), '.ingenium');
}

/**
 * Convert camelCase to snake_case.
 */
export function camelToSnake(name: string): string {
  const result: string[] = [];
  for (let i = 0; i < name.length; i++) {
    const char = name[i]!;
    if (char >= 'A' && char <= 'Z' && i > 0) {
      result.push('_');
    }
    result.push(char.toLowerCase());
  }
  return result.join('');
}

/**
 * Convert snake_case to camelCase.
 */
export function snakeToCamel(name: string): string {
  const components = name.split('_');
  if (components.length === 0) return name;

  const first = components[0] ?? '';
  const rest = components.slice(1).map((x) => {
    if (x.length === 0) return '';
    return x.charAt(0).toUpperCase() + x.slice(1);
  });

  return first + rest.join('');
}

/**
 * Convert all keys in an object from camelCase to snake_case (recursive).
 */
export function convertKeysToSnake(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => convertKeysToSnake(item));
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[camelToSnake(key)] = convertKeysToSnake(value);
    }
    return result;
  }

  return data;
}

/**
 * Convert all keys in an object from snake_case to camelCase (recursive).
 */
export function convertKeysToCamel(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => convertKeysToCamel(item));
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[snakeToCamel(key)] = convertKeysToCamel(value);
    }
    return result;
  }

  return data;
}

/**
 * Load configuration from file or create default.
 *
 * @param configPath - Optional path to config file. Uses default if not provided.
 * @param logger - Optional logger for warnings.
 * @returns Loaded configuration object.
 */
export async function loadConfig(
  configPath?: string,
  logger?: Logger
): Promise<Config> {
  const path = configPath ?? getConfigPath();

  if (existsSync(path)) {
    try {
      const content = await readFile(path, 'utf-8');
      const data = JSON.parse(content) as unknown;

      // Convert snake_case keys to camelCase for Zod
      const converted = convertKeysToCamel(data);

      // Parse and validate with Zod
      const result = ConfigSchema.safeParse(converted);
      if (result.success) {
        return result.data;
      }

      // Log validation errors
      logger?.warn(
        { errors: result.error.format() },
        `Config validation warnings for ${path}`
      );

      // Try to parse with defaults for missing fields
      return ConfigSchema.parse(converted);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger?.warn({ error: message, path }, 'Failed to load config, using defaults');
    }
  }

  return createDefaultConfig();
}

/**
 * Save configuration to file.
 *
 * @param config - Configuration to save.
 * @param configPath - Optional path to save to. Uses default if not provided.
 */
export async function saveConfig(
  config: Config,
  configPath?: string
): Promise<void> {
  const path = configPath ?? getConfigPath();

  // Ensure parent directory exists
  await mkdir(dirname(path), { recursive: true });

  // Convert camelCase keys to snake_case for JSON file
  const data = convertKeysToSnake(config);

  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Load configuration synchronously (for initialization).
 * Note: Prefer async loadConfig when possible.
 */
export function loadConfigSync(configPath?: string): Config {
  const path = configPath ?? getConfigPath();

  if (existsSync(path)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('node:fs') as typeof import('node:fs');
      const content = fs.readFileSync(path, 'utf-8');
      const data = JSON.parse(content) as unknown;
      const converted = convertKeysToCamel(data);
      return ConfigSchema.parse(converted);
    } catch {
      // Fall through to default
    }
  }

  return createDefaultConfig();
}
