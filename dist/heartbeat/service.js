/**
 * Heartbeat service module.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
/** Default interval: 30 minutes */
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000;
/** The prompt sent to agent during heartbeat */
export const HEARTBEAT_PROMPT = `Read HEARTBEAT.md in your workspace (if it exists).
Follow any instructions or tasks listed there.
If nothing needs attention, reply with just: HEARTBEAT_OK`;
/** Token that indicates "nothing to do" */
export const HEARTBEAT_OK_TOKEN = 'HEARTBEAT_OK';
/**
 * Check if HEARTBEAT.md has no actionable content.
 */
function isHeartbeatEmpty(content) {
    if (content === null || content.trim() === '') {
        return true;
    }
    // Lines to skip: empty, headers, HTML comments, checkboxes
    const skipPatterns = new Set(['- [ ]', '* [ ]', '- [x]', '* [x]']);
    for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (line === '' ||
            line.startsWith('#') ||
            line.startsWith('<!--') ||
            skipPatterns.has(line)) {
            continue;
        }
        return false; // Found actionable content
    }
    return true;
}
/**
 * Periodic heartbeat service that wakes the agent to check for tasks.
 *
 * The agent reads HEARTBEAT.md from the workspace and executes any
 * tasks listed there. If nothing needs attention, it replies HEARTBEAT_OK.
 */
export class HeartbeatService {
    workspace;
    onHeartbeat;
    intervalMs;
    enabled;
    running = false;
    timerHandle = null;
    constructor(options) {
        this.workspace = options.workspace;
        this.onHeartbeat = options.onHeartbeat;
        this.intervalMs = options.intervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
        this.enabled = options.enabled ?? true;
    }
    /**
     * Path to HEARTBEAT.md file.
     */
    get heartbeatFile() {
        return join(this.workspace, 'HEARTBEAT.md');
    }
    /**
     * Read HEARTBEAT.md content.
     */
    async readHeartbeatFile() {
        if (existsSync(this.heartbeatFile)) {
            try {
                return await readFile(this.heartbeatFile, 'utf-8');
            }
            catch {
                return null;
            }
        }
        return null;
    }
    /**
     * Start the heartbeat service.
     */
    async start() {
        if (!this.enabled) {
            return;
        }
        this.running = true;
        this.scheduleNextTick();
    }
    /**
     * Stop the heartbeat service.
     */
    stop() {
        this.running = false;
        if (this.timerHandle !== null) {
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
        }
    }
    /**
     * Schedule the next heartbeat tick.
     */
    scheduleNextTick() {
        if (!this.running) {
            return;
        }
        this.timerHandle = setTimeout(() => {
            if (this.running) {
                void this.tick().then(() => {
                    this.scheduleNextTick();
                });
            }
        }, this.intervalMs);
    }
    /**
     * Execute a single heartbeat tick.
     */
    async tick() {
        const content = await this.readHeartbeatFile();
        // Skip if HEARTBEAT.md is empty or doesn't exist
        if (isHeartbeatEmpty(content)) {
            return;
        }
        if (this.onHeartbeat !== undefined) {
            try {
                const response = await this.onHeartbeat(HEARTBEAT_PROMPT);
                // Check if agent said "nothing to do"
                const normalizedResponse = response.toUpperCase().replace(/_/g, '');
                if (normalizedResponse.includes(HEARTBEAT_OK_TOKEN.replace(/_/g, ''))) {
                    // OK - no action needed
                }
                else {
                    // Task was completed
                }
            }
            catch {
                // Heartbeat execution failed
            }
        }
    }
    /**
     * Manually trigger a heartbeat.
     */
    async triggerNow() {
        if (this.onHeartbeat !== undefined) {
            return this.onHeartbeat(HEARTBEAT_PROMPT);
        }
        return null;
    }
    /**
     * Check if service is running.
     */
    isRunning() {
        return this.running;
    }
}
/**
 * Create a HeartbeatService instance.
 */
export function createHeartbeatService(options) {
    return new HeartbeatService(options);
}
//# sourceMappingURL=service.js.map