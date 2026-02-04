/**
 * Tests for utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  todayDate,
  timestamp,
  truncateString,
  safeFilename,
  parseSessionKey,
  expandPath,
  createSessionKey,
  getDataPath,
  getWorkspacePath,
  getSessionsPath,
  getMemoryPath,
  getSkillsPath,
} from './helpers.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('todayDate', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = todayDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns current date', () => {
    const result = todayDate();
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });
});

describe('timestamp', () => {
  it('returns ISO format', () => {
    const result = timestamp();
    // ISO format: 2024-01-15T10:30:45.123Z
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('truncateString', () => {
  it('returns string unchanged if shorter than max', () => {
    expect(truncateString('hello', 10)).toBe('hello');
  });

  it('truncates and adds suffix', () => {
    expect(truncateString('hello world', 8)).toBe('hello...');
  });

  it('uses custom suffix', () => {
    expect(truncateString('hello world', 9, '---')).toBe('hello ---');
  });

  it('handles exact length', () => {
    expect(truncateString('hello', 5)).toBe('hello');
  });
});

describe('safeFilename', () => {
  it('replaces unsafe characters', () => {
    expect(safeFilename('file<>:"/\\|?*.txt')).toBe('file_________.txt');
  });

  it('trims whitespace', () => {
    expect(safeFilename('  file.txt  ')).toBe('file.txt');
  });

  it('keeps safe characters', () => {
    expect(safeFilename('my-file_name.txt')).toBe('my-file_name.txt');
  });
});

describe('parseSessionKey', () => {
  it('parses channel:chatId format', () => {
    const result = parseSessionKey('telegram:123456');
    expect(result).toEqual({ channel: 'telegram', chatId: '123456' });
  });

  it('handles chatId with colons', () => {
    const result = parseSessionKey('whatsapp:123:456:789');
    expect(result).toEqual({ channel: 'whatsapp', chatId: '123:456:789' });
  });

  it('throws on invalid format', () => {
    expect(() => parseSessionKey('invalid')).toThrow('Invalid session key');
  });
});

describe('createSessionKey', () => {
  it('creates channel:chatId format', () => {
    expect(createSessionKey('telegram', '123456')).toBe('telegram:123456');
  });
});

describe('expandPath', () => {
  it('expands ~ to home directory', () => {
    const result = expandPath('~/test');
    expect(result).toBe(join(homedir(), 'test'));
  });

  it('resolves relative paths', () => {
    const result = expandPath('./test');
    expect(result).toMatch(/\/test$/);
  });

  it('keeps absolute paths', () => {
    const result = expandPath('/absolute/path');
    expect(result).toBe('/absolute/path');
  });
});

describe('path helpers', () => {
  it('getDataPath returns ~/.ingenium', () => {
    expect(getDataPath()).toBe(join(homedir(), '.ingenium'));
  });

  it('getWorkspacePath returns default path', () => {
    expect(getWorkspacePath()).toBe(join(homedir(), '.ingenium', 'workspace'));
  });

  it('getWorkspacePath expands custom path', () => {
    expect(getWorkspacePath('~/custom')).toBe(join(homedir(), 'custom'));
  });

  it('getSessionsPath returns sessions directory', () => {
    expect(getSessionsPath()).toBe(join(homedir(), '.ingenium', 'sessions'));
  });

  it('getMemoryPath returns memory directory', () => {
    expect(getMemoryPath()).toBe(join(homedir(), '.ingenium', 'workspace', 'memory'));
  });

  it('getSkillsPath returns skills directory', () => {
    expect(getSkillsPath()).toBe(join(homedir(), '.ingenium', 'workspace', 'skills'));
  });
});
