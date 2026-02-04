/**
 * Base LLM provider abstraction.
 */
/**
 * Check if response contains tool calls.
 */
export function hasToolCalls(response) {
    return response.toolCalls.length > 0;
}
/**
 * Create an empty LLM response.
 */
export function createEmptyResponse(content = null, finishReason = 'stop') {
    return {
        content,
        toolCalls: [],
        finishReason,
        usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
        },
    };
}
//# sourceMappingURL=base.js.map