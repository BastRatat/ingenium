/**
 * Shell execution tool implementation.
 */
import { spawn } from 'node:child_process';
import { BaseTool } from './base.js';
/**
 * Execute a shell command and return output.
 */
async function executeCommand(command, options) {
    const { cwd, timeout = 60000, maxOutputLength = 10000 } = options;
    return new Promise((resolve) => {
        const child = spawn(command, {
            shell: true,
            cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        let killed = false;
        const timer = setTimeout(() => {
            killed = true;
            child.kill('SIGKILL');
        }, timeout);
        child.stdout?.on('data', (data) => {
            stdout += data.toString('utf-8');
        });
        child.stderr?.on('data', (data) => {
            stderr += data.toString('utf-8');
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (killed) {
                resolve(`Error: Command timed out after ${timeout / 1000} seconds`);
                return;
            }
            const parts = [];
            if (stdout) {
                parts.push(stdout);
            }
            if (stderr.trim()) {
                parts.push(`STDERR:\n${stderr}`);
            }
            if (code !== 0 && code !== null) {
                parts.push(`\nExit code: ${code}`);
            }
            let result = parts.length > 0 ? parts.join('\n') : '(no output)';
            if (result.length > maxOutputLength) {
                const truncated = result.length - maxOutputLength;
                result = `${result.slice(0, maxOutputLength)}\n... (truncated, ${truncated} more chars)`;
            }
            resolve(result);
        });
        child.on('error', (error) => {
            clearTimeout(timer);
            resolve(`Error executing command: ${error.message}`);
        });
    });
}
/**
 * Tool to execute shell commands.
 */
export class ExecTool extends BaseTool {
    name = 'exec';
    description = 'Execute a shell command and return its output. Use with caution.';
    parameters = {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The shell command to execute',
            },
            working_dir: {
                type: 'string',
                description: 'Optional working directory for the command',
            },
        },
        required: ['command'],
    };
    timeout;
    workingDir;
    maxOutputLength;
    constructor(options = {}) {
        super();
        this.timeout = options.timeout ?? 60000;
        this.workingDir = options.workingDir;
        this.maxOutputLength = options.maxOutputLength ?? 10000;
    }
    async execute(params) {
        const command = params['command'];
        const workingDir = params['working_dir'];
        if (typeof command !== 'string') {
            return 'Error: command must be a string';
        }
        const cwd = typeof workingDir === 'string'
            ? workingDir
            : this.workingDir ?? process.cwd();
        return executeCommand(command, {
            cwd,
            timeout: this.timeout,
            maxOutputLength: this.maxOutputLength,
        });
    }
}
/**
 * Create an exec tool with default options.
 */
export function createExecTool(options) {
    return new ExecTool(options);
}
//# sourceMappingURL=shell.js.map