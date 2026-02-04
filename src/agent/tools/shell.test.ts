/**
 * Tests for shell tool.
 */

import { describe, it, expect } from 'vitest';
import { ExecTool, createExecTool } from './shell.js';

describe('ExecTool', () => {
  it('should execute simple command', async () => {
    const tool = new ExecTool();
    const result = await tool.execute({ command: 'echo "Hello"' });
    expect(result.trim()).toBe('Hello');
  });

  it('should capture stdout', async () => {
    const tool = new ExecTool();
    const result = await tool.execute({ command: 'echo "line1" && echo "line2"' });
    expect(result).toContain('line1');
    expect(result).toContain('line2');
  });

  it('should capture stderr', async () => {
    const tool = new ExecTool();
    const result = await tool.execute({ command: 'echo "error" >&2' });
    expect(result).toContain('STDERR');
    expect(result).toContain('error');
  });

  it('should report non-zero exit code', async () => {
    const tool = new ExecTool();
    const result = await tool.execute({ command: 'exit 42' });
    expect(result).toContain('Exit code: 42');
  });

  it('should use working directory', async () => {
    const tool = new ExecTool({ workingDir: '/tmp' });
    const result = await tool.execute({ command: 'pwd' });
    expect(result.trim()).toBe('/private/tmp'); // macOS resolves /tmp to /private/tmp
  });

  it('should use provided working_dir param', async () => {
    const tool = new ExecTool();
    const result = await tool.execute({ command: 'pwd', working_dir: '/tmp' });
    expect(result.trim()).toBe('/private/tmp');
  });

  it('should timeout long commands', async () => {
    const tool = new ExecTool({ timeout: 100 });
    const result = await tool.execute({ command: 'sleep 10' });
    expect(result).toContain('timed out');
  });

  it('should truncate long output', async () => {
    const tool = new ExecTool({ maxOutputLength: 50 });
    const result = await tool.execute({
      command: 'for i in $(seq 1 1000); do echo "line $i"; done',
    });
    expect(result).toContain('truncated');
  });

  it('should return error for invalid command param', async () => {
    const tool = new ExecTool();
    const result = await tool.execute({ command: 123 });
    expect(result).toBe('Error: command must be a string');
  });

  it('should have correct schema', () => {
    const tool = new ExecTool();
    expect(tool.name).toBe('exec');
    expect(tool.description).toContain('shell command');
    expect(tool.parameters.required).toContain('command');
  });
});

describe('createExecTool', () => {
  it('should create tool with options', () => {
    const tool = createExecTool({ timeout: 5000 });
    expect(tool).toBeInstanceOf(ExecTool);
  });
});
