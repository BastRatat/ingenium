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
function isHeartbeatEmpty(content: string | null): boolean {
  if (content === null || content.trim() === '') {
    return true;
  }

  // Lines to skip: empty, headers, HTML comments, checkboxes
  const skipPatterns = new Set(['- [ ]', '* [ ]', '- [x]', '* [x]']);

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (
      line === '' ||
      line.startsWith('#') ||
      line.startsWith('<!--') ||
      skipPatterns.has(line)
    ) {
      continue;
    }
    return false; // Found actionable content
  }

  return true;
}

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
export class HeartbeatService {
  readonly workspace: string;
  private readonly onHeartbeat: HeartbeatCallback | undefined;
  readonly intervalMs: number;
  readonly enabled: boolean;
  private running = false;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(options: HeartbeatServiceOptions) {
    this.workspace = options.workspace;
    this.onHeartbeat = options.onHeartbeat;
    this.intervalMs = options.intervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    this.enabled = options.enabled ?? true;
  }

  /**
   * Path to HEARTBEAT.md file.
   */
  get heartbeatFile(): string {
    return join(this.workspace, 'HEARTBEAT.md');
  }

  /**
   * Read HEARTBEAT.md content.
   */
  private async readHeartbeatFile(): Promise<string | null> {
    if (existsSync(this.heartbeatFile)) {
      try {
        return await readFile(this.heartbeatFile, 'utf-8');
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Start the heartbeat service.
   */
  async start(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.running = true;
    this.scheduleNextTick();
  }

  /**
   * Stop the heartbeat service.
   */
  stop(): void {
    this.running = false;
    if (this.timerHandle !== null) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
  }

  /**
   * Schedule the next heartbeat tick.
   */
  private scheduleNextTick(): void {
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
  private async tick(): Promise<void> {
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
        } else {
          // Task was completed
        }
      } catch {
        // Heartbeat execution failed
      }
    }
  }

  /**
   * Manually trigger a heartbeat.
   */
  async triggerNow(): Promise<string | null> {
    if (this.onHeartbeat !== undefined) {
      return this.onHeartbeat(HEARTBEAT_PROMPT);
    }
    return null;
  }

  /**
   * Check if service is running.
   */
  isRunning(): boolean {
    return this.running;
  }
}

/**
 * Create a HeartbeatService instance.
 */
export function createHeartbeatService(
  options: HeartbeatServiceOptions
): HeartbeatService {
  return new HeartbeatService(options);
}
