/**
 * Cron types module.
 */
/**
 * Create a default CronSchedule.
 */
export function createCronSchedule(kind) {
    return { kind };
}
/**
 * Create a default CronPayload.
 */
export function createCronPayload(message = '') {
    return {
        kind: 'agent_turn',
        message,
        deliver: false,
    };
}
/**
 * Create a default CronJobState.
 */
export function createCronJobState() {
    return {};
}
/**
 * Create a default CronJob.
 */
export function createCronJob(id, name) {
    return {
        id,
        name,
        enabled: true,
        schedule: createCronSchedule('every'),
        payload: createCronPayload(),
        state: createCronJobState(),
        createdAtMs: 0,
        updatedAtMs: 0,
        deleteAfterRun: false,
    };
}
/**
 * Create a default CronStore.
 */
export function createCronStore() {
    return {
        version: 1,
        jobs: [],
    };
}
//# sourceMappingURL=types.js.map