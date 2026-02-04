/**
 * CLI commands for ingenium.
 */

import { Command } from 'commander';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig, saveConfig, getConfigPath, getDataDir } from '../config/loader.js';
import { createDefaultConfig, getWorkspacePathFromConfig, getApiKey } from '../config/schema.js';
import { getWorkspacePath } from '../utils/helpers.js';
import { MessageBus } from '../bus/queue.js';
import { createProviderFromConfig } from '../providers/factory.js';
import { AgentLoop } from '../agent/loop.js';
import { ChannelManager } from '../channels/manager.js';
import { CronService } from '../cron/service.js';
import { HeartbeatService } from '../heartbeat/service.js';
import type { CronJob, CronSchedule } from '../cron/types.js';

const VERSION = '1.0.0';
const LOGO = '🤖';

/**
 * Create workspace template files.
 */
async function createWorkspaceTemplates(workspace: string): Promise<void> {
  const templates: Record<string, string> = {
    'AGENTS.md': `# Agent Instructions

You are a helpful AI assistant. Be concise, accurate, and friendly.

## Guidelines

- Always explain what you're doing before taking actions
- Ask for clarification when the request is ambiguous
- Use tools to help accomplish tasks
- Remember important information in your memory files
`,
    'SOUL.md': `# Soul

I am ingenium, a lightweight AI assistant.

## Personality

- Helpful and friendly
- Concise and to the point
- Curious and eager to learn

## Values

- Accuracy over speed
- User privacy and safety
- Transparency in actions
`,
    'USER.md': `# User

Information about the user goes here.

## Preferences

- Communication style: (casual/formal)
- Timezone: (your timezone)
- Language: (your preferred language)
`,
  };

  for (const [filename, content] of Object.entries(templates)) {
    const filePath = join(workspace, filename);
    if (!existsSync(filePath)) {
      await writeFile(filePath, content, 'utf-8');
      console.log(`  Created ${filename}`);
    }
  }

  // Create memory directory and MEMORY.md
  const memoryDir = join(workspace, 'memory');
  await mkdir(memoryDir, { recursive: true });
  const memoryFile = join(memoryDir, 'MEMORY.md');
  if (!existsSync(memoryFile)) {
    await writeFile(
      memoryFile,
      `# Long-term Memory

This file stores important information that should persist across sessions.

## User Information

(Important facts about the user)

## Preferences

(User preferences learned over time)

## Important Notes

(Things to remember)
`,
      'utf-8'
    );
    console.log('  Created memory/MEMORY.md');
  }

  // Create skills directory
  const skillsDir = join(workspace, 'skills');
  await mkdir(skillsDir, { recursive: true });
}

/**
 * Onboard command - Initialize ingenium configuration and workspace.
 */
async function onboardCommand(): Promise<void> {
  const configPath = getConfigPath();

  if (existsSync(configPath)) {
    console.log(`Config already exists at ${configPath}`);
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Overwrite? (y/N) ', (ans) => {
        rl.close();
        resolve(ans);
      });
    });

    if (answer.toLowerCase() !== 'y') {
      console.log('Aborted.');
      return;
    }
  }

  // Create default config
  const config = createDefaultConfig();
  await saveConfig(config);
  console.log(`✓ Created config at ${configPath}`);

  // Create workspace
  const workspace = getWorkspacePath();
  await mkdir(workspace, { recursive: true });
  console.log(`✓ Created workspace at ${workspace}`);

  // Create default bootstrap files
  await createWorkspaceTemplates(workspace);

  console.log(`\n${LOGO} ingenium is ready!`);
  console.log('\nNext steps:');
  console.log('  1. Add your API key to ~/.ingenium/config.json');
  console.log('     Get one at: https://openrouter.ai/keys');
  console.log('  2. Chat: ingenium agent -m "Hello!"');
}

/**
 * Gateway command - Start the ingenium gateway.
 */
async function gatewayCommand(options: {
  port: string;
  verbose: boolean;
}): Promise<void> {
  const port = parseInt(options.port, 10);
  console.log(`${LOGO} Starting ingenium gateway on port ${port}...`);

  const config = await loadConfig();

  // Check for API key
  const apiKey = getApiKey(config);
  if (!apiKey) {
    console.error('Error: No API key configured.');
    console.error('Set one in ~/.ingenium/config.json under providers.openrouter.apiKey');
    process.exit(1);
  }

  // Create components
  const bus = new MessageBus();

  // Create provider
  const provider = createProviderFromConfig(config);
  if (!provider) {
    console.error('Error: Could not create LLM provider.');
    process.exit(1);
  }

  const workspace = getWorkspacePathFromConfig(config);

  // Create agent
  const agentOptions: {
    bus: MessageBus;
    provider: typeof provider;
    workspace: string;
    model: string;
    maxIterations: number;
    braveApiKey?: string;
  } = {
    bus,
    provider,
    workspace,
    model: config.agents.defaults.model,
    maxIterations: config.agents.defaults.maxToolIterations,
  };
  const braveKey = config.tools.web.search.apiKey;
  if (braveKey) {
    agentOptions.braveApiKey = braveKey;
  }
  const agent = new AgentLoop(agentOptions);

  // Create cron service
  const cronStorePath = join(getDataDir(), 'cron', 'jobs.json');
  const cronJobCallback = async (job: CronJob): Promise<string | null> => {
    const response = await agent.processDirect(job.payload.message, `cron:${job.id}`);
    // Optionally deliver to channel
    if (job.payload.deliver && job.payload.to) {
      await bus.publishOutbound({
        channel: job.payload.channel ?? 'whatsapp',
        chatId: job.payload.to,
        content: response || '',
      });
    }
    return response;
  };

  const cron = new CronService({
    storePath: cronStorePath,
    onJob: cronJobCallback,
  });

  // Create heartbeat service
  const heartbeatCallback = async (prompt: string): Promise<string> => {
    return agent.processDirect(prompt, 'heartbeat');
  };

  const heartbeat = new HeartbeatService({
    workspace,
    onHeartbeat: heartbeatCallback,
    intervalMs: 30 * 60 * 1000, // 30 minutes
    enabled: true,
  });

  // Create channel manager
  const channels = new ChannelManager(config, bus);

  if (channels.enabledChannels.length > 0) {
    console.log(`✓ Channels enabled: ${channels.enabledChannels.join(', ')}`);
  } else {
    console.log('Warning: No channels enabled');
  }

  const cronStatus = cron.status();
  if (cronStatus.jobs > 0) {
    console.log(`✓ Cron: ${cronStatus.jobs} scheduled jobs`);
  }

  console.log('✓ Heartbeat: every 30m');

  // Handle shutdown
  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\nShutting down...');
    heartbeat.stop();
    cron.stop();
    agent.stop();
    await channels.stopAll();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  // Start services
  await cron.start();
  await heartbeat.start();

  // Run agent and channels (these block)
  await Promise.all([agent.run(), channels.startAll()]);
}

/**
 * Agent command - Interact with the agent directly.
 */
async function agentCommand(options: {
  message?: string;
  session: string;
}): Promise<void> {
  const config = await loadConfig();

  const apiKey = getApiKey(config);
  if (!apiKey) {
    console.error('Error: No API key configured.');
    process.exit(1);
  }

  const bus = new MessageBus();
  const provider = createProviderFromConfig(config);
  if (!provider) {
    console.error('Error: Could not create LLM provider.');
    process.exit(1);
  }

  const workspace = getWorkspacePathFromConfig(config);

  const agentOpts: {
    bus: MessageBus;
    provider: typeof provider;
    workspace: string;
    braveApiKey?: string;
  } = {
    bus,
    provider,
    workspace,
  };
  const agentBraveKey = config.tools.web.search.apiKey;
  if (agentBraveKey) {
    agentOpts.braveApiKey = agentBraveKey;
  }
  const agent = new AgentLoop(agentOpts);

  if (options.message) {
    // Single message mode
    const response = await agent.processDirect(options.message, options.session);
    console.log(`\n${LOGO} ${response}`);
  } else {
    // Interactive mode
    console.log(`${LOGO} Interactive mode (Ctrl+C to exit)\n`);

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = (): void => {
      rl.question('You: ', async (input) => {
        const trimmed = input.trim();
        if (trimmed === '') {
          prompt();
          return;
        }

        try {
          const response = await agent.processDirect(trimmed, options.session);
          console.log(`\n${LOGO} ${response}\n`);
        } catch (error) {
          console.error('Error:', error instanceof Error ? error.message : String(error));
        }

        prompt();
      });
    };

    prompt();

    // Handle exit
    rl.on('close', () => {
      console.log('\nGoodbye!');
      process.exit(0);
    });
  }
}

/**
 * Status command - Show ingenium status.
 */
async function statusCommand(): Promise<void> {
  const configPath = getConfigPath();
  const workspace = getWorkspacePath();

  console.log(`${LOGO} ingenium Status\n`);

  const configExists = existsSync(configPath);
  console.log(`Config: ${configPath} ${configExists ? '✓' : '✗'}`);

  const workspaceExists = existsSync(workspace);
  console.log(`Workspace: ${workspace} ${workspaceExists ? '✓' : '✗'}`);

  if (configExists) {
    const config = await loadConfig();
    console.log(`Model: ${config.agents.defaults.model}`);

    // Check API keys
    const hasOpenrouter = Boolean(config.providers.openrouter.apiKey);
    const hasAnthropic = Boolean(config.providers.anthropic.apiKey);
    const hasOpenai = Boolean(config.providers.openai.apiKey);
    const hasGemini = Boolean(config.providers.gemini.apiKey);
    const hasVllm = Boolean(config.providers.vllm.apiBase);

    console.log(`OpenRouter API: ${hasOpenrouter ? '✓' : 'not set'}`);
    console.log(`Anthropic API: ${hasAnthropic ? '✓' : 'not set'}`);
    console.log(`OpenAI API: ${hasOpenai ? '✓' : 'not set'}`);
    console.log(`Gemini API: ${hasGemini ? '✓' : 'not set'}`);
    const vllmStatus = hasVllm ? `✓ ${config.providers.vllm.apiBase}` : 'not set';
    console.log(`vLLM/Local: ${vllmStatus}`);
  }
}

/**
 * Channels status command.
 */
async function channelsStatusCommand(): Promise<void> {
  const config = await loadConfig();

  console.log('Channel Status\n');
  console.log('Channel    Enabled    Bridge URL');
  console.log('─'.repeat(50));

  const wa = config.channels.whatsapp;
  console.log(`WhatsApp   ${wa.enabled ? '✓' : '✗'}          ${wa.bridgeUrl}`);

  const tg = config.channels.telegram;
  console.log(`Telegram   ${tg.enabled ? '✓' : '✗'}          (bot token)`);
}

/**
 * Cron list command.
 */
async function cronListCommand(options: { all: boolean }): Promise<void> {
  const storePath = join(getDataDir(), 'cron', 'jobs.json');
  const service = new CronService({ storePath });

  const jobs = await service.listJobs(options.all);

  if (jobs.length === 0) {
    console.log('No scheduled jobs.');
    return;
  }

  console.log('Scheduled Jobs\n');
  console.log('ID        Name                Schedule         Status    Next Run');
  console.log('─'.repeat(75));

  for (const job of jobs) {
    let scheduleStr: string;
    if (job.schedule.kind === 'every') {
      const seconds = (job.schedule.everyMs ?? 0) / 1000;
      scheduleStr = `every ${seconds}s`;
    } else if (job.schedule.kind === 'cron') {
      scheduleStr = job.schedule.expr ?? '';
    } else {
      scheduleStr = 'one-time';
    }

    let nextRun = '';
    if (job.state.nextRunAtMs) {
      const date = new Date(job.state.nextRunAtMs);
      nextRun = date.toISOString().slice(0, 16).replace('T', ' ');
    }

    const status = job.enabled ? 'enabled' : 'disabled';
    const name = job.name.slice(0, 18).padEnd(18);
    const sched = scheduleStr.slice(0, 16).padEnd(16);

    console.log(`${job.id.padEnd(10)}${name}${sched}${status.padEnd(10)}${nextRun}`);
  }
}

/**
 * Cron add command.
 */
async function cronAddCommand(options: {
  name: string;
  message: string;
  every?: string;
  cron?: string;
  at?: string;
  deliver: boolean;
  to?: string;
  channel?: string;
}): Promise<void> {
  let schedule: CronSchedule;

  if (options.every) {
    const seconds = parseInt(options.every, 10);
    schedule = { kind: 'every', everyMs: seconds * 1000 };
  } else if (options.cron) {
    schedule = { kind: 'cron', expr: options.cron };
  } else if (options.at) {
    const date = new Date(options.at);
    schedule = { kind: 'at', atMs: date.getTime() };
  } else {
    console.error('Error: Must specify --every, --cron, or --at');
    process.exit(1);
  }

  const storePath = join(getDataDir(), 'cron', 'jobs.json');
  const service = new CronService({ storePath });

  const jobOptions: {
    name: string;
    schedule: CronSchedule;
    message: string;
    deliver?: boolean;
    to?: string;
    channel?: string;
  } = {
    name: options.name,
    schedule,
    message: options.message,
  };

  if (options.deliver) {
    jobOptions.deliver = true;
  }
  if (options.to !== undefined) {
    jobOptions.to = options.to;
  }
  if (options.channel !== undefined) {
    jobOptions.channel = options.channel;
  }

  const job = await service.addJob(jobOptions);
  console.log(`✓ Added job '${job.name}' (${job.id})`);
}

/**
 * Cron remove command.
 */
async function cronRemoveCommand(jobId: string): Promise<void> {
  const storePath = join(getDataDir(), 'cron', 'jobs.json');
  const service = new CronService({ storePath });

  const removed = await service.removeJob(jobId);
  if (removed) {
    console.log(`✓ Removed job ${jobId}`);
  } else {
    console.error(`Job ${jobId} not found`);
    process.exit(1);
  }
}

/**
 * Cron enable command.
 */
async function cronEnableCommand(
  jobId: string,
  options: { disable: boolean }
): Promise<void> {
  const storePath = join(getDataDir(), 'cron', 'jobs.json');
  const service = new CronService({ storePath });

  const enabled = !options.disable;
  const job = await service.enableJob(jobId, enabled);

  if (job) {
    const status = enabled ? 'enabled' : 'disabled';
    console.log(`✓ Job '${job.name}' ${status}`);
  } else {
    console.error(`Job ${jobId} not found`);
    process.exit(1);
  }
}

/**
 * Cron run command.
 */
async function cronRunCommand(
  jobId: string,
  options: { force: boolean }
): Promise<void> {
  const storePath = join(getDataDir(), 'cron', 'jobs.json');
  const service = new CronService({ storePath });

  const result = await service.runJob(jobId, options.force);
  if (result) {
    console.log('✓ Job executed');
  } else {
    console.error(`Failed to run job ${jobId}`);
    process.exit(1);
  }
}

/**
 * Build the CLI program.
 */
export function buildProgram(): Command {
  const program = new Command();

  program
    .name('ingenium')
    .description(`${LOGO} ingenium - Personal AI Assistant`)
    .version(VERSION, '-v, --version', 'Show version')
    .hook('preAction', () => {
      // Common setup before any command
    });

  // Onboard command
  program
    .command('onboard')
    .description('Initialize ingenium configuration and workspace')
    .action(() => void onboardCommand());

  // Gateway command
  program
    .command('gateway')
    .description('Start the ingenium gateway')
    .option('-p, --port <port>', 'Gateway port', '18790')
    .option('-v, --verbose', 'Verbose output', false)
    .action((options: { port: string; verbose: boolean }) =>
      void gatewayCommand(options)
    );

  // Agent command
  program
    .command('agent')
    .description('Interact with the agent directly')
    .option('-m, --message <message>', 'Message to send to the agent')
    .option('-s, --session <session>', 'Session ID', 'cli:default')
    .action((options: { message?: string; session: string }) =>
      void agentCommand(options)
    );

  // Status command
  program
    .command('status')
    .description('Show ingenium status')
    .action(() => void statusCommand());

  // Channels subcommands
  const channelsCmd = program.command('channels').description('Manage channels');

  channelsCmd
    .command('status')
    .description('Show channel status')
    .action(() => void channelsStatusCommand());

  // Cron subcommands
  const cronCmd = program.command('cron').description('Manage scheduled tasks');

  cronCmd
    .command('list')
    .description('List scheduled jobs')
    .option('-a, --all', 'Include disabled jobs', false)
    .action((options: { all: boolean }) => void cronListCommand(options));

  cronCmd
    .command('add')
    .description('Add a scheduled job')
    .requiredOption('-n, --name <name>', 'Job name')
    .requiredOption('-m, --message <message>', 'Message for agent')
    .option('-e, --every <seconds>', 'Run every N seconds')
    .option('-c, --cron <expr>', "Cron expression (e.g. '0 9 * * *')")
    .option('--at <time>', 'Run once at time (ISO format)')
    .option('-d, --deliver', 'Deliver response to channel', false)
    .option('--to <recipient>', 'Recipient for delivery')
    .option('--channel <channel>', "Channel for delivery (e.g. 'telegram')")
    .action(
      (options: {
        name: string;
        message: string;
        every?: string;
        cron?: string;
        at?: string;
        deliver: boolean;
        to?: string;
        channel?: string;
      }) => void cronAddCommand(options)
    );

  cronCmd
    .command('remove <jobId>')
    .description('Remove a scheduled job')
    .action((jobId: string) => void cronRemoveCommand(jobId));

  cronCmd
    .command('enable <jobId>')
    .description('Enable or disable a job')
    .option('--disable', 'Disable instead of enable', false)
    .action((jobId: string, options: { disable: boolean }) =>
      void cronEnableCommand(jobId, options)
    );

  cronCmd
    .command('run <jobId>')
    .description('Manually run a job')
    .option('-f, --force', 'Run even if disabled', false)
    .action((jobId: string, options: { force: boolean }) =>
      void cronRunCommand(jobId, options)
    );

  return program;
}

/**
 * Run the CLI.
 */
export function runCLI(): void {
  const prog = buildProgram();
  prog.parse();
}
