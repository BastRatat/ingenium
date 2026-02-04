/**
 * Web tool implementation.
 */

import type { ToolParameters } from './base.js';
import { BaseTool } from './base.js';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import he from 'he';

/**
 * User agent string for web requests.
 */
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36';

/**
 * Remove HTML tags and decode entities.
 */
function stripTags(text: string): string {
  // Remove script and style tags
  let result = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove all other tags
  result = result.replace(/<[^>]+>/g, '');
  // Decode all HTML entities using the 'he' library
  result = he.decode(result);
  return result.trim();
}

/**
 * Normalize whitespace.
 */
function normalize(text: string): string {
  let result = text.replace(/[ \t]+/g, ' ');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

/**
 * Convert HTML to basic markdown.
 */
function htmlToMarkdown(html: string): string {
  let text = html;

  // Convert links
  text = text.replace(
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, url, linkText) => `[${stripTags(linkText)}](${url})`
  );

  // Convert headings
  text = text.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, level, content) => `\n${'#'.repeat(parseInt(level, 10))} ${stripTags(content)}\n`
  );

  // Convert list items
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => `\n- ${stripTags(content)}`);

  // Convert breaks
  text = text.replace(/<\/(p|div|section|article)>/gi, '\n\n');
  text = text.replace(/<(br|hr)\s*\/?>/gi, '\n');

  return normalize(stripTags(text));
}

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
export class WebSearchTool extends BaseTool {
  readonly name = 'web_search';
  readonly description = 'Search the web. Returns titles, URLs, and snippets.';
  readonly parameters: ToolParameters = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      count: {
        type: 'integer',
        description: 'Results (1-10)',
        minimum: 1,
        maximum: 10,
      },
    },
    required: ['query'],
  };

  private apiKey: string;
  private maxResults: number;

  constructor(options: WebSearchToolOptions = {}) {
    super();
    this.apiKey = options.apiKey ?? process.env['BRAVE_API_KEY'] ?? '';
    this.maxResults = options.maxResults ?? 5;
  }

  async execute(params: Record<string, unknown>): Promise<string> {
    const query = params['query'];
    const count = params['count'];

    if (typeof query !== 'string') {
      return 'Error: query must be a string';
    }

    if (!this.apiKey) {
      return 'Error: BRAVE_API_KEY not configured';
    }

    try {
      const n = Math.min(
        Math.max(typeof count === 'number' ? count : this.maxResults, 1),
        10
      );

      const url = new URL('https://api.search.brave.com/res/v1/web/search');
      url.searchParams.set('q', query);
      url.searchParams.set('count', String(n));

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': this.apiKey,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return `Error: Search API returned ${response.status}`;
      }

      const data = (await response.json()) as {
        web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
      };
      const results = data.web?.results ?? [];

      if (results.length === 0) {
        return `No results for: ${query}`;
      }

      const lines = [`Results for: ${query}\n`];
      results.slice(0, n).forEach((item, i) => {
        lines.push(`${i + 1}. ${item.title ?? ''}\n   ${item.url ?? ''}`);
        if (item.description) {
          lines.push(`   ${item.description}`);
        }
      });

      return lines.join('\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Error: ${message}`;
    }
  }
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
export class WebFetchTool extends BaseTool {
  readonly name = 'web_fetch';
  readonly description =
    'Fetch URL and extract readable content (HTML to markdown/text).';
  readonly parameters: ToolParameters = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to fetch',
      },
      extractMode: {
        type: 'string',
        enum: ['markdown', 'text'],
        default: 'markdown',
      },
      maxChars: {
        type: 'integer',
        minimum: 100,
      },
    },
    required: ['url'],
  };

  private maxChars: number;

  constructor(options: WebFetchToolOptions = {}) {
    super();
    this.maxChars = options.maxChars ?? 50000;
  }

  async execute(params: Record<string, unknown>): Promise<string> {
    const url = params['url'];
    const extractMode = params['extractMode'] ?? 'markdown';
    const maxCharsParam = params['maxChars'];

    if (typeof url !== 'string') {
      return JSON.stringify({ error: 'url must be a string', url: '' });
    }

    const maxChars =
      typeof maxCharsParam === 'number' ? maxCharsParam : this.maxChars;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        return JSON.stringify({
          error: `HTTP ${response.status}`,
          url,
        });
      }

      const contentType = response.headers.get('content-type') ?? '';
      const body = await response.text();

      let text: string;
      let extractor: string;

      if (contentType.includes('application/json')) {
        // JSON response
        try {
          text = JSON.stringify(JSON.parse(body), null, 2);
          extractor = 'json';
        } catch {
          text = body;
          extractor = 'raw';
        }
      } else if (
        contentType.includes('text/html') ||
        body.slice(0, 256).toLowerCase().startsWith('<!doctype') ||
        body.slice(0, 256).toLowerCase().startsWith('<html')
      ) {
        // HTML response - try Readability first, fall back to simple extraction
        try {
          const dom = new JSDOM(body, { url });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();

          if (article && article.textContent) {
            text = extractMode === 'markdown'
              ? htmlToMarkdown(article.content ?? '')
              : article.textContent;
            extractor = 'readability';
          } else {
            // Fallback to simple extraction
            if (extractMode === 'markdown') {
              text = htmlToMarkdown(body);
            } else {
              text = stripTags(body);
            }
            extractor = 'simple';
          }
        } catch {
          // Fallback to simple extraction on error
          if (extractMode === 'markdown') {
            text = htmlToMarkdown(body);
          } else {
            text = stripTags(body);
          }
          extractor = 'simple';
        }
      } else {
        // Raw text
        text = body;
        extractor = 'raw';
      }

      const truncated = text.length > maxChars;
      if (truncated) {
        text = text.slice(0, maxChars);
      }

      return JSON.stringify({
        url,
        finalUrl: response.url,
        status: response.status,
        extractor,
        truncated,
        length: text.length,
        text,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ error: message, url });
    }
  }
}

/**
 * Create a web search tool.
 */
export function createWebSearchTool(options?: WebSearchToolOptions): WebSearchTool {
  return new WebSearchTool(options);
}

/**
 * Create a web fetch tool.
 */
export function createWebFetchTool(options?: WebFetchToolOptions): WebFetchTool {
  return new WebFetchTool(options);
}

/**
 * All web tools.
 */
export const webTools = [new WebSearchTool(), new WebFetchTool()];
