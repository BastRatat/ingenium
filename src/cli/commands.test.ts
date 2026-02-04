/**
 * Tests for CLI commands.
 */

import { describe, it, expect } from 'vitest';
import { buildProgram } from './commands.js';

describe('CLI', () => {
  describe('buildProgram', () => {
    it('should create a commander program', () => {
      const program = buildProgram();
      expect(program).toBeDefined();
      expect(program.name()).toBe('ingenium');
    });

    it('should have onboard command', () => {
      const program = buildProgram();
      const commands = program.commands.map((c) => c.name());
      expect(commands).toContain('onboard');
    });

    it('should have gateway command', () => {
      const program = buildProgram();
      const commands = program.commands.map((c) => c.name());
      expect(commands).toContain('gateway');
    });

    it('should have agent command', () => {
      const program = buildProgram();
      const commands = program.commands.map((c) => c.name());
      expect(commands).toContain('agent');
    });

    it('should have status command', () => {
      const program = buildProgram();
      const commands = program.commands.map((c) => c.name());
      expect(commands).toContain('status');
    });

    it('should have channels subcommand', () => {
      const program = buildProgram();
      const commands = program.commands.map((c) => c.name());
      expect(commands).toContain('channels');
    });

    it('should have cron subcommand', () => {
      const program = buildProgram();
      const commands = program.commands.map((c) => c.name());
      expect(commands).toContain('cron');
    });
  });

  describe('gateway command', () => {
    it('should have port option with default', () => {
      const program = buildProgram();
      const gateway = program.commands.find((c) => c.name() === 'gateway');
      expect(gateway).toBeDefined();

      const portOption = gateway?.options.find((o) => o.long === '--port');
      expect(portOption).toBeDefined();
      expect(portOption?.defaultValue).toBe('18790');
    });

    it('should have verbose option', () => {
      const program = buildProgram();
      const gateway = program.commands.find((c) => c.name() === 'gateway');

      const verboseOption = gateway?.options.find((o) => o.long === '--verbose');
      expect(verboseOption).toBeDefined();
    });
  });

  describe('agent command', () => {
    it('should have message option', () => {
      const program = buildProgram();
      const agent = program.commands.find((c) => c.name() === 'agent');
      expect(agent).toBeDefined();

      const messageOption = agent?.options.find((o) => o.long === '--message');
      expect(messageOption).toBeDefined();
    });

    it('should have session option with default', () => {
      const program = buildProgram();
      const agent = program.commands.find((c) => c.name() === 'agent');

      const sessionOption = agent?.options.find((o) => o.long === '--session');
      expect(sessionOption).toBeDefined();
      expect(sessionOption?.defaultValue).toBe('cli:default');
    });
  });

  describe('channels subcommands', () => {
    it('should have status subcommand', () => {
      const program = buildProgram();
      const channels = program.commands.find((c) => c.name() === 'channels');
      expect(channels).toBeDefined();

      const subcommands = channels?.commands.map((c) => c.name());
      expect(subcommands).toContain('status');
    });
  });

  describe('cron subcommands', () => {
    it('should have list subcommand', () => {
      const program = buildProgram();
      const cron = program.commands.find((c) => c.name() === 'cron');
      expect(cron).toBeDefined();

      const subcommands = cron?.commands.map((c) => c.name());
      expect(subcommands).toContain('list');
    });

    it('should have add subcommand', () => {
      const program = buildProgram();
      const cron = program.commands.find((c) => c.name() === 'cron');

      const subcommands = cron?.commands.map((c) => c.name());
      expect(subcommands).toContain('add');
    });

    it('should have remove subcommand', () => {
      const program = buildProgram();
      const cron = program.commands.find((c) => c.name() === 'cron');

      const subcommands = cron?.commands.map((c) => c.name());
      expect(subcommands).toContain('remove');
    });

    it('should have enable subcommand', () => {
      const program = buildProgram();
      const cron = program.commands.find((c) => c.name() === 'cron');

      const subcommands = cron?.commands.map((c) => c.name());
      expect(subcommands).toContain('enable');
    });

    it('should have run subcommand', () => {
      const program = buildProgram();
      const cron = program.commands.find((c) => c.name() === 'cron');

      const subcommands = cron?.commands.map((c) => c.name());
      expect(subcommands).toContain('run');
    });
  });
});
