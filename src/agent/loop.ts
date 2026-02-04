/**
 * Agent loop: the core processing engine.
 */

import { MessageBus, InboundMessage, OutboundMessage } from '../bus/index.js';
import type { LLMProvider, ToolDefinition } from '../providers/base.js';
import { ContextBuilder, type ExtendedMessage, type ToolCallBlock } from './context.js';
import { ToolRegistry } from './tools/registry.js';
import { readFileTool, writeFileTool, editFileTool, listDirTool } from './tools/filesystem.js';
import { ExecTool } from './tools/shell.js';
import { WebSearchTool, WebFetchTool } from './tools/web.js';
import { MessageTool } from './tools/message.js';
import { SpawnTool } from './tools/spawn.js';
import { SubagentManager } from './subagent.js';
import { SessionManager } from '../session/manager.js';
import { parseSessionKey } from '../utils/helpers.js';
import { withTimeout } from '../utils/async-queue.js';

/**
 * Options for creating an AgentLoop.
 */
export interface AgentLoopOptions {
  bus: MessageBus;
  provider: LLMProvider;
  workspace: string;
  model?: string;
  maxIterations?: number;
  braveApiKey?: string;
}

/**
 * The agent loop is the core processing engine.
 *
 * It:
 * 1. Receives messages from the bus
 * 2. Builds context with history, memory, skills
 * 3. Calls the LLM
 * 4. Executes tool calls
 * 5. Sends responses back
 */
export class AgentLoop {
  readonly bus: MessageBus;
  readonly provider: LLMProvider;
  readonly workspace: string;
  readonly model: string;
  readonly maxIterations: number;
  readonly braveApiKey: string | null;

  readonly context: ContextBuilder;
  readonly sessions: SessionManager;
  readonly tools: ToolRegistry;
  readonly subagents: SubagentManager;

  private running = false;

  constructor(options: AgentLoopOptions) {
    this.bus = options.bus;
    this.provider = options.provider;
    this.workspace = options.workspace;
    this.model = options.model ?? options.provider.getDefaultModel();
    this.maxIterations = options.maxIterations ?? 20;
    this.braveApiKey = options.braveApiKey ?? null;

    this.context = new ContextBuilder(this.workspace);
    this.sessions = new SessionManager(this.workspace);
    this.tools = new ToolRegistry();
    const subagentOptions: {
      provider: LLMProvider;
      workspace: string;
      bus: MessageBus;
      model?: string;
      braveApiKey?: string;
    } = {
      provider: this.provider,
      workspace: this.workspace,
      bus: this.bus,
      model: this.model,
    };
    if (this.braveApiKey !== null) {
      subagentOptions.braveApiKey = this.braveApiKey;
    }
    this.subagents = new SubagentManager(subagentOptions);

    this.registerDefaultTools();
  }

  /**
   * Register the default set of tools.
   */
  private registerDefaultTools(): void {
    // File tools (these are tool objects, not classes)
    this.tools.register(readFileTool);
    this.tools.register(writeFileTool);
    this.tools.register(editFileTool);
    this.tools.register(listDirTool);

    // Shell tool
    this.tools.register(new ExecTool({ workingDir: this.workspace }));

    // Web tools
    const webSearchOptions: { apiKey?: string } = {};
    if (this.braveApiKey !== null) {
      webSearchOptions.apiKey = this.braveApiKey;
    }
    this.tools.register(new WebSearchTool(webSearchOptions));
    this.tools.register(new WebFetchTool());

    // Message tool
    const messageTool = new MessageTool({
      sendCallback: async (msg) => {
        await this.bus.publishOutbound(msg);
      },
    });
    this.tools.register(messageTool);

    // Spawn tool (for subagents)
    const spawnTool = new SpawnTool({ manager: this.subagents });
    this.tools.register(spawnTool);
  }

  /**
   * Run the agent loop, processing messages from the bus.
   */
  async run(): Promise<void> {
    this.running = true;
    console.log('[AgentLoop] Agent loop started');

    while (this.running) {
      try {
        // Wait for next message with timeout
        const msg = await withTimeout(this.bus.consumeInbound(), 1000);

        // Process it
        try {
          const response = await this.processMessage(msg);
          if (response) {
            await this.bus.publishOutbound(response);
          }
        } catch (error) {
          console.error('[AgentLoop] Error processing message:', error);
          // Send error response
          await this.bus.publishOutbound({
            channel: msg.channel,
            chatId: msg.chatId,
            content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      } catch (error) {
        // Timeout - continue loop
        if (error instanceof Error && error.message.includes('timed out')) {
          continue;
        }
        // Other error - log and continue
        console.error('[AgentLoop] Error in main loop:', error);
      }
    }
  }

  /**
   * Stop the agent loop.
   */
  stop(): void {
    this.running = false;
    console.log('[AgentLoop] Agent loop stopping');
  }

  /**
   * Process a single inbound message.
   *
   * @param msg - The inbound message to process.
   * @returns The response message, or null if no response needed.
   */
  async processMessage(msg: InboundMessage): Promise<OutboundMessage | null> {
    // Handle system messages (subagent announces)
    if (msg.channel === 'system') {
      return this.processSystemMessage(msg);
    }

    console.log(`[AgentLoop] Processing message from ${msg.channel}:${msg.senderId}`);

    // Get or create session
    const sessionKey = `${msg.channel}:${msg.chatId}`;
    const session = await this.sessions.getOrCreate(sessionKey);

    // Update tool contexts
    const messageTool = this.tools.get('message');
    if (messageTool instanceof MessageTool) {
      messageTool.setContext(msg.channel, msg.chatId);
    }

    const spawnTool = this.tools.get('spawn');
    if (spawnTool instanceof SpawnTool) {
      spawnTool.setContext(msg.channel, msg.chatId);
    }

    // Build initial messages
    const messages = await this.context.buildMessages(
      session.getHistory(),
      msg.content,
      undefined,
      msg.media.length > 0 ? msg.media : undefined
    );

    // Agent loop
    let iteration = 0;
    let finalContent: string | null = null;

    while (iteration < this.maxIterations) {
      iteration++;

      // Call LLM
      const response = await this.provider.chat({
        messages: this.convertMessages(messages),
        tools: this.tools.getDefinitions() as ToolDefinition[],
        model: this.model,
      });

      // Handle tool calls
      if (response.toolCalls.length > 0) {
        // Add assistant message with tool calls
        const toolCallDicts: ToolCallBlock[] = response.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }));

        this.context.addAssistantMessage(messages, response.content, toolCallDicts);

        // Execute tools
        for (const toolCall of response.toolCalls) {
          console.log(`[AgentLoop] Executing tool: ${toolCall.name}`);
          const result = await this.tools.execute(toolCall.name, toolCall.arguments);
          this.context.addToolResult(messages, toolCall.id, toolCall.name, result);
        }
      } else {
        // No tool calls, we're done
        finalContent = response.content;
        break;
      }
    }

    if (finalContent === null) {
      finalContent = "I've completed processing but have no response to give.";
    }

    // Save to session
    session.addMessage('user', msg.content);
    session.addMessage('assistant', finalContent);
    await this.sessions.save(session);

    return {
      channel: msg.channel,
      chatId: msg.chatId,
      content: finalContent,
    };
  }

  /**
   * Process a system message (e.g., subagent announce).
   *
   * The chatId field contains "original_channel:original_chat_id" to route
   * the response back to the correct destination.
   */
  private async processSystemMessage(msg: InboundMessage): Promise<OutboundMessage | null> {
    console.log(`[AgentLoop] Processing system message from ${msg.senderId}`);

    // Parse origin from chatId (format: "channel:chatId")
    let originChannel: string;
    let originChatId: string;

    try {
      const parsed = parseSessionKey(msg.chatId);
      originChannel = parsed.channel;
      originChatId = parsed.chatId;
    } catch {
      // Fallback
      originChannel = 'cli';
      originChatId = msg.chatId;
    }

    // Use the origin session for context
    const sessionKey = `${originChannel}:${originChatId}`;
    const session = await this.sessions.getOrCreate(sessionKey);

    // Update tool contexts
    const messageTool = this.tools.get('message');
    if (messageTool instanceof MessageTool) {
      messageTool.setContext(originChannel, originChatId);
    }

    const spawnTool = this.tools.get('spawn');
    if (spawnTool instanceof SpawnTool) {
      spawnTool.setContext(originChannel, originChatId);
    }

    // Build messages with the announce content
    const messages = await this.context.buildMessages(session.getHistory(), msg.content);

    // Agent loop (limited for announce handling)
    let iteration = 0;
    let finalContent: string | null = null;

    while (iteration < this.maxIterations) {
      iteration++;

      const response = await this.provider.chat({
        messages: this.convertMessages(messages),
        tools: this.tools.getDefinitions() as ToolDefinition[],
        model: this.model,
      });

      if (response.toolCalls.length > 0) {
        const toolCallDicts: ToolCallBlock[] = response.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }));

        this.context.addAssistantMessage(messages, response.content, toolCallDicts);

        for (const toolCall of response.toolCalls) {
          console.log(`[AgentLoop] Executing tool: ${toolCall.name}`);
          const result = await this.tools.execute(toolCall.name, toolCall.arguments);
          this.context.addToolResult(messages, toolCall.id, toolCall.name, result);
        }
      } else {
        finalContent = response.content;
        break;
      }
    }

    if (finalContent === null) {
      finalContent = 'Background task completed.';
    }

    // Save to session (mark as system message in history)
    session.addMessage('user', `[System: ${msg.senderId}] ${msg.content}`);
    session.addMessage('assistant', finalContent);
    await this.sessions.save(session);

    return {
      channel: originChannel,
      chatId: originChatId,
      content: finalContent,
    };
  }

  /**
   * Convert ExtendedMessage[] to Message[] for the provider.
   */
  private convertMessages(
    messages: ExtendedMessage[]
  ): Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string; toolCallId?: string; name?: string }> {
    return messages.map((m) => {
      const converted: {
        role: 'user' | 'assistant' | 'system' | 'tool';
        content: string;
        toolCallId?: string;
        name?: string;
      } = {
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      };
      if (m.tool_call_id !== undefined) {
        converted.toolCallId = m.tool_call_id;
      }
      if (m.name !== undefined) {
        converted.name = m.name;
      }
      return converted;
    });
  }

  /**
   * Process a message directly (for CLI usage).
   *
   * @param content - The message content.
   * @param _sessionKey - Session identifier (unused, for compatibility).
   * @returns The agent's response.
   */
  async processDirect(content: string, _sessionKey = 'cli:direct'): Promise<string> {
    const msg: InboundMessage = {
      channel: 'cli',
      senderId: 'user',
      chatId: 'direct',
      content,
      timestamp: new Date(),
      media: [],
      metadata: {},
    };

    const response = await this.processMessage(msg);
    return response?.content ?? '';
  }

  /**
   * Check if the agent loop is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }
}

/**
 * Create an agent loop.
 */
export function createAgentLoop(options: AgentLoopOptions): AgentLoop {
  return new AgentLoop(options);
}
