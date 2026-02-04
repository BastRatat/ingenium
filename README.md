# ingenium

A lightweight personal AI assistant framework with multi-channel chat, tool calling, and extensible skills.

## Key Capabilities

- Chat via Telegram and WhatsApp
- Connect to multiple LLM providers (Anthropic, OpenAI, OpenRouter, Groq, Gemini, and more)
- Execute tools autonomously (file operations, shell commands, web search)
- Extend functionality with custom skills
- Persistent memory across conversations
- Scheduled tasks and periodic heartbeat

## Features

### Multi-Channel Chat
Connect to your users through Telegram and WhatsApp. Messages are processed through a unified message bus and routed to the agent.

### Multi-Provider LLM Support
Use your preferred LLM provider:
- **OpenRouter** - Access multiple models through a single API
- **Anthropic** - Claude models (default: claude-opus-4-5)
- **OpenAI** - GPT models
- **Gemini** - Google's Gemini models
- **Groq** - Fast inference
- **Zhipu** - GLM models
- **vLLM** - Self-hosted models

### Tool Calling
The agent can autonomously execute tools to accomplish tasks. Tools are executed in a loop until the task is complete or the iteration limit is reached.

### Extensible Skills
Add custom skills by placing markdown files in the workspace's `skills/` directory. Skills provide additional context and instructions for specific domains.

### Persistent Memory
The agent maintains long-term memory in markdown files, allowing it to remember user preferences and important information across sessions.

### Scheduled Tasks & Heartbeat
Schedule recurring or one-time tasks with cron expressions. The heartbeat service periodically prompts the agent based on workspace instructions.

## Quick Start

### Prerequisites

- Node.js >= 20.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ingenium.git
cd ingenium/typescript

# Install dependencies
npm install

# Build
npm run build
```

### Initialize

```bash
# Create config and workspace
npx ingenium onboard
```

This creates:
- `~/.ingenium/config.json` - Configuration file
- `~/.ingenium/workspace/` - Workspace with template files

### Configure API Key

Edit `~/.ingenium/config.json` and add your API key:

```json
{
  "providers": {
    "openrouter": {
      "apiKey": "sk-or-..."
    }
  }
}
```

Get an API key at: https://openrouter.ai/keys

### Run

```bash
# Interactive CLI
npx ingenium agent

# Single message
npx ingenium agent -m "Hello!"

# Full gateway with channels
npx ingenium gateway
```

## Configuration

Configuration is stored at `~/.ingenium/config.json`.

### Structure

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.ingenium/workspace",
      "model": "anthropic/claude-opus-4-5",
      "maxTokens": 8192,
      "temperature": 0.7,
      "maxToolIterations": 20
    }
  },
  "providers": {
    "openrouter": { "apiKey": "" },
    "anthropic": { "apiKey": "" },
    "openai": { "apiKey": "" },
    "gemini": { "apiKey": "" },
    "groq": { "apiKey": "" },
    "zhipu": { "apiKey": "" },
    "vllm": { "apiBase": "" }
  },
  "channels": {
    "telegram": {
      "enabled": false,
      "token": "",
      "allowFrom": []
    },
    "whatsapp": {
      "enabled": false,
      "bridgeUrl": "ws://localhost:3001",
      "allowFrom": []
    }
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790
  },
  "tools": {
    "web": {
      "search": {
        "apiKey": "",
        "maxResults": 5
      }
    }
  }
}
```

### Environment Variables

You can also set API keys via environment variables:
- `BRAVE_API_KEY` - For web search functionality

## CLI Commands

| Command | Description |
|---------|-------------|
| `ingenium onboard` | Initialize configuration and workspace |
| `ingenium gateway` | Start the full gateway with all services |
| `ingenium agent` | Interactive chat with the agent |
| `ingenium agent -m "..."` | Send a single message |
| `ingenium status` | Show configuration and connection status |
| `ingenium channels status` | Show channel configuration |
| `ingenium cron list` | List scheduled jobs |
| `ingenium cron add` | Add a scheduled job |
| `ingenium cron remove <id>` | Remove a scheduled job |
| `ingenium cron enable <id>` | Enable/disable a job |
| `ingenium cron run <id>` | Manually run a job |

### Cron Examples

```bash
# Run every 5 minutes
ingenium cron add -n "check-status" -m "Check system status" -e 300

# Run at 9 AM daily (cron expression)
ingenium cron add -n "morning-brief" -m "Give me a morning briefing" -c "0 9 * * *"

# Run once at a specific time
ingenium cron add -n "reminder" -m "Remind me about the meeting" --at "2024-12-01T14:00:00"

# Deliver response to Telegram
ingenium cron add -n "daily-summary" -m "Summarize today" -c "0 18 * * *" -d --to "123456789" --channel telegram
```

## Workspace Structure

The workspace (`~/.ingenium/workspace/`) contains files that shape the agent's behavior:

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent instructions and guidelines |
| `SOUL.md` | Personality and values |
| `USER.md` | User information and preferences |
| `HEARTBEAT.md` | Instructions for periodic heartbeat prompts |
| `memory/MEMORY.md` | Long-term memory storage |
| `skills/` | Custom skill definitions |

### Memory System

The agent can read and write to memory files to persist information:
- `memory/MEMORY.md` - Primary long-term memory
- Additional files can be created as needed

### Skills

Skills are markdown files in the `skills/` directory that provide domain-specific instructions. Each skill should include:
- A description of the skill's purpose
- Instructions for when to use it
- Any relevant context or commands

## Available Tools

| Tool | Description |
|------|-------------|
| `read_file` | Read contents of a file |
| `write_file` | Write content to a file (creates directories) |
| `edit_file` | Edit a file by replacing text |
| `list_dir` | List directory contents |
| `exec` | Execute shell commands |
| `web_search` | Search the web (requires Brave API key) |
| `web_fetch` | Fetch and extract content from URLs |
| `message` | Send messages to chat channels |
| `spawn` | Spawn a subagent for background tasks |

## Development

### Build

```bash
cd typescript
npm run build
```

### Run Tests

```bash
npm test

# Watch mode
npm run test:watch
```

### Type Check

```bash
npm run typecheck
```

### Project Structure

```
typescript/
├── src/
│   ├── agent/       # Agent loop and tools
│   ├── bus/         # Message bus events and queue
│   ├── channels/    # Telegram, WhatsApp adapters
│   ├── cli/         # CLI commands
│   ├── config/      # Configuration schema and loader
│   ├── cron/        # Scheduled task service
│   ├── heartbeat/   # Periodic heartbeat service
│   ├── providers/   # LLM provider implementations
│   ├── session/     # Session management
│   └── utils/       # Helpers and utilities
├── package.json
└── tsconfig.json
```

## License

MIT - See [LICENSE](LICENSE) for details.
