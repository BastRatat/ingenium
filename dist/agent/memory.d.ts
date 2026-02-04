/**
 * Memory system for persistent agent memory.
 */
/**
 * Memory system for the agent.
 *
 * Supports daily notes (memory/YYYY-MM-DD.md) and long-term memory (MEMORY.md).
 */
export declare class MemoryStore {
    private workspace;
    private memoryDir;
    private memoryFile;
    private initialized;
    constructor(workspace: string);
    /**
     * Ensure the memory directory exists.
     */
    private ensureInitialized;
    /**
     * Get path to today's memory file.
     */
    getTodayFile(): string;
    /**
     * Read today's memory notes.
     */
    readToday(): Promise<string>;
    /**
     * Append content to today's memory notes.
     */
    appendToday(content: string): Promise<void>;
    /**
     * Read long-term memory (MEMORY.md).
     */
    readLongTerm(): Promise<string>;
    /**
     * Write to long-term memory (MEMORY.md).
     */
    writeLongTerm(content: string): Promise<void>;
    /**
     * Get memories from the last N days.
     *
     * @param days - Number of days to look back (default 7)
     * @returns Combined memory content
     */
    getRecentMemories(days?: number): Promise<string>;
    /**
     * List all memory files sorted by date (newest first).
     */
    listMemoryFiles(): Promise<string[]>;
    /**
     * Get memory context for the agent.
     *
     * @returns Formatted memory context including long-term and recent memories
     */
    getMemoryContext(): Promise<string>;
    /**
     * Get the workspace path.
     */
    getWorkspace(): string;
    /**
     * Get the memory directory path.
     */
    getMemoryDir(): string;
    /**
     * Get the long-term memory file path.
     */
    getMemoryFilePath(): string;
}
/**
 * Create a memory store.
 */
export declare function createMemoryStore(workspace: string): MemoryStore;
//# sourceMappingURL=memory.d.ts.map