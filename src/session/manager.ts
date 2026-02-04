/**
 * Session management module.
 */

import { readFile, writeFile, unlink, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, getSessionsPath, safeFilename } from '../utils/helpers.js';

/**
 * A message in the session.
 */
export interface SessionMessage {
  role: string;
  content: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Session metadata stored in JSONL file.
 */
export interface SessionMetadata {
  _type: 'metadata';
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

/**
 * Session info returned by listSessions.
 */
export interface SessionInfo {
  key: string;
  createdAt: string | null;
  updatedAt: string | null;
  path: string;
}

/**
 * A conversation session.
 *
 * Stores messages in JSONL format for easy reading and persistence.
 */
export class Session {
  readonly key: string;
  messages: SessionMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;

  constructor(options: {
    key: string;
    messages?: SessionMessage[];
    createdAt?: Date;
    updatedAt?: Date;
    metadata?: Record<string, unknown>;
  }) {
    this.key = options.key;
    this.messages = options.messages ?? [];
    this.createdAt = options.createdAt ?? new Date();
    this.updatedAt = options.updatedAt ?? new Date();
    this.metadata = options.metadata ?? Object.create(null) as Record<string, unknown>;
  }

  /**
   * Add a message to the session.
   */
  addMessage(role: string, content: string, extra?: Record<string, unknown>): void {
    const msg: SessionMessage = {
      role,
      content,
      timestamp: new Date().toISOString(),
      ...extra,
    };
    this.messages.push(msg);
    this.updatedAt = new Date();
  }

  /**
   * Get message history for LLM context.
   *
   * @param maxMessages - Maximum messages to return (default 50)
   * @returns List of messages in LLM format (just role and content)
   */
  getHistory(maxMessages: number = 50): Array<{ role: string; content: string }> {
    const recent =
      this.messages.length > maxMessages
        ? this.messages.slice(-maxMessages)
        : this.messages;

    return recent.map((m) => ({ role: m.role, content: m.content }));
  }

  /**
   * Clear all messages in the session.
   */
  clear(): void {
    this.messages = [];
    this.updatedAt = new Date();
  }
}

/**
 * Manages conversation sessions.
 *
 * Sessions are stored as JSONL files in the sessions directory.
 */
export class SessionManager {
  readonly workspace: string;
  private sessionsDir: string;
  private cache: Map<string, Session> = new Map();
  private initialized: boolean = false;

  constructor(workspace: string) {
    this.workspace = workspace;
    this.sessionsDir = getSessionsPath();
  }

  /**
   * Ensure the sessions directory exists.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await ensureDir(this.sessionsDir);
      this.initialized = true;
    }
  }

  /**
   * Get the file path for a session.
   */
  private getSessionPath(key: string): string {
    const safeKey = safeFilename(key.replace(/:/g, '_'));
    return join(this.sessionsDir, `${safeKey}.jsonl`);
  }

  /**
   * Get an existing session or create a new one.
   *
   * @param key - Session key (usually channel:chatId)
   * @returns The session
   */
  async getOrCreate(key: string): Promise<Session> {
    await this.ensureInitialized();

    // Check cache
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Try to load from disk
    const session = await this.load(key);
    if (session) {
      this.cache.set(key, session);
      return session;
    }

    // Create new session
    const newSession = new Session({ key });
    this.cache.set(key, newSession);
    return newSession;
  }

  /**
   * Load a session from disk.
   */
  private async load(key: string): Promise<Session | null> {
    const path = this.getSessionPath(key);

    if (!existsSync(path)) {
      return null;
    }

    try {
      const content = await readFile(path, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      const messages: SessionMessage[] = [];
      let metadata: Record<string, unknown> | undefined;
      let createdAt: Date | null = null;

      for (const line of lines) {
        const data = JSON.parse(line) as Record<string, unknown>;

        if (data['_type'] === 'metadata') {
          const metadataRecord = data as unknown as SessionMetadata;
          metadata = metadataRecord.metadata;
          if (metadataRecord.created_at) {
            createdAt = new Date(metadataRecord.created_at);
          }
        } else {
          messages.push(data as unknown as SessionMessage);
        }
      }

      const sessionOptions: {
        key: string;
        messages: SessionMessage[];
        createdAt: Date;
        metadata?: Record<string, unknown>;
      } = {
        key,
        messages,
        createdAt: createdAt ?? new Date(),
      };
      if (metadata) {
        sessionOptions.metadata = metadata;
      }
      return new Session(sessionOptions);
    } catch (error) {
      console.warn(`Failed to load session ${key}:`, error);
      return null;
    }
  }

  /**
   * Save a session to disk.
   */
  async save(session: Session): Promise<void> {
    await this.ensureInitialized();
    const path = this.getSessionPath(session.key);

    const lines: string[] = [];

    // Write metadata first
    const metadataLine: SessionMetadata = {
      _type: 'metadata',
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString(),
      metadata: session.metadata,
    };
    lines.push(JSON.stringify(metadataLine));

    // Write messages
    for (const msg of session.messages) {
      lines.push(JSON.stringify(msg));
    }

    await writeFile(path, lines.join('\n') + '\n', 'utf-8');
    this.cache.set(session.key, session);
  }

  /**
   * Delete a session.
   *
   * @param key - Session key
   * @returns True if deleted, false if not found
   */
  async delete(key: string): Promise<boolean> {
    await this.ensureInitialized();

    // Remove from cache
    this.cache.delete(key);

    // Remove file
    const path = this.getSessionPath(key);
    if (existsSync(path)) {
      await unlink(path);
      return true;
    }
    return false;
  }

  /**
   * List all sessions.
   *
   * @returns List of session info objects
   */
  async listSessions(): Promise<SessionInfo[]> {
    await this.ensureInitialized();

    const sessions: SessionInfo[] = [];

    try {
      const files = await readdir(this.sessionsDir);

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;

        const path = join(this.sessionsDir, file);
        try {
          const content = await readFile(path, 'utf-8');
          const firstLine = content.split('\n')[0];
          if (firstLine) {
            const data = JSON.parse(firstLine) as SessionMetadata;
            if (data._type === 'metadata') {
              sessions.push({
                key: file.replace('.jsonl', '').replace(/_/g, ':'),
                createdAt: data.created_at ?? null,
                updatedAt: data.updated_at ?? null,
                path,
              });
            }
          }
        } catch {
          // Skip invalid files
          continue;
        }
      }
    } catch {
      // Directory might not exist yet
      return [];
    }

    // Sort by updated_at descending
    return sessions.sort((a, b) => {
      const aTime = a.updatedAt ?? '';
      const bTime = b.updatedAt ?? '';
      return bTime.localeCompare(aTime);
    });
  }

  /**
   * Get a session from cache without loading from disk.
   */
  getCached(key: string): Session | undefined {
    return this.cache.get(key);
  }

  /**
   * Clear the session cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Create a session manager.
 */
export function createSessionManager(workspace: string): SessionManager {
  return new SessionManager(workspace);
}
