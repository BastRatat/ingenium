/**
 * Context builder for assembling agent prompts.
 */

import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { MemoryStore } from './memory.js';
import { SkillsLoader } from './skills.js';

/**
 * Content block for multimodal messages.
 */
export interface ContentBlock {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

/**
 * Extended message with tool calls.
 */
export interface ExtendedMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentBlock[];
  tool_calls?: ToolCallBlock[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Tool call block for assistant messages.
 */
export interface ToolCallBlock {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Bootstrap files to load from workspace.
 */
const BOOTSTRAP_FILES = ['AGENTS.md', 'SOUL.md', 'USER.md', 'TOOLS.md', 'IDENTITY.md'];

/**
 * Builds the context (system prompt + messages) for the agent.
 *
 * Assembles bootstrap files, memory, skills, and conversation history
 * into a coherent prompt for the LLM.
 */
export class ContextBuilder {
  readonly workspace: string;
  readonly memory: MemoryStore;
  readonly skills: SkillsLoader;

  constructor(workspace: string) {
    this.workspace = resolve(workspace);
    this.memory = new MemoryStore(this.workspace);
    this.skills = new SkillsLoader(this.workspace);
  }

  /**
   * Build the system prompt from bootstrap files, memory, and skills.
   *
   * @param _skillNames - Optional list of skills to include (unused, for future).
   * @returns Complete system prompt.
   */
  async buildSystemPrompt(_skillNames?: string[]): Promise<string> {
    const parts: string[] = [];

    // Core identity
    parts.push(this.getIdentity());

    // Bootstrap files
    const bootstrap = await this.loadBootstrapFiles();
    if (bootstrap) {
      parts.push(bootstrap);
    }

    // Memory context
    const memory = await this.memory.getMemoryContext();
    if (memory) {
      parts.push(`# Memory\n\n${memory}`);
    }

    // Skills - progressive loading
    // 1. Always-loaded skills: include full content
    const alwaysSkills = await this.skills.getAlwaysSkills();
    if (alwaysSkills.length > 0) {
      const alwaysContent = await this.skills.loadSkillsForContext(alwaysSkills);
      if (alwaysContent) {
        parts.push(`# Active Skills\n\n${alwaysContent}`);
      }
    }

    // 2. Available skills: only show summary (agent uses read_file to load)
    const skillsSummary = await this.skills.buildSkillsSummary();
    if (skillsSummary) {
      parts.push(`# Skills

The following skills extend your capabilities. To use a skill, read its SKILL.md file using the read_file tool.
Skills with available="false" need dependencies installed first - you can try installing them with apt/brew.

${skillsSummary}`);
    }

    return parts.join('\n\n---\n\n');
  }

  /**
   * Get the core identity section.
   */
  private getIdentity(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 16).replace('T', ' ');
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });

    return `# ingenium

You are ingenium, a helpful AI assistant. You have access to tools that allow you to:
- Read, write, and edit files
- Execute shell commands
- Search the web and fetch web pages
- Send messages to users on chat channels
- Spawn subagents for complex background tasks

## Current Time
${dateStr} (${dayName})

## Workspace
Your workspace is at: ${this.workspace}
- Memory files: ${this.workspace}/memory/MEMORY.md
- Daily notes: ${this.workspace}/memory/YYYY-MM-DD.md
- Custom skills: ${this.workspace}/skills/{skill-name}/SKILL.md

IMPORTANT: When responding to direct questions or conversations, reply directly with your text response.
Only use the 'message' tool when you need to send a message to a specific chat channel (like WhatsApp).
For normal conversation, just respond with text - do not call the message tool.

Always be helpful, accurate, and concise. When using tools, explain what you're doing.
When remembering something, write to ${this.workspace}/memory/MEMORY.md`;
  }

  /**
   * Load all bootstrap files from workspace.
   */
  private async loadBootstrapFiles(): Promise<string> {
    const parts: string[] = [];

    for (const filename of BOOTSTRAP_FILES) {
      const filePath = join(this.workspace, filename);
      if (existsSync(filePath)) {
        try {
          const content = await readFile(filePath, 'utf-8');
          parts.push(`## ${filename}\n\n${content}`);
        } catch {
          // Ignore read errors
        }
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Build the complete message list for an LLM call.
   *
   * @param history - Previous conversation messages.
   * @param currentMessage - The new user message.
   * @param skillNames - Optional skills to include.
   * @param media - Optional list of local file paths for images/media.
   * @returns List of messages including system prompt.
   */
  async buildMessages(
    history: Array<{ role: string; content: string }>,
    currentMessage: string,
    skillNames?: string[],
    media?: string[]
  ): Promise<ExtendedMessage[]> {
    const messages: ExtendedMessage[] = [];

    // System prompt
    const systemPrompt = await this.buildSystemPrompt(skillNames);
    messages.push({ role: 'system', content: systemPrompt });

    // History
    for (const h of history) {
      messages.push({
        role: h.role as 'user' | 'assistant' | 'system' | 'tool',
        content: h.content,
      });
    }

    // Current message (with optional image attachments)
    const userContent = this.buildUserContent(currentMessage, media);
    messages.push({ role: 'user', content: userContent });

    return messages;
  }

  /**
   * Build user message content with optional base64-encoded images.
   */
  private buildUserContent(text: string, media?: string[]): string | ContentBlock[] {
    if (!media || media.length === 0) {
      return text;
    }

    const images: ContentBlock[] = [];

    for (const path of media) {
      try {
        if (!existsSync(path)) {
          continue;
        }

        const mime = this.guessMimeType(path);
        if (!mime || !mime.startsWith('image/')) {
          continue;
        }

        const data = readFileSync(path);
        const b64 = data.toString('base64');
        images.push({
          type: 'image_url',
          image_url: { url: `data:${mime};base64,${b64}` },
        });
      } catch {
        // Ignore errors reading media
      }
    }

    if (images.length === 0) {
      return text;
    }

    return [...images, { type: 'text', text }];
  }

  /**
   * Guess MIME type from file extension.
   */
  private guessMimeType(path: string): string | null {
    const ext = path.toLowerCase().split('.').pop() ?? '';
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
    };
    return mimeTypes[ext] ?? null;
  }

  /**
   * Add a tool result to the message list.
   *
   * @param messages - Current message list.
   * @param toolCallId - ID of the tool call.
   * @param toolName - Name of the tool.
   * @param result - Tool execution result.
   * @returns Updated message list.
   */
  addToolResult(
    messages: ExtendedMessage[],
    toolCallId: string,
    toolName: string,
    result: string
  ): ExtendedMessage[] {
    messages.push({
      role: 'tool',
      tool_call_id: toolCallId,
      name: toolName,
      content: result,
    });
    return messages;
  }

  /**
   * Add an assistant message to the message list.
   *
   * @param messages - Current message list.
   * @param content - Message content.
   * @param toolCalls - Optional tool calls.
   * @returns Updated message list.
   */
  addAssistantMessage(
    messages: ExtendedMessage[],
    content: string | null,
    toolCalls?: ToolCallBlock[]
  ): ExtendedMessage[] {
    const msg: ExtendedMessage = {
      role: 'assistant',
      content: content ?? '',
    };

    if (toolCalls && toolCalls.length > 0) {
      msg.tool_calls = toolCalls;
    }

    messages.push(msg);
    return messages;
  }
}

/**
 * Create a context builder.
 */
export function createContextBuilder(workspace: string): ContextBuilder {
  return new ContextBuilder(workspace);
}
