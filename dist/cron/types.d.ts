/**
 * Cron types module.
 */
/**
 * Schedule definition for a cron job.
 */
export interface CronSchedule {
    kind: 'at' | 'every' | 'cron';
    /** For "at": timestamp in ms */
    atMs?: number;
    /** For "every": interval in ms */
    everyMs?: number;
    /** For "cron": cron expression (e.g. "0 9 * * *") */
    expr?: string;
    /** Timezone for cron expressions */
    tz?: string;
}
/**
 * What to do when the job runs.
 */
export interface CronPayload {
    kind: 'system_event' | 'agent_turn';
    message: string;
    /** Deliver response to channel */
    deliver: boolean;
    /** Channel for delivery (e.g. "whatsapp") */
    channel?: string;
    /** Recipient for delivery (e.g. phone number) */
    to?: string;
}
/**
 * Runtime state of a job.
 */
export interface CronJobState {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: 'ok' | 'error' | 'skipped';
    lastError?: string;
}
/**
 * A scheduled job.
 */
export interface CronJob {
    id: string;
    name: string;
    enabled: boolean;
    schedule: CronSchedule;
    payload: CronPayload;
    state: CronJobState;
    createdAtMs: number;
    updatedAtMs: number;
    deleteAfterRun: boolean;
}
/**
 * Persistent store for cron jobs.
 */
export interface CronStore {
    version: number;
    jobs: CronJob[];
}
/**
 * Create a default CronSchedule.
 */
export declare function createCronSchedule(kind: CronSchedule['kind']): CronSchedule;
/**
 * Create a default CronPayload.
 */
export declare function createCronPayload(message?: string): CronPayload;
/**
 * Create a default CronJobState.
 */
export declare function createCronJobState(): CronJobState;
/**
 * Create a default CronJob.
 */
export declare function createCronJob(id: string, name: string): CronJob;
/**
 * Create a default CronStore.
 */
export declare function createCronStore(): CronStore;
//# sourceMappingURL=types.d.ts.map