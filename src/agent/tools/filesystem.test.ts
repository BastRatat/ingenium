/**
 * Tests for filesystem tools.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirTool,
} from './filesystem.js';

describe('filesystem tools', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ingenium-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('readFileTool', () => {
    it('should read file contents', async () => {
      const filePath = join(tempDir, 'test.txt');
      await writeFile(filePath, 'Hello, World!', 'utf-8');

      const result = await readFileTool.execute({ path: filePath });
      expect(result).toBe('Hello, World!');
    });

    it('should return error for non-existent file', async () => {
      const result = await readFileTool.execute({
        path: join(tempDir, 'nonexistent.txt'),
      });
      expect(result).toContain('Error: File not found');
    });

    it('should return error for directory', async () => {
      const result = await readFileTool.execute({ path: tempDir });
      expect(result).toContain('Error: Not a file');
    });

    it('should return error for invalid path type', async () => {
      const result = await readFileTool.execute({ path: 123 });
      expect(result).toBe('Error: path must be a string');
    });
  });

  describe('writeFileTool', () => {
    it('should write file contents', async () => {
      const filePath = join(tempDir, 'output.txt');
      const result = await writeFileTool.execute({
        path: filePath,
        content: 'Test content',
      });

      expect(result).toContain('Successfully wrote');
      expect(result).toContain('12 bytes');
    });

    it('should create parent directories', async () => {
      const filePath = join(tempDir, 'nested', 'dir', 'file.txt');
      const result = await writeFileTool.execute({
        path: filePath,
        content: 'Nested content',
      });

      expect(result).toContain('Successfully wrote');
    });

    it('should return error for invalid params', async () => {
      const result = await writeFileTool.execute({ path: 123 });
      expect(result).toBe('Error: path must be a string');
    });
  });

  describe('editFileTool', () => {
    it('should replace text in file', async () => {
      const filePath = join(tempDir, 'edit.txt');
      await writeFile(filePath, 'Hello, World!', 'utf-8');

      const result = await editFileTool.execute({
        path: filePath,
        old_text: 'World',
        new_text: 'TypeScript',
      });

      expect(result).toContain('Successfully edited');
    });

    it('should return error when old_text not found', async () => {
      const filePath = join(tempDir, 'edit.txt');
      await writeFile(filePath, 'Hello, World!', 'utf-8');

      const result = await editFileTool.execute({
        path: filePath,
        old_text: 'NotFound',
        new_text: 'Replacement',
      });

      expect(result).toContain('old_text not found');
    });

    it('should warn when old_text appears multiple times', async () => {
      const filePath = join(tempDir, 'edit.txt');
      await writeFile(filePath, 'foo bar foo', 'utf-8');

      const result = await editFileTool.execute({
        path: filePath,
        old_text: 'foo',
        new_text: 'baz',
      });

      expect(result).toContain('appears 2 times');
    });

    it('should return error for non-existent file', async () => {
      const result = await editFileTool.execute({
        path: join(tempDir, 'nonexistent.txt'),
        old_text: 'a',
        new_text: 'b',
      });

      expect(result).toContain('Error: File not found');
    });
  });

  describe('listDirTool', () => {
    it('should list directory contents', async () => {
      await writeFile(join(tempDir, 'file1.txt'), 'content', 'utf-8');
      await writeFile(join(tempDir, 'file2.txt'), 'content', 'utf-8');
      await mkdir(join(tempDir, 'subdir'));

      const result = await listDirTool.execute({ path: tempDir });

      expect(result).toContain('[FILE] file1.txt');
      expect(result).toContain('[FILE] file2.txt');
      expect(result).toContain('[DIR] subdir');
    });

    it('should return message for empty directory', async () => {
      const emptyDir = join(tempDir, 'empty');
      await mkdir(emptyDir);

      const result = await listDirTool.execute({ path: emptyDir });
      expect(result).toContain('is empty');
    });

    it('should return error for non-existent directory', async () => {
      const result = await listDirTool.execute({
        path: join(tempDir, 'nonexistent'),
      });
      expect(result).toContain('Error: Directory not found');
    });

    it('should return error for file path', async () => {
      const filePath = join(tempDir, 'file.txt');
      await writeFile(filePath, 'content', 'utf-8');

      const result = await listDirTool.execute({ path: filePath });
      expect(result).toContain('Error: Not a directory');
    });
  });
});
