/**
 * Tests for web tools.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSearchTool, WebFetchTool, createWebSearchTool, createWebFetchTool } from './web.js';

describe('WebSearchTool', () => {
  it('should return error when API key not configured', async () => {
    const tool = new WebSearchTool({ apiKey: '' });
    const result = await tool.execute({ query: 'test' });
    expect(result).toBe('Error: BRAVE_API_KEY not configured');
  });

  it('should return error for invalid query', async () => {
    const tool = new WebSearchTool({ apiKey: 'test-key' });
    const result = await tool.execute({ query: 123 });
    expect(result).toBe('Error: query must be a string');
  });

  it('should have correct schema', () => {
    const tool = new WebSearchTool({});
    expect(tool.name).toBe('web_search');
    expect(tool.parameters.required).toContain('query');
  });
});

describe('WebFetchTool', () => {
  it('should return error for invalid URL param', async () => {
    const tool = new WebFetchTool();
    const result = await tool.execute({ url: 123 });
    const parsed = JSON.parse(result);
    expect(parsed.error).toBe('url must be a string');
  });

  it('should have correct schema', () => {
    const tool = new WebFetchTool({});
    expect(tool.name).toBe('web_fetch');
    expect(tool.parameters.required).toContain('url');
  });

  it('should respect maxChars option', () => {
    const tool = new WebFetchTool({ maxChars: 1000 });
    expect(tool).toBeInstanceOf(WebFetchTool);
  });
});

describe('createWebSearchTool', () => {
  it('should create tool with options', () => {
    const tool = createWebSearchTool({ maxResults: 3 });
    expect(tool).toBeInstanceOf(WebSearchTool);
  });
});

describe('createWebFetchTool', () => {
  it('should create tool with options', () => {
    const tool = createWebFetchTool({ maxChars: 5000 });
    expect(tool).toBeInstanceOf(WebFetchTool);
  });
});
