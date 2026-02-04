/**
 * Subagent manager for background task execution.
 */
import { randomUUID } from 'node:crypto';
import { ToolRegistry } from './tools/registry.js';
import { readFileTool, writeFileTool, listDirTool } from './tools/filesystem.js';
import { ExecTool } from './tools/shell.js';
import { WebSearchTool, WebFetchTool } from './tools/web.js';
/**
 * Manages background subagent execution.
 *
 * Subagents are lightweight agent instances that run in the background
 * to handle specific tasks. They share the same LLM provider but have
 * isolated context and a focused system prompt.
 */
export class SubagentManager {
    provider;
    workspace;
    bus;
    model;
    braveApiKey;
    runningTasks = new Map();
    constructor(options) {
        this.provider = options.provider;
        this.workspace = options.workspace;
        this.bus = options.bus;
        this.model = options.model ?? options.provider.getDefaultModel();
        this.braveApiKey = options.braveApiKey ?? null;
    }
    /**
     * Spawn a subagent to execute a task in the background.
     *
     * @param options - Spawn options containing task, label, originChannel, originChatId.
     * @returns Status message indicating the subagent was started.
     */
    async spawn(options) {
        const taskId = randomUUID().slice(0, 8);
        const displayLabel = options.label ?? (options.task.length > 30 ? options.task.slice(0, 30) + '...' : options.task);
        const origin = {
            channel: options.originChannel,
            chatId: options.originChatId,
        };
        const abortController = new AbortController();
        // Create background task
        const promise = this.runSubagent(taskId, options.task, displayLabel, origin, abortController.signal);
        const runningTask = {
            id: taskId,
            label: displayLabel,
            promise,
            abortController,
        };
        this.runningTasks.set(taskId, runningTask);
        // Cleanup when done
        promise.finally(() => {
            this.runningTasks.delete(taskId);
        });
        console.log(`[SubagentManager] Spawned subagent [${taskId}]: ${displayLabel}`);
        return `Subagent [${displayLabel}] started (id: ${taskId}). I'll notify you when it completes.`;
    }
    /**
     * Execute the subagent task and announce the result.
     */
    async runSubagent(taskId, task, label, origin, _signal) {
        console.log(`[SubagentManager] Subagent [${taskId}] starting task: ${label}`);
        try {
            // Build subagent tools (no message tool, no spawn tool)
            const tools = new ToolRegistry();
            tools.register(readFileTool);
            tools.register(writeFileTool);
            tools.register(listDirTool);
            tools.register(new ExecTool({ workingDir: this.workspace }));
            const webSearchOptions = {};
            if (this.braveApiKey !== null) {
                webSearchOptions.apiKey = this.braveApiKey;
            }
            tools.register(new WebSearchTool(webSearchOptions));
            tools.register(new WebFetchTool());
            // Build messages with subagent-specific prompt
            const systemPrompt = this.buildSubagentPrompt(task);
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: task },
            ];
            // Run agent loop (limited iterations)
            const maxIterations = 15;
            let iteration = 0;
            let finalResult = null;
            while (iteration < maxIterations) {
                iteration++;
                const response = await this.provider.chat({
                    messages: messages.map((m) => {
                        const converted = {
                            role: m.role,
                            content: m.content,
                        };
                        if (m.tool_call_id !== undefined) {
                            converted.toolCallId = m.tool_call_id;
                        }
                        if (m.name !== undefined) {
                            converted.name = m.name;
                        }
                        return converted;
                    }),
                    tools: tools.getDefinitions(),
                    model: this.model,
                });
                if (response.toolCalls.length > 0) {
                    // Add assistant message with tool calls
                    const toolCallDicts = response.toolCalls.map((tc) => ({
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.arguments),
                        },
                    }));
                    messages.push({
                        role: 'assistant',
                        content: response.content ?? '',
                        tool_calls: toolCallDicts,
                    });
                    // Execute tools
                    for (const toolCall of response.toolCalls) {
                        console.log(`[SubagentManager] Subagent [${taskId}] executing: ${toolCall.name}`);
                        const result = await tools.execute(toolCall.name, toolCall.arguments);
                        messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            name: toolCall.name,
                            content: result,
                        });
                    }
                }
                else {
                    finalResult = response.content;
                    break;
                }
            }
            if (finalResult === null) {
                finalResult = 'Task completed but no final response was generated.';
            }
            console.log(`[SubagentManager] Subagent [${taskId}] completed successfully`);
            await this.announceResult(taskId, label, task, finalResult, origin, 'ok');
        }
        catch (error) {
            const errorMsg = `Error: ${error instanceof Error ? error.message : String(error)}`;
            console.error(`[SubagentManager] Subagent [${taskId}] failed:`, error);
            await this.announceResult(taskId, label, task, errorMsg, origin, 'error');
        }
    }
    /**
     * Announce the subagent result to the main agent via the message bus.
     */
    async announceResult(_taskId, label, task, result, origin, status) {
        const statusText = status === 'ok' ? 'completed successfully' : 'failed';
        const announceContent = `[Subagent '${label}' ${statusText}]

Task: ${task}

Result:
${result}

Summarize this naturally for the user. Keep it brief (1-2 sentences). Do not mention technical details like "subagent" or task IDs.`;
        // Inject as system message to trigger main agent
        const msg = {
            channel: 'system',
            senderId: 'subagent',
            chatId: `${origin.channel}:${origin.chatId}`,
            content: announceContent,
            timestamp: new Date(),
            media: [],
            metadata: {},
        };
        await this.bus.publishInbound(msg);
    }
    /**
     * Build a focused system prompt for the subagent.
     */
    buildSubagentPrompt(task) {
        return `# Subagent

You are a subagent spawned by the main agent to complete a specific task.

## Your Task
${task}

## Rules
1. Stay focused - complete only the assigned task, nothing else
2. Your final response will be reported back to the main agent
3. Do not initiate conversations or take on side tasks
4. Be concise but informative in your findings

## What You Can Do
- Read and write files in the workspace
- Execute shell commands
- Search the web and fetch web pages
- Complete the task thoroughly

## What You Cannot Do
- Send messages directly to users (no message tool available)
- Spawn other subagents
- Access the main agent's conversation history

## Workspace
Your workspace is at: ${this.workspace}

When you have completed the task, provide a clear summary of your findings or actions.`;
    }
    /**
     * Return the number of currently running subagents.
     */
    getRunningCount() {
        return this.runningTasks.size;
    }
    /**
     * Get IDs of all running subagents.
     */
    getRunningIds() {
        return Array.from(this.runningTasks.keys());
    }
    /**
     * Cancel a running subagent by ID.
     */
    cancel(taskId) {
        const task = this.runningTasks.get(taskId);
        if (task) {
            task.abortController.abort();
            this.runningTasks.delete(taskId);
            return true;
        }
        return false;
    }
}
/**
 * Create a subagent manager.
 */
export function createSubagentManager(options) {
    return new SubagentManager(options);
}
//# sourceMappingURL=subagent.js.map