/**
 * Tests for Session and SessionManager.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Session, SessionManager } from './manager.js';

describe('Session', () => {
  it('should create with defaults', () => {
    const session = new Session({ key: 'telegram:123' });

    expect(session.key).toBe('telegram:123');
    expect(session.messages).toEqual([]);
    expect(session.metadata).toEqual({});
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.updatedAt).toBeInstanceOf(Date);
  });

  it('should create with provided values', () => {
    const createdAt = new Date('2024-01-01');
    const session = new Session({
      key: 'whatsapp:456',
      messages: [{ role: 'user', content: 'hello', timestamp: '2024-01-01T00:00:00Z' }],
      createdAt,
      metadata: { test: true },
    });

    expect(session.key).toBe('whatsapp:456');
    expect(session.messages).toHaveLength(1);
    expect(session.metadata).toEqual({ test: true });
    expect(session.createdAt).toEqual(createdAt);
  });

  it('should add messages', () => {
    const session = new Session({ key: 'test:1' });
    const beforeUpdate = session.updatedAt;

    // Small delay to ensure timestamp difference
    session.addMessage('user', 'Hello');

    expect(session.messages).toHaveLength(1);
    expect(session.messages[0]?.role).toBe('user');
    expect(session.messages[0]?.content).toBe('Hello');
    expect(session.messages[0]?.timestamp).toBeDefined();
    expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  it('should add messages with extra data', () => {
    const session = new Session({ key: 'test:1' });

    session.addMessage('assistant', 'Hi there!', { model: 'gpt-4', tokens: 100 });

    expect(session.messages[0]?.model).toBe('gpt-4');
    expect(session.messages[0]?.tokens).toBe(100);
  });

  it('should get history with default limit', () => {
    const session = new Session({ key: 'test:1' });

    for (let i = 0; i < 10; i++) {
      session.addMessage('user', `Message ${i}`);
    }

    const history = session.getHistory();
    expect(history).toHaveLength(10);
    expect(history[0]).toEqual({ role: 'user', content: 'Message 0' });
  });

  it('should limit history', () => {
    const session = new Session({ key: 'test:1' });

    for (let i = 0; i < 100; i++) {
      session.addMessage('user', `Message ${i}`);
    }

    const history = session.getHistory(5);
    expect(history).toHaveLength(5);
    // Should be the last 5 messages
    expect(history[0]).toEqual({ role: 'user', content: 'Message 95' });
    expect(history[4]).toEqual({ role: 'user', content: 'Message 99' });
  });

  it('should clear messages', () => {
    const session = new Session({ key: 'test:1' });
    session.addMessage('user', 'Hello');
    session.addMessage('assistant', 'Hi');

    const beforeClear = session.updatedAt;
    session.clear();

    expect(session.messages).toEqual([]);
    expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeClear.getTime());
  });
});

describe('SessionManager', () => {
  let testDir: string;
  let sessionsDir: string;
  let manager: SessionManager;

  beforeEach(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `session-test-${Date.now()}`);
    sessionsDir = join(testDir, '.ingenium', 'sessions');
    await mkdir(sessionsDir, { recursive: true });

    // Create manager with test workspace
    manager = new SessionManager(testDir);
    // Override sessions dir via internal access
    (manager as unknown as { sessionsDir: string }).sessionsDir = sessionsDir;
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should create new session', async () => {
    const session = await manager.getOrCreate('telegram:123');

    expect(session.key).toBe('telegram:123');
    expect(session.messages).toEqual([]);
  });

  it('should return cached session', async () => {
    const session1 = await manager.getOrCreate('telegram:123');
    session1.addMessage('user', 'Hello');

    const session2 = await manager.getOrCreate('telegram:123');

    expect(session2).toBe(session1);
    expect(session2.messages).toHaveLength(1);
  });

  it('should save and load session', async () => {
    const session = await manager.getOrCreate('telegram:456');
    session.addMessage('user', 'Hello');
    session.addMessage('assistant', 'Hi there!');
    session.metadata = { test: true };

    await manager.save(session);

    // Clear cache and reload
    manager.clearCache();
    const loaded = await manager.getOrCreate('telegram:456');

    expect(loaded.key).toBe('telegram:456');
    expect(loaded.messages).toHaveLength(2);
    expect(loaded.messages[0]?.content).toBe('Hello');
    expect(loaded.messages[1]?.content).toBe('Hi there!');
    expect(loaded.metadata).toEqual({ test: true });
  });

  it('should delete session', async () => {
    const session = await manager.getOrCreate('telegram:789');
    await manager.save(session);

    const deleted = await manager.delete('telegram:789');
    expect(deleted).toBe(true);

    // Should not be in cache
    expect(manager.getCached('telegram:789')).toBeUndefined();

    // Should create new session on next get
    const newSession = await manager.getOrCreate('telegram:789');
    expect(newSession.messages).toEqual([]);
  });

  it('should return false when deleting non-existent session', async () => {
    const deleted = await manager.delete('nonexistent:key');
    expect(deleted).toBe(false);
  });

  it('should list sessions', async () => {
    // Create and save multiple sessions
    const session1 = await manager.getOrCreate('telegram:111');
    session1.addMessage('user', 'First');
    await manager.save(session1);

    const session2 = await manager.getOrCreate('whatsapp:222');
    session2.addMessage('user', 'Second');
    await manager.save(session2);

    const sessions = await manager.listSessions();

    expect(sessions).toHaveLength(2);
    // Should be sorted by updatedAt descending
    // Keys are converted from filename (telegram_111) to session key format (telegram:111)
    expect(sessions.map((s) => s.key)).toContain('telegram:111');
    expect(sessions.map((s) => s.key)).toContain('whatsapp:222');
  });

  it('should handle JSONL format correctly', async () => {
    const session = await manager.getOrCreate('test:jsonl');
    session.addMessage('user', 'Line 1');
    session.addMessage('assistant', 'Line 2');
    await manager.save(session);

    // Read raw file and verify format
    const path = join(sessionsDir, 'test_jsonl.jsonl');
    const content = await readFile(path, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines).toHaveLength(3); // metadata + 2 messages

    // First line should be metadata
    const metadata = JSON.parse(lines[0] ?? '{}');
    expect(metadata._type).toBe('metadata');

    // Other lines should be messages
    const msg1 = JSON.parse(lines[1] ?? '{}');
    expect(msg1.role).toBe('user');
    expect(msg1.content).toBe('Line 1');
  });

  it('should handle corrupted session files gracefully', async () => {
    const path = join(sessionsDir, 'corrupted_session.jsonl');
    await writeFile(path, 'not valid json\n', 'utf-8');

    // Override sessions dir
    (manager as unknown as { sessionsDir: string }).sessionsDir = sessionsDir;
    manager.clearCache();

    // Should return new session instead of failing
    // Need to create a key that matches the filename
    const session = await manager.getOrCreate('corrupted:session');
    expect(session.messages).toEqual([]);
  });

  it('should preserve message extra fields through save/load', async () => {
    const session = await manager.getOrCreate('test:extra');
    session.addMessage('assistant', 'Response', {
      model: 'claude-3',
      tokens: 150,
      custom: { nested: true },
    });

    await manager.save(session);
    manager.clearCache();

    const loaded = await manager.getOrCreate('test:extra');
    const msg = loaded.messages[0];

    expect(msg?.model).toBe('claude-3');
    expect(msg?.tokens).toBe(150);
    expect(msg?.custom).toEqual({ nested: true });
  });

  it('should get cached session', () => {
    // Initially not in cache
    expect(manager.getCached('test:cache')).toBeUndefined();
  });

  it('should clear cache', async () => {
    await manager.getOrCreate('test:cache');
    expect(manager.getCached('test:cache')).toBeDefined();

    manager.clearCache();
    expect(manager.getCached('test:cache')).toBeUndefined();
  });
});
