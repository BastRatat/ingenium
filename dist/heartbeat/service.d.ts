/**
 * Heartbeat service module.
 */
/** Default interval: 30 minutes */
export declare const DEFAULT_HEARTBEAT_INTERVAL_MS: number;
/** The prompt sent to agent during heartbeat */
export declare const HEARTBEAT_PROMPT = "Read HEARTBEAT.md in your workspace (if it exists).\nFollow any instructions or tasks listed there.\nIf nothing needs attention, reply with just: HEARTBEAT_OK";
/** Token that indicates "nothing to do" */
export declare const HEARTBEAT_OK_TOKEN = "HEARTBEAT_OK";
/**
 * Callback type for heartbeat execution.
 */
export type HeartbeatCallback = (prompt: string) => Promise<string>;
/**
 * Options for HeartbeatService.
 */
export interface HeartbeatServiceOptions {
    /** Path to workspace directory */
    workspace: string;
    /** Callback to execute heartbeat through agent */
    onHeartbeat?: HeartbeatCallback;
    /** Interval in milliseconds */
    intervalMs?: number;
    /** Whether the service is enabled */
    enabled?: boolean;
}
/**
 * Periodic heartbeat service that wakes the agent to check for tasks.
 *
 * The agent reads HEARTBEAT.md from the workspace and executes any
 * tasks listed there. If nothing needs attention, it replies HEARTBEAT_OK.
 */
export declare class HeartbeatService {
    readonly workspace: string;
    private readonly onHeartbeat;
    readonly intervalMs: number;
    readonly enabled: boolean;
    private running;
    private timerHandle;
    constructor(options: HeartbeatServiceOptions);
    /**
     * Path to HEARTBEAT.md file.
     */
    get heartbeatFile(): string;
    /**
     * Read HEARTBEAT.md content.
     */
    private readHeartbeatFile;
    /**
     * Start the heartbeat service.
     */
    start(): Promise<void>;
    /**
     * Stop the heartbeat service.
     */
    stop(): void;
    /**
     * Schedule the next heartbeat tick.
     */
    private scheduleNextTick;
    /**
     * Execute a single heartbeat tick.
     */
    private tick;
    /**
     * Manually trigger a heartbeat.
     */
    triggerNow(): Promise<string | null>;
    /**
     * Check if service is running.
     */
    isRunning(): boolean;
}
/**
 * Create a HeartbeatService instance.
 */
export declare function createHeartbeatService(options: HeartbeatServiceOptions): HeartbeatService;
//# sourceMappingURL=service.d.ts.map