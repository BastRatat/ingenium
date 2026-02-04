/**
 * Anthropic LLM provider implementation.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  LLMResponse,
  ChatOptions,
  ProviderOptions,
  ToolCallRequest,
  Message,
  ToolDefinition,
} from './base.js';
import { createEmptyResponse } from './base.js';

/**
 * Default Anthropic model.
 */
const DEFAULT_MODEL = 'claude-opus-4-5-20251101';

/**
 * Convert our tool definitions to Anthropic format.
 */
function convertToolsToAnthropic(
  tools: ToolDefinition[]
): Anthropic.Tool[] {
  return tools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: {
      type: 'object' as const,
      properties: tool.function.parameters.properties,
      required: tool.function.parameters.required ?? null,
    },
  }));
}

/**
 * Convert our messages to Anthropic format, extracting system message.
 */
function convertMessagesToAnthropic(messages: Message[]): {
  system: string | undefined;
  messages: Anthropic.MessageParam[];
} {
  let system: string | undefined;
  const converted: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      system = msg.content;
    } else if (msg.role === 'tool') {
      // Tool results in Anthropic format
      converted.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: msg.toolCallId ?? '',
            content: msg.content,
          },
        ],
      });
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      converted.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  return { system, messages: converted };
}

/**
 * Parse Anthropic response into our standard format.
 */
function parseAnthropicResponse(
  response: Anthropic.Message
): LLMResponse {
  const toolCalls: ToolCallRequest[] = [];
  let textContent: string | null = null;

  for (const block of response.content) {
    if (block.type === 'text') {
      textContent = block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input as Record<string, unknown>,
      });
    }
  }

  return {
    content: textContent,
    toolCalls,
    finishReason: response.stop_reason ?? 'stop',
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}

/**
 * Anthropic LLM provider using the official SDK.
 */
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(options: ProviderOptions = {}) {
    this.client = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.apiBase,
    });
    this.defaultModel = DEFAULT_MODEL;
  }

  async chat(options: ChatOptions): Promise<LLMResponse> {
    const model = options.model ?? this.defaultModel;
    const maxTokens = options.maxTokens ?? 4096;
    const temperature = options.temperature ?? 0.7;

    const { system, messages } = convertMessagesToAnthropic(options.messages);

    try {
      const params: Anthropic.MessageCreateParams = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      };

      if (system) {
        params.system = system;
      }

      if (options.tools && options.tools.length > 0) {
        params.tools = convertToolsToAnthropic(options.tools);
      }

      const response = await this.client.messages.create(params);
      return parseAnthropicResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createEmptyResponse(`Error calling Anthropic: ${message}`, 'error');
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }
}
