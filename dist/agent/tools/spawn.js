/**
 * Spawn tool implementation.
 */
import { BaseTool } from './base.js';
/**
 * Tool to spawn a subagent for background task execution.
 *
 * The subagent runs asynchronously and announces its result back
 * to the main agent when complete.
 */
export class SpawnTool extends BaseTool {
    name = 'spawn';
    description = 'Spawn a subagent to handle a task in the background. ' +
        'Use this for complex or time-consuming tasks that can run independently. ' +
        'The subagent will complete the task and report back when done.';
    parameters = {
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
    manager;
    originChannel;
    originChatId;
    constructor(options) {
        super();
        this.manager = options.manager;
        this.originChannel = options.originChannel ?? 'cli';
        this.originChatId = options.originChatId ?? 'direct';
    }
    /**
     * Set the origin context for subagent announcements.
     */
    setContext(channel, chatId) {
        this.originChannel = channel;
        this.originChatId = chatId;
    }
    async execute(params) {
        const task = params['task'];
        const label = params['label'];
        if (typeof task !== 'string') {
            return 'Error: task must be a string';
        }
        const spawnOptions = {
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
export function createSpawnTool(options) {
    return new SpawnTool(options);
}
//# sourceMappingURL=spawn.js.map