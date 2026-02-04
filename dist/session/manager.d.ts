/**
 * Session management module.
 */
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
export declare class Session {
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
    });
    /**
     * Add a message to the session.
     */
    addMessage(role: string, content: string, extra?: Record<string, unknown>): void;
    /**
     * Get message history for LLM context.
     *
     * @param maxMessages - Maximum messages to return (default 50)
     * @returns List of messages in LLM format (just role and content)
     */
    getHistory(maxMessages?: number): Array<{
        role: string;
        content: string;
    }>;
    /**
     * Clear all messages in the session.
     */
    clear(): void;
}
/**
 * Manages conversation sessions.
 *
 * Sessions are stored as JSONL files in the sessions directory.
 */
export declare class SessionManager {
    readonly workspace: string;
    private sessionsDir;
    private cache;
    private initialized;
    constructor(workspace: string);
    /**
     * Ensure the sessions directory exists.
     */
    private ensureInitialized;
    /**
     * Get the file path for a session.
     */
    private getSessionPath;
    /**
     * Get an existing session or create a new one.
     *
     * @param key - Session key (usually channel:chatId)
     * @returns The session
     */
    getOrCreate(key: string): Promise<Session>;
    /**
     * Load a session from disk.
     */
    private load;
    /**
     * Save a session to disk.
     */
    save(session: Session): Promise<void>;
    /**
     * Delete a session.
     *
     * @param key - Session key
     * @returns True if deleted, false if not found
     */
    delete(key: string): Promise<boolean>;
    /**
     * List all sessions.
     *
     * @returns List of session info objects
     */
    listSessions(): Promise<SessionInfo[]>;
    /**
     * Get a session from cache without loading from disk.
     */
    getCached(key: string): Session | undefined;
    /**
     * Clear the session cache.
     */
    clearCache(): void;
}
/**
 * Create a session manager.
 */
export declare function createSessionManager(workspace: string): SessionManager;
//# sourceMappingURL=manager.d.ts.map