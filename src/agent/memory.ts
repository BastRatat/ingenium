/**
 * Memory system for persistent agent memory.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, todayDate } from '../utils/helpers.js';

/**
 * Memory system for the agent.
 *
 * Supports daily notes (memory/YYYY-MM-DD.md) and long-term memory (MEMORY.md).
 */
export class MemoryStore {
  private workspace: string;
  private memoryDir: string;
  private memoryFile: string;
  private initialized: boolean = false;

  constructor(workspace: string) {
    this.workspace = workspace;
    this.memoryDir = join(workspace, 'memory');
    this.memoryFile = join(this.memoryDir, 'MEMORY.md');
  }

  /**
   * Ensure the memory directory exists.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await ensureDir(this.memoryDir);
      this.initialized = true;
    }
  }

  /**
   * Get path to today's memory file.
   */
  getTodayFile(): string {
    return join(this.memoryDir, `${todayDate()}.md`);
  }

  /**
   * Read today's memory notes.
   */
  async readToday(): Promise<string> {
    await this.ensureInitialized();
    const todayFile = this.getTodayFile();

    if (existsSync(todayFile)) {
      return readFile(todayFile, 'utf-8');
    }
    return '';
  }

  /**
   * Append content to today's memory notes.
   */
  async appendToday(content: string): Promise<void> {
    await this.ensureInitialized();
    const todayFile = this.getTodayFile();

    let newContent: string;
    if (existsSync(todayFile)) {
      const existing = await readFile(todayFile, 'utf-8');
      newContent = existing + '\n' + content;
    } else {
      // Add header for new day
      const header = `# ${todayDate()}\n\n`;
      newContent = header + content;
    }

    await writeFile(todayFile, newContent, 'utf-8');
  }

  /**
   * Read long-term memory (MEMORY.md).
   */
  async readLongTerm(): Promise<string> {
    await this.ensureInitialized();

    if (existsSync(this.memoryFile)) {
      return readFile(this.memoryFile, 'utf-8');
    }
    return '';
  }

  /**
   * Write to long-term memory (MEMORY.md).
   */
  async writeLongTerm(content: string): Promise<void> {
    await this.ensureInitialized();
    await writeFile(this.memoryFile, content, 'utf-8');
  }

  /**
   * Get memories from the last N days.
   *
   * @param days - Number of days to look back (default 7)
   * @returns Combined memory content
   */
  async getRecentMemories(days: number = 7): Promise<string> {
    await this.ensureInitialized();

    const memories: string[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const filePath = join(this.memoryDir, `${dateStr}.md`);

      if (existsSync(filePath)) {
        const content = await readFile(filePath, 'utf-8');
        memories.push(content);
      }
    }

    return memories.join('\n\n---\n\n');
  }

  /**
   * List all memory files sorted by date (newest first).
   */
  async listMemoryFiles(): Promise<string[]> {
    await this.ensureInitialized();

    if (!existsSync(this.memoryDir)) {
      return [];
    }

    try {
      const files = await readdir(this.memoryDir);
      // Filter for date-format files (YYYY-MM-DD.md)
      const dateFiles = files.filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
      // Sort descending (newest first)
      return dateFiles
        .map((f) => join(this.memoryDir, f))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  /**
   * Get memory context for the agent.
   *
   * @returns Formatted memory context including long-term and recent memories
   */
  async getMemoryContext(): Promise<string> {
    await this.ensureInitialized();

    const parts: string[] = [];

    // Long-term memory
    const longTerm = await this.readLongTerm();
    if (longTerm) {
      parts.push('## Long-term Memory\n' + longTerm);
    }

    // Today's notes
    const today = await this.readToday();
    if (today) {
      parts.push("## Today's Notes\n" + today);
    }

    return parts.length > 0 ? parts.join('\n\n') : '';
  }

  /**
   * Get the workspace path.
   */
  getWorkspace(): string {
    return this.workspace;
  }

  /**
   * Get the memory directory path.
   */
  getMemoryDir(): string {
    return this.memoryDir;
  }

  /**
   * Get the long-term memory file path.
   */
  getMemoryFilePath(): string {
    return this.memoryFile;
  }
}

/**
 * Create a memory store.
 */
export function createMemoryStore(workspace: string): MemoryStore {
  return new MemoryStore(workspace);
}
