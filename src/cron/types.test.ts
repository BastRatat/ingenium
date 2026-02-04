/**
 * Tests for cron types.
 */

import { describe, it, expect } from 'vitest';
import {
  createCronSchedule,
  createCronPayload,
  createCronJobState,
  createCronJob,
  createCronStore,
} from './types.js';

describe('cron types', () => {
  describe('createCronSchedule', () => {
    it('should create an every schedule', () => {
      const schedule = createCronSchedule('every');
      expect(schedule.kind).toBe('every');
    });

    it('should create a cron schedule', () => {
      const schedule = createCronSchedule('cron');
      expect(schedule.kind).toBe('cron');
    });

    it('should create an at schedule', () => {
      const schedule = createCronSchedule('at');
      expect(schedule.kind).toBe('at');
    });
  });

  describe('createCronPayload', () => {
    it('should create a payload with message', () => {
      const payload = createCronPayload('Test message');
      expect(payload.kind).toBe('agent_turn');
      expect(payload.message).toBe('Test message');
      expect(payload.deliver).toBe(false);
    });

    it('should create a payload without message', () => {
      const payload = createCronPayload();
      expect(payload.message).toBe('');
    });
  });

  describe('createCronJobState', () => {
    it('should create an empty state', () => {
      const state = createCronJobState();
      expect(state).toEqual({});
    });
  });

  describe('createCronJob', () => {
    it('should create a job with id and name', () => {
      const job = createCronJob('test-id', 'Test Job');
      expect(job.id).toBe('test-id');
      expect(job.name).toBe('Test Job');
      expect(job.enabled).toBe(true);
      expect(job.schedule.kind).toBe('every');
      expect(job.payload.kind).toBe('agent_turn');
      expect(job.deleteAfterRun).toBe(false);
    });
  });

  describe('createCronStore', () => {
    it('should create an empty store', () => {
      const store = createCronStore();
      expect(store.version).toBe(1);
      expect(store.jobs).toEqual([]);
    });
  });
});
