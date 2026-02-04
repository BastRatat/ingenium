/**
 * Utility functions for ingenium.
 */
import type { ParsedSessionKey } from '../types/index.js';
/**
 * Ensure a directory exists, creating it if necessary.
 * @param path - Directory path to ensure exists
 * @returns The resolved path
 */
export declare function ensureDir(path: string): Promise<string>;
/**
 * Get the ingenium data directory (~/.ingenium).
 * @returns Path to the data directory
 */
export declare function getDataPath(): string;
/**
 * Get the workspace path.
 * @param workspace - Optional workspace path. Defaults to ~/.ingenium/workspace.
 * @returns Expanded workspace path
 */
export declare function getWorkspacePath(workspace?: string): string;
/**
 * Get the sessions storage directory.
 * @returns Path to the sessions directory
 */
export declare function getSessionsPath(): string;
/**
 * Get the memory directory within the workspace.
 * @param workspace - Optional workspace path
 * @returns Path to the memory directory
 */
export declare function getMemoryPath(workspace?: string): string;
/**
 * Get the skills directory within the workspace.
 * @param workspace - Optional workspace path
 * @returns Path to the skills directory
 */
export declare function getSkillsPath(workspace?: string): string;
/**
 * Get today's date in YYYY-MM-DD format.
 * @returns Date string in YYYY-MM-DD format
 */
export declare function todayDate(): string;
/**
 * Get current timestamp in ISO format.
 * @returns ISO timestamp string
 */
export declare function timestamp(): string;
/**
 * Truncate a string to max length, adding suffix if truncated.
 * @param s - String to truncate
 * @param maxLen - Maximum length (default 100)
 * @param suffix - Suffix to add if truncated (default "...")
 * @returns Truncated string
 */
export declare function truncateString(s: string, maxLen?: number, suffix?: string): string;
/**
 * Convert a string to a safe filename.
 * @param name - String to convert
 * @returns Filesystem-safe string
 */
export declare function safeFilename(name: string): string;
/**
 * Parse a session key into channel and chatId.
 * @param key - Session key in format "channel:chatId"
 * @returns Object with channel and chatId
 * @throws Error if key format is invalid
 */
export declare function parseSessionKey(key: string): ParsedSessionKey;
/**
 * Expand a path that may start with ~.
 * @param path - Path to expand
 * @returns Expanded path
 */
export declare function expandPath(path: string): string;
/**
 * Create a session key from channel and chatId.
 * @param channel - Channel name
 * @param chatId - Chat identifier
 * @returns Session key in format "channel:chatId"
 */
export declare function createSessionKey(channel: string, chatId: string): string;
/**
 * Find a command in PATH (like Unix which).
 * @param command - Command name to find
 * @returns Full path to command or null if not found
 */
export declare function which(command: string): string | null;
//# sourceMappingURL=helpers.d.ts.map