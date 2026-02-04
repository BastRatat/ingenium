/**
 * Base class for agent tools.
 */
/**
 * Convert a tool to OpenAI function schema format.
 */
export function toolToSchema(tool) {
    return {
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
        },
    };
}
/**
 * Base class for tools that need mutable state.
 */
export class BaseTool {
    toSchema() {
        return toolToSchema(this);
    }
}
//# sourceMappingURL=base.js.map