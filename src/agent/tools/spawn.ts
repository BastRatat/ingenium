/**
 * Spawn tool implementation.
 */

import type { ToolParameters } from './base.js';
import { BaseTool } from './base.js';

/**
 * Interface for subagent manager.
 * Will be implemented in the agent module.
 */
export interface ISubagentManager {
  spawn(options: {
    task: string;
    label?: string;
    originChannel: string;
    originChatId: string;
  }): Promise<string>;
}

/**
 * Options for spawn tool.
 */
export interface SpawnToolOptions {
  /**
   * The subagent manager instance.
   */
  manager: ISubagentManager;

  /**
   * Default origin channel.
   */
  originChannel?: string;

  /**
   * Default origin chat ID.
   */
  originChatId?: string;
}

/**
 * Tool to spawn a subagent for background task execution.
 *
 * The subagent runs asynchronously and announces its result back
 * to the main agent when complete.
 */
export class SpawnTool extends BaseTool {
  readonly name = 'spawn';
  readonly description =
    'Spawn a subagent to handle a task in the background. ' +
    'Use this for complex or time-consuming tasks that can run independently. ' +
    'The subagent will complete the task and report back when done.';
  readonly parameters: ToolParameters = {
    type: 'object',
    properties: {
      task: {
        type: 'string',
        description: 'The task for the subagent to complete',
      },
      label: {
        type: 'string',
        description: 'Optional short label for the task (for display)',
      },
    },
    required: ['task'],
  };

  private manager: ISubagentManager;
  private originChannel: string;
  private originChatId: string;

  constructor(options: SpawnToolOptions) {
    super();
    this.manager = options.manager;
    this.originChannel = options.originChannel ?? 'cli';
    this.originChatId = options.originChatId ?? 'direct';
  }

  /**
   * Set the origin context for subagent announcements.
   */
  setContext(channel: string, chatId: string): void {
    this.originChannel = channel;
    this.originChatId = chatId;
  }

  async execute(params: Record<string, unknown>): Promise<string> {
    const task = params['task'];
    const label = params['label'];

    if (typeof task !== 'string') {
      return 'Error: task must be a string';
    }

    const spawnOptions: {
      task: string;
      label?: string;
      originChannel: string;
      originChatId: string;
    } = {
      task,
      originChannel: this.originChannel,
      originChatId: this.originChatId,
    };
    if (typeof label === 'string') {
      spawnOptions.label = label;
    }
    return this.manager.spawn(spawnOptions);
  }
}

/**
 * Create a spawn tool.
 */
export function createSpawnTool(options: SpawnToolOptions): SpawnTool {
  return new SpawnTool(options);
}
