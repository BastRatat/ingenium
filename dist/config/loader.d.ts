/**
 * Configuration loading utilities.
 */
import { Config } from './schema.js';
import type { Logger } from '../types/index.js';
/**
 * Get the default configuration file path.
 */
export declare function getConfigPath(): string;
/**
 * Get the ingenium data directory.
 */
export declare function getDataDir(): string;
/**
 * Convert camelCase to snake_case.
 */
export declare function camelToSnake(name: string): string;
/**
 * Convert snake_case to camelCase.
 */
export declare function snakeToCamel(name: string): string;
/**
 * Convert all keys in an object from camelCase to snake_case (recursive).
 */
export declare function convertKeysToSnake(data: unknown): unknown;
/**
 * Convert all keys in an object from snake_case to camelCase (recursive).
 */
export declare function convertKeysToCamel(data: unknown): unknown;
/**
 * Load configuration from file or create default.
 *
 * @param configPath - Optional path to config file. Uses default if not provided.
 * @param logger - Optional logger for warnings.
 * @returns Loaded configuration object.
 */
export declare function loadConfig(configPath?: string, logger?: Logger): Promise<Config>;
/**
 * Save configuration to file.
 *
 * @param config - Configuration to save.
 * @param configPath - Optional path to save to. Uses default if not provided.
 */
export declare function saveConfig(config: Config, configPath?: string): Promise<void>;
/**
 * Load configuration synchronously (for initialization).
 * Note: Prefer async loadConfig when possible.
 */
export declare function loadConfigSync(configPath?: string): Config;
//# sourceMappingURL=loader.d.ts.map