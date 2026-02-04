/**
 * Tests for CronService.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CronService } from './service.js';
import type { CronSchedule } from './types.js';

describe('CronService', () => {
  let testDir: string;
  let storePath: string;
  let service: CronService;

  beforeEach(async () => {
    testDir = join(tmpdir(), `cron-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    storePath = join(testDir, 'jobs.json');
    service = new CronService({ storePath });
  });

  afterEach(async () => {
    service.stop();
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create with store path', () => {
      expect(service.storePath).toBe(storePath);
    });
  });

  describe('start/stop', () => {
    it('should start and stop the service', async () => {
      await service.start();
      expect(service.status().enabled).toBe(true);

      service.stop();
      expect(service.status().enabled).toBe(false);
    });
  });

  describe('listJobs', () => {
    it('should return empty array when no jobs', async () => {
      const jobs = await service.listJobs();
      expect(jobs).toEqual([]);
    });

    it('should return jobs sorted by next run time', async () => {
      const schedule1: CronSchedule = { kind: 'every', everyMs: 10000 };
      const schedule2: CronSchedule = { kind: 'every', everyMs: 5000 };

      await service.addJob({ name: 'Job 1', schedule: schedule1, message: 'Test 1' });
      await service.addJob({ name: 'Job 2', schedule: schedule2, message: 'Test 2' });

      const jobs = await service.listJobs();
      expect(jobs).toHaveLength(2);
      // Job 2 has shorter interval, so should be first
      expect(jobs[0]?.name).toBe('Job 2');
    });

    it('should exclude disabled jobs by default', async () => {
      const schedule: CronSchedule = { kind: 'every', everyMs: 5000 };
      const job = await service.addJob({ name: 'Test Job', schedule, message: 'Test' });

      await service.enableJob(job.id, false);

      const jobs = await service.listJobs();
      expect(jobs).toHaveLength(0);

      const allJobs = await service.listJobs(true);
      expect(allJobs).toHaveLength(1);
    });
  });

  describe('addJob', () => {
    it('should add a job with every schedule', async () => {
      const schedule: CronSchedule = { kind: 'every', everyMs: 60000 };
      const job = await service.addJob({
        name: 'Test Job',
        schedule,
        message: 'Hello',
      });

      expect(job.id).toBeDefined();
      expect(job.name).toBe('Test Job');
      expect(job.enabled).toBe(true);
      expect(job.schedule.kind).toBe('every');
      expect(job.payload.message).toBe('Hello');
    });

    it('should add a job with cron schedule', async () => {
      const schedule: CronSchedule = { kind: 'cron', expr: '0 9 * * *' };
      const job = await service.addJob({
        name: 'Morning Job',
        schedule,
        message: 'Good morning',
      });

      expect(job.schedule.kind).toBe('cron');
      expect(job.schedule.expr).toBe('0 9 * * *');
    });

    it('should add a job with delivery settings', async () => {
      const schedule: CronSchedule = { kind: 'every', everyMs: 60000 };
      const job = await service.addJob({
        name: 'Delivery Job',
        schedule,
        message: 'Test',
        deliver: true,
        channel: 'telegram',
        to: '123456',
      });

      expect(job.payload.deliver).toBe(true);
      expect(job.payload.channel).toBe('telegram');
      expect(job.payload.to).toBe('123456');
    });

    it('should persist job to disk', async () => {
      const schedule: CronSchedule = { kind: 'every', everyMs: 60000 };
      await service.addJob({
        name: 'Persist Job',
        schedule,
        message: 'Test',
      });

      // Read the file directly
      const content = await readFile(storePath, 'utf-8');
      const data = JSON.parse(content) as { jobs: Array<{ name: string }> };
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0]?.name).toBe('Persist Job');
    });
  });

  describe('removeJob', () => {
    it('should remove a job by ID', async () => {
      const schedule: CronSchedule = { kind: 'every', everyMs: 60000 };
      const job = await service.addJob({
        name: 'To Remove',
        schedule,
        message: 'Test',
      });

      const removed = await service.removeJob(job.id);
      expect(removed).toBe(true);

      const jobs = await service.listJobs();
      expect(jobs).toHaveLength(0);
    });

    it('should return false for non-existent job', async () => {
      const removed = await service.removeJob('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('enableJob', () => {
    it('should enable a disabled job', async () => {
      const schedule: CronSchedule = { kind: 'every', everyMs: 60000 };
      const job = await service.addJob({
        name: 'Test Job',
        schedule,
        message: 'Test',
      });

      await service.enableJob(job.id, false);
      let updated = await service.enableJob(job.id, true);

      expect(updated).not.toBeNull();
      expect(updated?.enabled).toBe(true);
    });

    it('should disable an enabled job', async () => {
      const schedule: CronSchedule = { kind: 'every', everyMs: 60000 };
      const job = await service.addJob({
        name: 'Test Job',
        schedule,
        message: 'Test',
      });

      const updated = await service.enableJob(job.id, false);
      expect(updated?.enabled).toBe(false);
      expect(updated?.state.nextRunAtMs).toBeUndefined();
    });

    it('should return null for non-existent job', async () => {
      const result = await service.enableJob('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('runJob', () => {
    it('should run a job manually', async () => {
      const callback = vi.fn().mockResolvedValue('done');
      const svc = new CronService({
        storePath,
        onJob: callback,
      });

      const schedule: CronSchedule = { kind: 'every', everyMs: 60000 };
      const job = await svc.addJob({
        name: 'Test Job',
        schedule,
        message: 'Test',
      });

      const result = await svc.runJob(job.id);
      expect(result).toBe(true);
      expect(callback).toHaveBeenCalled();
    });

    it('should not run disabled job without force', async () => {
      const callback = vi.fn().mockResolvedValue('done');
      const svc = new CronService({
        storePath,
        onJob: callback,
      });

      const schedule: CronSchedule = { kind: 'every', everyMs: 60000 };
      const job = await svc.addJob({
        name: 'Test Job',
        schedule,
        message: 'Test',
      });

      await svc.enableJob(job.id, false);

      const result = await svc.runJob(job.id);
      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should run disabled job with force', async () => {
      const callback = vi.fn().mockResolvedValue('done');
      const svc = new CronService({
        storePath,
        onJob: callback,
      });

      const schedule: CronSchedule = { kind: 'every', everyMs: 60000 };
      const job = await svc.addJob({
        name: 'Test Job',
        schedule,
        message: 'Test',
      });

      await svc.enableJob(job.id, false);

      const result = await svc.runJob(job.id, true);
      expect(result).toBe(true);
      expect(callback).toHaveBeenCalled();
    });

    it('should return false for non-existent job', async () => {
      const result = await service.runJob('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('status', () => {
    it('should return service status', async () => {
      const status = service.status();
      expect(status.enabled).toBe(false);
      expect(status.jobs).toBe(0);
    });

    it('should reflect running state', async () => {
      await service.start();
      expect(service.status().enabled).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should load jobs from existing store', async () => {
      // Write a store file
      const storeData = {
        version: 1,
        jobs: [
          {
            id: 'test-id',
            name: 'Existing Job',
            enabled: true,
            schedule: { kind: 'every', everyMs: 60000 },
            payload: { kind: 'agent_turn', message: 'Test', deliver: false },
            state: {},
            createdAtMs: Date.now(),
            updatedAtMs: Date.now(),
            deleteAfterRun: false,
          },
        ],
      };
      await writeFile(storePath, JSON.stringify(storeData), 'utf-8');

      // Create new service and load
      const svc2 = new CronService({ storePath });
      const jobs = await svc2.listJobs();

      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.id).toBe('test-id');
      expect(jobs[0]?.name).toBe('Existing Job');
    });
  });
});

describe('createCronService', () => {
  it('should create a CronService instance', async () => {
    const { createCronService } = await import('./service.js');
    const testDir = join(tmpdir(), `cron-factory-test-${Date.now()}`);

    try {
      await mkdir(testDir, { recursive: true });
      const service = createCronService({
        storePath: join(testDir, 'jobs.json'),
      });
      expect(service).toBeInstanceOf(CronService);
    } finally {
      if (existsSync(testDir)) {
        await rm(testDir, { recursive: true, force: true });
      }
    }
  });
});
