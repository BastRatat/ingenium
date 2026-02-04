/**
 * Tests for MemoryStore.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryStore } from './memory.js';

describe('MemoryStore', () => {
  let testDir: string;
  let store: MemoryStore;

  beforeEach(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `memory-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    store = new MemoryStore(testDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should initialize with correct paths', () => {
    expect(store.getWorkspace()).toBe(testDir);
    expect(store.getMemoryDir()).toBe(join(testDir, 'memory'));
    expect(store.getMemoryFilePath()).toBe(join(testDir, 'memory', 'MEMORY.md'));
  });

  it('should get today file path', () => {
    const todayFile = store.getTodayFile();
    // Should match YYYY-MM-DD.md format
    expect(todayFile).toMatch(/\d{4}-\d{2}-\d{2}\.md$/);
    expect(todayFile).toContain(join(testDir, 'memory'));
  });

  describe('readToday', () => {
    it('should return empty string if no file exists', async () => {
      const content = await store.readToday();
      expect(content).toBe('');
    });

    it('should read existing file', async () => {
      // Create memory directory and today's file
      const memoryDir = join(testDir, 'memory');
      await mkdir(memoryDir, { recursive: true });

      const todayFile = store.getTodayFile();
      await writeFile(todayFile, 'Test content', 'utf-8');

      const content = await store.readToday();
      expect(content).toBe('Test content');
    });
  });

  describe('appendToday', () => {
    it('should create file with header if not exists', async () => {
      await store.appendToday('First note');

      const content = await readFile(store.getTodayFile(), 'utf-8');
      expect(content).toMatch(/^# \d{4}-\d{2}-\d{2}\n\n/);
      expect(content).toContain('First note');
    });

    it('should append to existing file', async () => {
      await store.appendToday('First note');
      await store.appendToday('Second note');

      const content = await readFile(store.getTodayFile(), 'utf-8');
      expect(content).toContain('First note');
      expect(content).toContain('Second note');
    });
  });

  describe('readLongTerm', () => {
    it('should return empty string if no file exists', async () => {
      const content = await store.readLongTerm();
      expect(content).toBe('');
    });

    it('should read existing MEMORY.md', async () => {
      const memoryDir = join(testDir, 'memory');
      await mkdir(memoryDir, { recursive: true });
      await writeFile(join(memoryDir, 'MEMORY.md'), 'Long-term content', 'utf-8');

      const content = await store.readLongTerm();
      expect(content).toBe('Long-term content');
    });
  });

  describe('writeLongTerm', () => {
    it('should write to MEMORY.md', async () => {
      await store.writeLongTerm('New long-term memory');

      const memoryFile = join(testDir, 'memory', 'MEMORY.md');
      expect(existsSync(memoryFile)).toBe(true);

      const content = await readFile(memoryFile, 'utf-8');
      expect(content).toBe('New long-term memory');
    });

    it('should overwrite existing content', async () => {
      await store.writeLongTerm('Original');
      await store.writeLongTerm('Updated');

      const content = await store.readLongTerm();
      expect(content).toBe('Updated');
    });
  });

  describe('getRecentMemories', () => {
    it('should return empty string if no memories', async () => {
      const memories = await store.getRecentMemories(7);
      expect(memories).toBe('');
    });

    it('should get memories from specified days', async () => {
      const memoryDir = join(testDir, 'memory');
      await mkdir(memoryDir, { recursive: true });

      // Create files for today and yesterday
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      await writeFile(join(memoryDir, `${formatDate(today)}.md`), 'Today content', 'utf-8');
      await writeFile(
        join(memoryDir, `${formatDate(yesterday)}.md`),
        'Yesterday content',
        'utf-8'
      );

      const memories = await store.getRecentMemories(2);
      expect(memories).toContain('Today content');
      expect(memories).toContain('Yesterday content');
      expect(memories).toContain('---'); // Separator
    });

    it('should respect days limit', async () => {
      const memoryDir = join(testDir, 'memory');
      await mkdir(memoryDir, { recursive: true });

      const today = new Date();
      const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Create file for today only
      await writeFile(join(memoryDir, `${formatDate(today)}.md`), 'Today content', 'utf-8');

      // Create file for 10 days ago (should not be included with days=7)
      const oldDate = new Date(today);
      oldDate.setDate(oldDate.getDate() - 10);
      await writeFile(join(memoryDir, `${formatDate(oldDate)}.md`), 'Old content', 'utf-8');

      const memories = await store.getRecentMemories(7);
      expect(memories).toContain('Today content');
      expect(memories).not.toContain('Old content');
    });
  });

  describe('listMemoryFiles', () => {
    it('should return empty array if no files', async () => {
      const files = await store.listMemoryFiles();
      expect(files).toEqual([]);
    });

    it('should list date-format files sorted newest first', async () => {
      const memoryDir = join(testDir, 'memory');
      await mkdir(memoryDir, { recursive: true });

      await writeFile(join(memoryDir, '2024-01-01.md'), 'content', 'utf-8');
      await writeFile(join(memoryDir, '2024-01-03.md'), 'content', 'utf-8');
      await writeFile(join(memoryDir, '2024-01-02.md'), 'content', 'utf-8');
      await writeFile(join(memoryDir, 'MEMORY.md'), 'content', 'utf-8'); // Should be excluded

      const files = await store.listMemoryFiles();

      expect(files).toHaveLength(3);
      expect(files[0]).toContain('2024-01-03.md');
      expect(files[1]).toContain('2024-01-02.md');
      expect(files[2]).toContain('2024-01-01.md');
    });

    it('should exclude non-date files', async () => {
      const memoryDir = join(testDir, 'memory');
      await mkdir(memoryDir, { recursive: true });

      await writeFile(join(memoryDir, '2024-01-01.md'), 'content', 'utf-8');
      await writeFile(join(memoryDir, 'MEMORY.md'), 'content', 'utf-8');
      await writeFile(join(memoryDir, 'notes.md'), 'content', 'utf-8');
      await writeFile(join(memoryDir, 'invalid-date.md'), 'content', 'utf-8');

      const files = await store.listMemoryFiles();

      expect(files).toHaveLength(1);
      expect(files[0]).toContain('2024-01-01.md');
    });
  });

  describe('getMemoryContext', () => {
    it('should return empty string if no memories', async () => {
      const context = await store.getMemoryContext();
      expect(context).toBe('');
    });

    it('should include long-term memory', async () => {
      await store.writeLongTerm('Important facts');

      const context = await store.getMemoryContext();
      expect(context).toContain('## Long-term Memory');
      expect(context).toContain('Important facts');
    });

    it("should include today's notes", async () => {
      await store.appendToday('Meeting notes');

      const context = await store.getMemoryContext();
      expect(context).toContain("## Today's Notes");
      expect(context).toContain('Meeting notes');
    });

    it('should combine both memories', async () => {
      await store.writeLongTerm('Long-term info');
      await store.appendToday('Daily notes');

      const context = await store.getMemoryContext();
      expect(context).toContain('## Long-term Memory');
      expect(context).toContain('Long-term info');
      expect(context).toContain("## Today's Notes");
      expect(context).toContain('Daily notes');
    });
  });
});

describe('createMemoryStore', () => {
  it('should create a MemoryStore instance', async () => {
    const { createMemoryStore } = await import('./memory.js');
    const testDir = join(tmpdir(), `memory-factory-test-${Date.now()}`);

    try {
      const store = createMemoryStore(testDir);
      expect(store).toBeInstanceOf(MemoryStore);
      expect(store.getWorkspace()).toBe(testDir);
    } finally {
      // Cleanup
      if (existsSync(testDir)) {
        await rm(testDir, { recursive: true, force: true });
      }
    }
  });
});
