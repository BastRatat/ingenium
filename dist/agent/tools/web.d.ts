/**
 * Web tool implementation.
 */
import type { ToolParameters } from './base.js';
import { BaseTool } from './base.js';
/**
 * Options for web search tool.
 */
export interface WebSearchToolOptions {
    /**
     * Brave Search API key.
     */
    apiKey?: string;
    /**
     * Maximum number of results to return.
     */
    maxResults?: number;
}
/**
 * Search the web using Brave Search API.
 */
export declare class WebSearchTool extends BaseTool {
    readonly name = "web_search";
    readonly description = "Search the web. Returns titles, URLs, and snippets.";
    readonly parameters: ToolParameters;
    private apiKey;
    private maxResults;
    constructor(options?: WebSearchToolOptions);
    execute(params: Record<string, unknown>): Promise<string>;
}
/**
 * Options for web fetch tool.
 */
export interface WebFetchToolOptions {
    /**
     * Maximum characters to return.
     */
    maxChars?: number;
}
/**
 * Fetch and extract content from a URL.
 */
export declare class WebFetchTool extends BaseTool {
    readonly name = "web_fetch";
    readonly description = "Fetch URL and extract readable content (HTML to markdown/text).";
    readonly parameters: ToolParameters;
    private maxChars;
    constructor(options?: WebFetchToolOptions);
    execute(params: Record<string, unknown>): Promise<string>;
}
/**
 * Create a web search tool.
 */
export declare function createWebSearchTool(options?: WebSearchToolOptions): WebSearchTool;
/**
 * Create a web fetch tool.
 */
export declare function createWebFetchTool(options?: WebFetchToolOptions): WebFetchTool;
/**
 * All web tools.
 */
export declare const webTools: (WebSearchTool | WebFetchTool)[];
//# sourceMappingURL=web.d.ts.map