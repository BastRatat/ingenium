/**
 * OpenAI-compatible LLM provider implementation.
 * Works with OpenAI, OpenRouter, and other OpenAI-compatible APIs.
 */

import OpenAI from 'openai';
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
 * Default OpenAI model.
 */
const DEFAULT_MODEL = 'gpt-4o';

/**
 * Default OpenRouter model.
 */
const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-opus-4-5';

/**
 * OpenRouter API base URL.
 */
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Convert our messages to OpenAI format.
 */
function convertMessagesToOpenAI(
  messages: Message[]
): OpenAI.ChatCompletionMessageParam[] {
  return messages.map((msg): OpenAI.ChatCompletionMessageParam => {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.toolCallId ?? '',
      };
    }
    if (msg.role === 'assistant') {
      return {
        role: 'assistant',
        content: msg.content,
      };
    }
    if (msg.role === 'system') {
      return {
        role: 'system',
        content: msg.content,
      };
    }
    return {
      role: 'user',
      content: msg.content,
    };
  });
}

/**
 * Convert our tool definitions to OpenAI format.
 */
function convertToolsToOpenAI(
  tools: ToolDefinition[]
): OpenAI.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
    },
  }));
}

/**
 * Parse OpenAI response into our standard format.
 */
function parseOpenAIResponse(
  response: OpenAI.ChatCompletion
): LLMResponse {
  const choice = response.choices[0];
  if (!choice) {
    return createEmptyResponse(null, 'error');
  }

  const message = choice.message;
  const toolCalls: ToolCallRequest[] = [];

  if (message.tool_calls) {
    for (const tc of message.tool_calls) {
      // Handle function tool calls
      if (tc.type === 'function') {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        } catch {
          args = { raw: tc.function.arguments };
        }
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: args,
        });
      }
    }
  }

  return {
    content: message.content,
    toolCalls,
    finishReason: choice.finish_reason ?? 'stop',
    usage: {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    },
  };
}

/**
 * Options for OpenAI-compatible provider.
 */
export interface OpenAIProviderOptions extends ProviderOptions {
  /**
   * Whether this is an OpenRouter endpoint.
   */
  isOpenRouter?: boolean;
}

/**
 * OpenAI-compatible LLM provider.
 * Works with OpenAI, OpenRouter, vLLM, and other compatible APIs.
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(options: OpenAIProviderOptions = {}) {
    const isOpenRouter =
      options.isOpenRouter ??
      (options.apiKey?.startsWith('sk-or-') ||
        options.apiBase?.includes('openrouter'));

    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.apiBase ?? (isOpenRouter ? OPENROUTER_BASE_URL : undefined),
    });

    this.defaultModel = isOpenRouter ? DEFAULT_OPENROUTER_MODEL : DEFAULT_MODEL;
  }

  async chat(options: ChatOptions): Promise<LLMResponse> {
    const model = options.model ?? this.defaultModel;
    const maxTokens = options.maxTokens ?? 4096;
    const temperature = options.temperature ?? 0.7;

    const messages = convertMessagesToOpenAI(options.messages);

    try {
      const params: OpenAI.ChatCompletionCreateParams = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      };

      if (options.tools && options.tools.length > 0) {
        params.tools = convertToolsToOpenAI(options.tools);
        params.tool_choice = 'auto';
      }

      const response = await this.client.chat.completions.create(params);
      return parseOpenAIResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createEmptyResponse(`Error calling OpenAI: ${message}`, 'error');
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }
}

/**
 * Create an OpenRouter provider.
 */
export function createOpenRouterProvider(apiKey: string): OpenAIProvider {
  return new OpenAIProvider({
    apiKey,
    apiBase: OPENROUTER_BASE_URL,
    isOpenRouter: true,
  });
}
