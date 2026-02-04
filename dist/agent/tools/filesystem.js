/**
 * File system tool implementation.
 */
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
/**
 * Expand ~ to home directory.
 */
function expandPath(path) {
    if (path.startsWith('~')) {
        return join(homedir(), path.slice(1));
    }
    return path;
}
/**
 * Tool to read file contents.
 */
export const readFileTool = {
    name: 'read_file',
    description: 'Read the contents of a file at the given path.',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The file path to read',
            },
        },
        required: ['path'],
    },
    async execute(params) {
        const path = params['path'];
        if (typeof path !== 'string') {
            return 'Error: path must be a string';
        }
        try {
            const filePath = expandPath(path);
            const stats = await stat(filePath);
            if (!stats.isFile()) {
                return `Error: Not a file: ${path}`;
            }
            const content = await readFile(filePath, 'utf-8');
            return content;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return `Error: File not found: ${path}`;
            }
            if (error.code === 'EACCES') {
                return `Error: Permission denied: ${path}`;
            }
            const message = error instanceof Error ? error.message : String(error);
            return `Error reading file: ${message}`;
        }
    },
};
/**
 * Tool to write content to a file.
 */
export const writeFileTool = {
    name: 'write_file',
    description: 'Write content to a file at the given path. Creates parent directories if needed.',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The file path to write to',
            },
            content: {
                type: 'string',
                description: 'The content to write',
            },
        },
        required: ['path', 'content'],
    },
    async execute(params) {
        const path = params['path'];
        const content = params['content'];
        if (typeof path !== 'string') {
            return 'Error: path must be a string';
        }
        if (typeof content !== 'string') {
            return 'Error: content must be a string';
        }
        try {
            const filePath = expandPath(path);
            await mkdir(dirname(filePath), { recursive: true });
            await writeFile(filePath, content, 'utf-8');
            return `Successfully wrote ${content.length} bytes to ${path}`;
        }
        catch (error) {
            if (error.code === 'EACCES') {
                return `Error: Permission denied: ${path}`;
            }
            const message = error instanceof Error ? error.message : String(error);
            return `Error writing file: ${message}`;
        }
    },
};
/**
 * Tool to edit a file by replacing text.
 */
export const editFileTool = {
    name: 'edit_file',
    description: 'Edit a file by replacing old_text with new_text. The old_text must exist exactly in the file.',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The file path to edit',
            },
            old_text: {
                type: 'string',
                description: 'The exact text to find and replace',
            },
            new_text: {
                type: 'string',
                description: 'The text to replace with',
            },
        },
        required: ['path', 'old_text', 'new_text'],
    },
    async execute(params) {
        const path = params['path'];
        const oldText = params['old_text'];
        const newText = params['new_text'];
        if (typeof path !== 'string') {
            return 'Error: path must be a string';
        }
        if (typeof oldText !== 'string') {
            return 'Error: old_text must be a string';
        }
        if (typeof newText !== 'string') {
            return 'Error: new_text must be a string';
        }
        try {
            const filePath = expandPath(path);
            const content = await readFile(filePath, 'utf-8');
            if (!content.includes(oldText)) {
                return 'Error: old_text not found in file. Make sure it matches exactly.';
            }
            // Count occurrences
            const count = content.split(oldText).length - 1;
            if (count > 1) {
                return `Warning: old_text appears ${count} times. Please provide more context to make it unique.`;
            }
            const newContent = content.replace(oldText, newText);
            await writeFile(filePath, newContent, 'utf-8');
            return `Successfully edited ${path}`;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return `Error: File not found: ${path}`;
            }
            if (error.code === 'EACCES') {
                return `Error: Permission denied: ${path}`;
            }
            const message = error instanceof Error ? error.message : String(error);
            return `Error editing file: ${message}`;
        }
    },
};
/**
 * Tool to list directory contents.
 */
export const listDirTool = {
    name: 'list_dir',
    description: 'List the contents of a directory.',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The directory path to list',
            },
        },
        required: ['path'],
    },
    async execute(params) {
        const path = params['path'];
        if (typeof path !== 'string') {
            return 'Error: path must be a string';
        }
        try {
            const dirPath = expandPath(path);
            const stats = await stat(dirPath);
            if (!stats.isDirectory()) {
                return `Error: Not a directory: ${path}`;
            }
            const entries = await readdir(dirPath, { withFileTypes: true });
            if (entries.length === 0) {
                return `Directory ${path} is empty`;
            }
            const items = entries
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((entry) => {
                const prefix = entry.isDirectory() ? '[DIR]' : '[FILE]';
                return `${prefix} ${entry.name}`;
            });
            return items.join('\n');
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return `Error: Directory not found: ${path}`;
            }
            if (error.code === 'EACCES') {
                return `Error: Permission denied: ${path}`;
            }
            const message = error instanceof Error ? error.message : String(error);
            return `Error listing directory: ${message}`;
        }
    },
};
/**
 * All filesystem tools.
 */
export const filesystemTools = [
    readFileTool,
    writeFileTool,
    editFileTool,
    listDirTool,
];
//# sourceMappingURL=filesystem.js.map