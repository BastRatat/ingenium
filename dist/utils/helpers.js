/**
 * Utility functions for ingenium.
 */
import { mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, delimiter } from 'node:path';
/**
 * Ensure a directory exists, creating it if necessary.
 * @param path - Directory path to ensure exists
 * @returns The resolved path
 */
export async function ensureDir(path) {
    await mkdir(path, { recursive: true });
    return path;
}
/**
 * Get the ingenium data directory (~/.ingenium).
 * @returns Path to the data directory
 */
export function getDataPath() {
    return join(homedir(), '.ingenium');
}
/**
 * Get the workspace path.
 * @param workspace - Optional workspace path. Defaults to ~/.ingenium/workspace.
 * @returns Expanded workspace path
 */
export function getWorkspacePath(workspace) {
    if (workspace) {
        return expandPath(workspace);
    }
    return join(homedir(), '.ingenium', 'workspace');
}
/**
 * Get the sessions storage directory.
 * @returns Path to the sessions directory
 */
export function getSessionsPath() {
    return join(getDataPath(), 'sessions');
}
/**
 * Get the memory directory within the workspace.
 * @param workspace - Optional workspace path
 * @returns Path to the memory directory
 */
export function getMemoryPath(workspace) {
    const ws = workspace ?? getWorkspacePath();
    return join(ws, 'memory');
}
/**
 * Get the skills directory within the workspace.
 * @param workspace - Optional workspace path
 * @returns Path to the skills directory
 */
export function getSkillsPath(workspace) {
    const ws = workspace ?? getWorkspacePath();
    return join(ws, 'skills');
}
/**
 * Get today's date in YYYY-MM-DD format.
 * @returns Date string in YYYY-MM-DD format
 */
export function todayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
/**
 * Get current timestamp in ISO format.
 * @returns ISO timestamp string
 */
export function timestamp() {
    return new Date().toISOString();
}
/**
 * Truncate a string to max length, adding suffix if truncated.
 * @param s - String to truncate
 * @param maxLen - Maximum length (default 100)
 * @param suffix - Suffix to add if truncated (default "...")
 * @returns Truncated string
 */
export function truncateString(s, maxLen = 100, suffix = '...') {
    if (s.length <= maxLen) {
        return s;
    }
    return s.slice(0, maxLen - suffix.length) + suffix;
}
/**
 * Convert a string to a safe filename.
 * @param name - String to convert
 * @returns Filesystem-safe string
 */
export function safeFilename(name) {
    const unsafe = '<>:"/\\|?*';
    let result = name;
    for (const char of unsafe) {
        result = result.replaceAll(char, '_');
    }
    return result.trim();
}
/**
 * Parse a session key into channel and chatId.
 * @param key - Session key in format "channel:chatId"
 * @returns Object with channel and chatId
 * @throws Error if key format is invalid
 */
export function parseSessionKey(key) {
    const colonIndex = key.indexOf(':');
    if (colonIndex === -1) {
        throw new Error(`Invalid session key: ${key}`);
    }
    return {
        channel: key.slice(0, colonIndex),
        chatId: key.slice(colonIndex + 1),
    };
}
/**
 * Expand a path that may start with ~.
 * @param path - Path to expand
 * @returns Expanded path
 */
export function expandPath(path) {
    if (path.startsWith('~')) {
        return join(homedir(), path.slice(1));
    }
    return resolve(path);
}
/**
 * Create a session key from channel and chatId.
 * @param channel - Channel name
 * @param chatId - Chat identifier
 * @returns Session key in format "channel:chatId"
 */
export function createSessionKey(channel, chatId) {
    return `${channel}:${chatId}`;
}
/**
 * Find a command in PATH (like Unix which).
 * @param command - Command name to find
 * @returns Full path to command or null if not found
 */
export function which(command) {
    const pathEnv = process.env['PATH'] ?? '';
    const paths = pathEnv.split(delimiter);
    for (const dir of paths) {
        const fullPath = join(dir, command);
        try {
            if (existsSync(fullPath)) {
                const stat = statSync(fullPath);
                // Check if it's a file and executable (on Unix, check mode)
                if (stat.isFile()) {
                    return fullPath;
                }
            }
            // On Windows, also check with .exe, .cmd, .bat extensions
            if (process.platform === 'win32') {
                for (const ext of ['.exe', '.cmd', '.bat', '.ps1']) {
                    const fullPathWithExt = fullPath + ext;
                    if (existsSync(fullPathWithExt)) {
                        const stat = statSync(fullPathWithExt);
                        if (stat.isFile()) {
                            return fullPathWithExt;
                        }
                    }
                }
            }
        }
        catch {
            // Ignore errors (permission denied, etc.)
            continue;
        }
    }
    return null;
}
//# sourceMappingURL=helpers.js.map