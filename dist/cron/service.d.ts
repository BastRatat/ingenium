/**
 * Cron service module.
 */
import type { CronJob, CronSchedule } from './types.js';
/**
 * Callback type for job execution.
 */
export type CronJobCallback = (job: CronJob) => Promise<string | null>;
/**
 * Options for CronService.
 */
export interface CronServiceOptions {
    storePath: string;
    onJob?: CronJobCallback;
}
/**
 * Service for managing and executing scheduled jobs.
 */
export declare class CronService {
    readonly storePath: string;
    private readonly onJob;
    private store;
    private timerHandle;
    private running;
    constructor(options: CronServiceOptions);
    /**
     * Load jobs from disk.
     */
    private loadStore;
    /**
     * Save jobs to disk.
     */
    private saveStore;
    /**
     * Start the cron service.
     */
    start(): Promise<void>;
    /**
     * Stop the cron service.
     */
    stop(): void;
    /**
     * Recompute next run times for all enabled jobs.
     */
    private recomputeNextRuns;
    /**
     * Get the earliest next run time across all jobs.
     */
    private getNextWakeMs;
    /**
     * Schedule the next timer tick.
     */
    private armTimer;
    /**
     * Handle timer tick - run due jobs.
     */
    private onTimer;
    /**
     * Execute a single job.
     */
    private executeJob;
    /**
     * List all jobs.
     */
    listJobs(includeDisabled?: boolean): Promise<CronJob[]>;
    /**
     * Add a new job.
     */
    addJob(options: {
        name: string;
        schedule: CronSchedule;
        message: string;
        deliver?: boolean;
        channel?: string;
        to?: string;
        deleteAfterRun?: boolean;
    }): Promise<CronJob>;
    /**
     * Remove a job by ID.
     */
    removeJob(jobId: string): Promise<boolean>;
    /**
     * Enable or disable a job.
     */
    enableJob(jobId: string, enabled?: boolean): Promise<CronJob | null>;
    /**
     * Manually run a job.
     */
    runJob(jobId: string, force?: boolean): Promise<boolean>;
    /**
     * Get service status.
     */
    status(): {
        enabled: boolean;
        jobs: number;
        nextWakeAtMs?: number;
    };
}
/**
 * Create a CronService instance.
 */
export declare function createCronService(options: CronServiceOptions): CronService;
//# sourceMappingURL=service.d.ts.map