/**
 * Anthropic LLM provider implementation.
 */
import Anthropic from '@anthropic-ai/sdk';
import { createEmptyResponse } from './base.js';
/**
 * Default Anthropic model.
 */
const DEFAULT_MODEL = 'claude-opus-4-5-20251101';
/**
 * Convert our tool definitions to Anthropic format.
 */
function convertToolsToAnthropic(tools) {
    return tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: {
            type: 'object',
            properties: tool.function.parameters.properties,
            required: tool.function.parameters.required ?? null,
        },
    }));
}
/**
 * Convert our messages to Anthropic format, extracting system message.
 */
function convertMessagesToAnthropic(messages) {
    let system;
    const converted = [];
    for (const msg of messages) {
        if (msg.role === 'system') {
            system = msg.content;
        }
        else if (msg.role === 'tool') {
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
        }
        else if (msg.role === 'user' || msg.role === 'assistant') {
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
function parseAnthropicResponse(response) {
    const toolCalls = [];
    let textContent = null;
    for (const block of response.content) {
        if (block.type === 'text') {
            textContent = block.text;
        }
        else if (block.type === 'tool_use') {
            toolCalls.push({
                id: block.id,
                name: block.name,
                arguments: block.input,
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
export class AnthropicProvider {
    client;
    defaultModel;
    constructor(options = {}) {
        this.client = new Anthropic({
            apiKey: options.apiKey,
            baseURL: options.apiBase,
        });
        this.defaultModel = DEFAULT_MODEL;
    }
    async chat(options) {
        const model = options.model ?? this.defaultModel;
        const maxTokens = options.maxTokens ?? 4096;
        const temperature = options.temperature ?? 0.7;
        const { system, messages } = convertMessagesToAnthropic(options.messages);
        try {
            const params = {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return createEmptyResponse(`Error calling Anthropic: ${message}`, 'error');
        }
    }
    getDefaultModel() {
        return this.defaultModel;
    }
}
//# sourceMappingURL=anthropic.js.map