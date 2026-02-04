/**
 * Tests for HeartbeatService.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  HeartbeatService,
  HEARTBEAT_PROMPT,
  HEARTBEAT_OK_TOKEN,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
} from './service.js';

describe('HeartbeatService', () => {
  let testDir: string;
  let service: HeartbeatService;

  beforeEach(async () => {
    testDir = join(tmpdir(), `heartbeat-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    service = new HeartbeatService({ workspace: testDir });
  });

  afterEach(async () => {
    service.stop();
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create with workspace path', () => {
      expect(service.workspace).toBe(testDir);
    });

    it('should use default interval', () => {
      expect(service.intervalMs).toBe(DEFAULT_HEARTBEAT_INTERVAL_MS);
    });

    it('should use custom interval', () => {
      const svc = new HeartbeatService({
        workspace: testDir,
        intervalMs: 5000,
      });
      expect(svc.intervalMs).toBe(5000);
    });

    it('should be enabled by default', () => {
      expect(service.enabled).toBe(true);
    });

    it('should respect enabled option', () => {
      const svc = new HeartbeatService({
        workspace: testDir,
        enabled: false,
      });
      expect(svc.enabled).toBe(false);
    });
  });

  describe('heartbeatFile', () => {
    it('should return correct path', () => {
      expect(service.heartbeatFile).toBe(join(testDir, 'HEARTBEAT.md'));
    });
  });

  describe('start/stop', () => {
    it('should start the service', async () => {
      await service.start();
      expect(service.isRunning()).toBe(true);
    });

    it('should stop the service', async () => {
      await service.start();
      service.stop();
      expect(service.isRunning()).toBe(false);
    });

    it('should not start if disabled', async () => {
      const svc = new HeartbeatService({
        workspace: testDir,
        enabled: false,
      });

      await svc.start();
      expect(svc.isRunning()).toBe(false);
    });
  });

  describe('triggerNow', () => {
    it('should call callback with prompt', async () => {
      const callback = vi.fn().mockResolvedValue('Task completed');
      const svc = new HeartbeatService({
        workspace: testDir,
        onHeartbeat: callback,
      });

      const result = await svc.triggerNow();

      expect(callback).toHaveBeenCalledWith(HEARTBEAT_PROMPT);
      expect(result).toBe('Task completed');
    });

    it('should return null without callback', async () => {
      const result = await service.triggerNow();
      expect(result).toBeNull();
    });
  });

  describe('HEARTBEAT.md detection', () => {
    it('should not trigger for empty HEARTBEAT.md', async () => {
      const callback = vi.fn().mockResolvedValue('OK');
      const svc = new HeartbeatService({
        workspace: testDir,
        onHeartbeat: callback,
        intervalMs: 50,
      });

      // Create empty HEARTBEAT.md
      await writeFile(join(testDir, 'HEARTBEAT.md'), '', 'utf-8');

      await svc.start();

      // Wait for at least one tick
      await new Promise((resolve) => setTimeout(resolve, 100));

      svc.stop();

      // Callback should not be called for empty file
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not trigger for HEARTBEAT.md with only headers', async () => {
      const callback = vi.fn().mockResolvedValue('OK');
      const svc = new HeartbeatService({
        workspace: testDir,
        onHeartbeat: callback,
        intervalMs: 50,
      });

      // Create HEARTBEAT.md with only headers
      await writeFile(
        join(testDir, 'HEARTBEAT.md'),
        '# Tasks\n\n## Section\n\n',
        'utf-8'
      );

      await svc.start();

      // Wait for at least one tick
      await new Promise((resolve) => setTimeout(resolve, 100));

      svc.stop();

      // Callback should not be called for headers-only file
      expect(callback).not.toHaveBeenCalled();
    });

    it('should trigger for HEARTBEAT.md with content', async () => {
      const callback = vi.fn().mockResolvedValue('Task done');
      const svc = new HeartbeatService({
        workspace: testDir,
        onHeartbeat: callback,
        intervalMs: 50,
      });

      // Create HEARTBEAT.md with actionable content
      await writeFile(
        join(testDir, 'HEARTBEAT.md'),
        '# Tasks\n\n- Send daily report\n',
        'utf-8'
      );

      await svc.start();

      // Wait for at least one tick
      await new Promise((resolve) => setTimeout(resolve, 100));

      svc.stop();

      // Callback should be called for file with content
      expect(callback).toHaveBeenCalled();
    });
  });
});

describe('constants', () => {
  it('should export HEARTBEAT_PROMPT', () => {
    expect(HEARTBEAT_PROMPT).toContain('HEARTBEAT.md');
    expect(HEARTBEAT_PROMPT).toContain('HEARTBEAT_OK');
  });

  it('should export HEARTBEAT_OK_TOKEN', () => {
    expect(HEARTBEAT_OK_TOKEN).toBe('HEARTBEAT_OK');
  });

  it('should export DEFAULT_HEARTBEAT_INTERVAL_MS', () => {
    expect(DEFAULT_HEARTBEAT_INTERVAL_MS).toBe(30 * 60 * 1000);
  });
});

describe('createHeartbeatService', () => {
  it('should create a HeartbeatService instance', async () => {
    const { createHeartbeatService } = await import('./service.js');
    const testDir = join(tmpdir(), `heartbeat-factory-test-${Date.now()}`);

    try {
      await mkdir(testDir, { recursive: true });
      const service = createHeartbeatService({ workspace: testDir });
      expect(service).toBeInstanceOf(HeartbeatService);
    } finally {
      if (existsSync(testDir)) {
        await rm(testDir, { recursive: true, force: true });
      }
    }
  });
});
