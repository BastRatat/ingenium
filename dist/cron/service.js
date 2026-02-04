/**
 * Cron service module.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
/** Current time in milliseconds */
function nowMs() {
    return Date.now();
}
/**
 * Compute next run time in ms.
 */
function computeNextRun(schedule, currentMs) {
    if (schedule.kind === 'at') {
        if (schedule.atMs !== undefined && schedule.atMs > currentMs) {
            return schedule.atMs;
        }
        return undefined;
    }
    if (schedule.kind === 'every') {
        if (schedule.everyMs === undefined || schedule.everyMs <= 0) {
            return undefined;
        }
        return currentMs + schedule.everyMs;
    }
    if (schedule.kind === 'cron' && schedule.expr !== undefined) {
        // Simple cron parsing - supports basic expressions
        // For production, consider using cron-parser package
        return computeCronNextRun(schedule.expr, currentMs);
    }
    return undefined;
}
/**
 * Simple cron expression parser.
 * Supports: minute hour day month weekday
 */
function computeCronNextRun(expr, currentMs) {
    const parts = expr.trim().split(/\s+/);
    if (parts.length < 5) {
        return undefined;
    }
    const [minuteExpr, hourExpr, dayExpr, monthExpr, weekdayExpr] = parts;
    if (minuteExpr === undefined ||
        hourExpr === undefined ||
        dayExpr === undefined ||
        monthExpr === undefined ||
        weekdayExpr === undefined) {
        return undefined;
    }
    const now = new Date(currentMs);
    const candidate = new Date(currentMs);
    // Try finding next matching time within the next year
    for (let i = 0; i < 365 * 24 * 60; i++) {
        candidate.setTime(now.getTime() + i * 60 * 1000);
        const minute = candidate.getMinutes();
        const hour = candidate.getHours();
        const day = candidate.getDate();
        const month = candidate.getMonth() + 1;
        const weekday = candidate.getDay();
        if (matchCronField(minuteExpr, minute) &&
            matchCronField(hourExpr, hour) &&
            matchCronField(dayExpr, day) &&
            matchCronField(monthExpr, month) &&
            matchCronField(weekdayExpr, weekday)) {
            // Set seconds and milliseconds to 0
            candidate.setSeconds(0, 0);
            if (candidate.getTime() > currentMs) {
                return candidate.getTime();
            }
        }
    }
    return undefined;
}
/**
 * Match a cron field expression against a value.
 */
function matchCronField(expr, value) {
    if (expr === '*') {
        return true;
    }
    // Handle step values (*/n)
    if (expr.startsWith('*/')) {
        const step = parseInt(expr.slice(2), 10);
        if (!isNaN(step) && step > 0) {
            return value % step === 0;
        }
        return false;
    }
    // Handle ranges (n-m)
    if (expr.includes('-')) {
        const [startStr, endStr] = expr.split('-');
        const start = parseInt(startStr ?? '', 10);
        const end = parseInt(endStr ?? '', 10);
        if (!isNaN(start) && !isNaN(end)) {
            return value >= start && value <= end;
        }
        return false;
    }
    // Handle lists (n,m,o)
    if (expr.includes(',')) {
        const values = expr.split(',').map((v) => parseInt(v.trim(), 10));
        return values.includes(value);
    }
    // Single value
    const singleValue = parseInt(expr, 10);
    return !isNaN(singleValue) && value === singleValue;
}
/**
 * Build a CronSchedule object, only including defined properties.
 */
function buildSchedule(kind, atMs, everyMs, expr, tz) {
    const schedule = { kind };
    if (atMs !== undefined) {
        schedule.atMs = atMs;
    }
    if (everyMs !== undefined) {
        schedule.everyMs = everyMs;
    }
    if (expr !== undefined) {
        schedule.expr = expr;
    }
    if (tz !== undefined) {
        schedule.tz = tz;
    }
    return schedule;
}
/**
 * Build a CronPayload object, only including defined properties.
 */
function buildPayload(kind, message, deliver, channel, to) {
    const payload = { kind, message, deliver };
    if (channel !== undefined) {
        payload.channel = channel;
    }
    if (to !== undefined) {
        payload.to = to;
    }
    return payload;
}
/**
 * Build a CronJobState object, only including defined properties.
 */
function buildState(nextRunAtMs, lastRunAtMs, lastStatus, lastError) {
    const state = {};
    if (nextRunAtMs !== undefined) {
        state.nextRunAtMs = nextRunAtMs;
    }
    if (lastRunAtMs !== undefined) {
        state.lastRunAtMs = lastRunAtMs;
    }
    if (lastStatus !== undefined) {
        state.lastStatus = lastStatus;
    }
    if (lastError !== undefined) {
        state.lastError = lastError;
    }
    return state;
}
/**
 * Service for managing and executing scheduled jobs.
 */
export class CronService {
    storePath;
    onJob;
    store = null;
    timerHandle = null;
    running = false;
    constructor(options) {
        this.storePath = options.storePath;
        this.onJob = options.onJob;
    }
    /**
     * Load jobs from disk.
     */
    async loadStore() {
        if (this.store !== null) {
            return this.store;
        }
        if (existsSync(this.storePath)) {
            try {
                const content = await readFile(this.storePath, 'utf-8');
                const data = JSON.parse(content);
                const jobsData = data['jobs'];
                const jobs = [];
                if (Array.isArray(jobsData)) {
                    for (const j of jobsData) {
                        if (typeof j === 'object' && j !== null) {
                            const job = j;
                            const scheduleData = job['schedule'];
                            const payloadData = job['payload'];
                            const stateData = job['state'];
                            jobs.push({
                                id: String(job['id'] ?? ''),
                                name: String(job['name'] ?? ''),
                                enabled: job['enabled'] !== false,
                                schedule: buildSchedule(scheduleData?.['kind'] ?? 'every', scheduleData?.['atMs'], scheduleData?.['everyMs'], scheduleData?.['expr'], scheduleData?.['tz']),
                                payload: buildPayload(payloadData?.['kind'] ?? 'agent_turn', String(payloadData?.['message'] ?? ''), payloadData?.['deliver'] === true, payloadData?.['channel'], payloadData?.['to']),
                                state: buildState(stateData?.['nextRunAtMs'], stateData?.['lastRunAtMs'], stateData?.['lastStatus'], stateData?.['lastError']),
                                createdAtMs: Number(job['createdAtMs'] ?? 0),
                                updatedAtMs: Number(job['updatedAtMs'] ?? 0),
                                deleteAfterRun: job['deleteAfterRun'] === true,
                            });
                        }
                    }
                }
                this.store = {
                    version: Number(data['version'] ?? 1),
                    jobs,
                };
            }
            catch {
                this.store = { version: 1, jobs: [] };
            }
        }
        else {
            this.store = { version: 1, jobs: [] };
        }
        return this.store;
    }
    /**
     * Save jobs to disk.
     */
    async saveStore() {
        if (this.store === null) {
            return;
        }
        const dir = dirname(this.storePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }
        const data = {
            version: this.store.version,
            jobs: this.store.jobs.map((j) => ({
                id: j.id,
                name: j.name,
                enabled: j.enabled,
                schedule: {
                    kind: j.schedule.kind,
                    atMs: j.schedule.atMs,
                    everyMs: j.schedule.everyMs,
                    expr: j.schedule.expr,
                    tz: j.schedule.tz,
                },
                payload: {
                    kind: j.payload.kind,
                    message: j.payload.message,
                    deliver: j.payload.deliver,
                    channel: j.payload.channel,
                    to: j.payload.to,
                },
                state: {
                    nextRunAtMs: j.state.nextRunAtMs,
                    lastRunAtMs: j.state.lastRunAtMs,
                    lastStatus: j.state.lastStatus,
                    lastError: j.state.lastError,
                },
                createdAtMs: j.createdAtMs,
                updatedAtMs: j.updatedAtMs,
                deleteAfterRun: j.deleteAfterRun,
            })),
        };
        await writeFile(this.storePath, JSON.stringify(data, null, 2), 'utf-8');
    }
    /**
     * Start the cron service.
     */
    async start() {
        this.running = true;
        await this.loadStore();
        this.recomputeNextRuns();
        await this.saveStore();
        this.armTimer();
    }
    /**
     * Stop the cron service.
     */
    stop() {
        this.running = false;
        if (this.timerHandle !== null) {
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
        }
    }
    /**
     * Recompute next run times for all enabled jobs.
     */
    recomputeNextRuns() {
        if (this.store === null) {
            return;
        }
        const now = nowMs();
        for (const job of this.store.jobs) {
            if (job.enabled) {
                const nextRun = computeNextRun(job.schedule, now);
                if (nextRun !== undefined) {
                    job.state.nextRunAtMs = nextRun;
                }
                else {
                    delete job.state.nextRunAtMs;
                }
            }
        }
    }
    /**
     * Get the earliest next run time across all jobs.
     */
    getNextWakeMs() {
        if (this.store === null) {
            return undefined;
        }
        const times = [];
        for (const j of this.store.jobs) {
            if (j.enabled && j.state.nextRunAtMs !== undefined) {
                times.push(j.state.nextRunAtMs);
            }
        }
        return times.length > 0 ? Math.min(...times) : undefined;
    }
    /**
     * Schedule the next timer tick.
     */
    armTimer() {
        if (this.timerHandle !== null) {
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
        }
        const nextWake = this.getNextWakeMs();
        if (nextWake === undefined || !this.running) {
            return;
        }
        const delayMs = Math.max(0, nextWake - nowMs());
        this.timerHandle = setTimeout(() => {
            if (this.running) {
                void this.onTimer();
            }
        }, delayMs);
    }
    /**
     * Handle timer tick - run due jobs.
     */
    async onTimer() {
        if (this.store === null) {
            return;
        }
        const now = nowMs();
        const dueJobs = this.store.jobs.filter((j) => j.enabled && j.state.nextRunAtMs !== undefined && now >= j.state.nextRunAtMs);
        for (const job of dueJobs) {
            await this.executeJob(job);
        }
        await this.saveStore();
        this.armTimer();
    }
    /**
     * Execute a single job.
     */
    async executeJob(job) {
        const startMs = nowMs();
        try {
            if (this.onJob !== undefined) {
                await this.onJob(job);
            }
            job.state.lastStatus = 'ok';
            delete job.state.lastError;
        }
        catch (e) {
            job.state.lastStatus = 'error';
            job.state.lastError = e instanceof Error ? e.message : String(e);
        }
        job.state.lastRunAtMs = startMs;
        job.updatedAtMs = nowMs();
        // Handle one-shot jobs
        if (job.schedule.kind === 'at') {
            if (job.deleteAfterRun && this.store !== null) {
                this.store.jobs = this.store.jobs.filter((j) => j.id !== job.id);
            }
            else {
                job.enabled = false;
                delete job.state.nextRunAtMs;
            }
        }
        else {
            // Compute next run
            const nextRun = computeNextRun(job.schedule, nowMs());
            if (nextRun !== undefined) {
                job.state.nextRunAtMs = nextRun;
            }
            else {
                delete job.state.nextRunAtMs;
            }
        }
    }
    // ========== Public API ==========
    /**
     * List all jobs.
     */
    async listJobs(includeDisabled = false) {
        const store = await this.loadStore();
        const jobs = includeDisabled
            ? store.jobs
            : store.jobs.filter((j) => j.enabled);
        return jobs
            .slice()
            .sort((a, b) => (a.state.nextRunAtMs ?? Infinity) - (b.state.nextRunAtMs ?? Infinity));
    }
    /**
     * Add a new job.
     */
    async addJob(options) {
        const store = await this.loadStore();
        const now = nowMs();
        const nextRun = computeNextRun(options.schedule, now);
        const state = {};
        if (nextRun !== undefined) {
            state.nextRunAtMs = nextRun;
        }
        const job = {
            id: randomUUID().slice(0, 8),
            name: options.name,
            enabled: true,
            schedule: options.schedule,
            payload: buildPayload('agent_turn', options.message, options.deliver ?? false, options.channel, options.to),
            state,
            createdAtMs: now,
            updatedAtMs: now,
            deleteAfterRun: options.deleteAfterRun ?? false,
        };
        store.jobs.push(job);
        await this.saveStore();
        this.armTimer();
        return job;
    }
    /**
     * Remove a job by ID.
     */
    async removeJob(jobId) {
        const store = await this.loadStore();
        const before = store.jobs.length;
        store.jobs = store.jobs.filter((j) => j.id !== jobId);
        const removed = store.jobs.length < before;
        if (removed) {
            await this.saveStore();
            this.armTimer();
        }
        return removed;
    }
    /**
     * Enable or disable a job.
     */
    async enableJob(jobId, enabled = true) {
        const store = await this.loadStore();
        const job = store.jobs.find((j) => j.id === jobId);
        if (job !== undefined) {
            job.enabled = enabled;
            job.updatedAtMs = nowMs();
            if (enabled) {
                const nextRun = computeNextRun(job.schedule, nowMs());
                if (nextRun !== undefined) {
                    job.state.nextRunAtMs = nextRun;
                }
                else {
                    delete job.state.nextRunAtMs;
                }
            }
            else {
                delete job.state.nextRunAtMs;
            }
            await this.saveStore();
            this.armTimer();
            return job;
        }
        return null;
    }
    /**
     * Manually run a job.
     */
    async runJob(jobId, force = false) {
        const store = await this.loadStore();
        const job = store.jobs.find((j) => j.id === jobId);
        if (job !== undefined) {
            if (!force && !job.enabled) {
                return false;
            }
            await this.executeJob(job);
            await this.saveStore();
            this.armTimer();
            return true;
        }
        return false;
    }
    /**
     * Get service status.
     */
    status() {
        const store = this.store;
        const nextWake = this.getNextWakeMs();
        const result = {
            enabled: this.running,
            jobs: store?.jobs.length ?? 0,
        };
        if (nextWake !== undefined) {
            result.nextWakeAtMs = nextWake;
        }
        return result;
    }
}
/**
 * Create a CronService instance.
 */
export function createCronService(options) {
    return new CronService(options);
}
//# sourceMappingURL=service.js.map