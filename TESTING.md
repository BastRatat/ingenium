# Testing Guide

This document explains how to test the ingenium TypeScript implementation end-to-end.

## Prerequisites

- Node.js 20+
- npm

## Quick Start (Unit Tests)

```bash
cd typescript
npm install
npm test           # Run all 388 tests
npm run typecheck  # Verify types
npm run build      # Compile to dist/
```

### Test Coverage

Run tests with coverage reporting:

```bash
npm test -- --coverage
```

Current test suite: **388 tests** across **29 test files**.

## Configuration Setup

### Initial Setup

Run the onboard command to create the default configuration:

```bash
npm start onboard
```

This creates:
- `~/.ingenium/config.json` - Main configuration file
- `~/.ingenium/workspace/` - Workspace directory with template files

### Required API Keys

At minimum, you need one LLM provider API key. Edit `~/.ingenium/config.json`:

```json
{
  "providers": {
    "anthropic": {
      "apiKey": "sk-ant-..."
    }
  }
}
```

**Supported providers:**
- `anthropic` - Anthropic API (Claude models)
- `openrouter` - OpenRouter (access to multiple models)
- `openai` - OpenAI API
- `gemini` - Google Gemini
- `groq` - Groq
- `zhipu` - Zhipu AI
- `vllm` - Local vLLM server (set `apiBase` instead of `apiKey`)

**Priority order:** OpenRouter > Anthropic > OpenAI > Gemini > Zhipu > Groq > vLLM

### Optional: Web Search

To enable the web search tool, add a Brave Search API key:

```json
{
  "tools": {
    "web": {
      "search": {
        "apiKey": "BSA...",
        "maxResults": 5
      }
    }
  }
}
```

Get a key at: https://brave.com/search/api/

### Optional: Telegram Bot

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "123456:ABC-DEF...",
      "allowFrom": ["username1", "username2"]
    }
  }
}
```

### Optional: WhatsApp Bridge

WhatsApp requires a separate bridge server. See the bridge setup documentation.

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "bridgeUrl": "ws://localhost:3001",
      "allowFrom": ["+1234567890"]
    }
  }
}
```

## Manual Testing Guide

### Test CLI Help

```bash
npm start -- --help
npm start -- --version
```

Expected output for `--help`:
```
Usage: ingenium [options] [command]

🤖 ingenium - Personal AI Assistant

Options:
  -v, --version   Show version
  -h, --help      display help for command

Commands:
  onboard         Initialize ingenium configuration and workspace
  gateway         Start the ingenium gateway
  agent           Interact with the agent directly
  status          Show ingenium status
  channels        Manage channels
  cron            Manage scheduled tasks
  help [command]  display help for command
```

### Test Status

Check configuration status (no API key required):

```bash
npm start status
```

Expected output shows config path, workspace path, model, and API key status.

### Test Agent (requires LLM API key)

**Single message mode:**

```bash
npm start agent -- -m "Hello, what can you do?"
```

**Interactive mode:**

```bash
npm start agent
```

This starts a REPL where you can type messages. Press `Ctrl+C` to exit.

### Test Gateway (full system)

Start the complete gateway with all services:

```bash
npm start gateway
```

This starts:
- Agent loop (processes messages from channels)
- Channel manager (Telegram/WhatsApp if enabled)
- Cron service (scheduled tasks)
- Heartbeat service (periodic checks)

Press `Ctrl+C` to shut down gracefully.

### Test Cron Commands

**List scheduled jobs:**

```bash
npm start cron -- list
npm start cron -- list --all  # Include disabled jobs
```

**Add a job (runs every 60 seconds):**

```bash
npm start cron -- add -n "test-job" -m "Hello, run a quick check" -e 60
```

**Add a job with cron expression (daily at 9am):**

```bash
npm start cron -- add -n "daily-check" -m "Good morning!" -c "0 9 * * *"
```

**Add a one-time job:**

```bash
npm start cron -- add -n "reminder" -m "Time for the meeting!" --at "2025-01-15T14:00:00"
```

**Enable/disable a job:**

```bash
npm start cron -- enable <jobId>
npm start cron -- enable <jobId> --disable
```

**Manually run a job:**

```bash
npm start cron -- run <jobId>
npm start cron -- run <jobId> --force  # Run even if disabled
```

**Remove a job:**

```bash
npm start cron -- remove <jobId>
```

### Test Channel Status

```bash
npm start channels -- status
```

## Channel Testing

### Telegram

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Add the token to config (see Configuration Setup)
3. Add your Telegram username to `allowFrom`
4. Start the gateway: `npm start gateway`
5. Message your bot on Telegram

### WhatsApp

WhatsApp requires the separate bridge server:

1. Start the WhatsApp bridge server (see bridge documentation)
2. Configure the bridge URL in config
3. Add allowed phone numbers to `allowFrom`
4. Start the gateway: `npm start gateway`
5. Send a WhatsApp message to the linked number

## Troubleshooting

### "No API key configured"

Ensure you have at least one provider API key set in `~/.ingenium/config.json`.

### "Could not create LLM provider"

Check that:
- Your API key is valid
- The model name matches the provider (e.g., `anthropic/claude-opus-4-5` for Anthropic)

### Tests failing

Ensure dependencies are installed:

```bash
npm install
npm run build
```

### TypeScript errors

Run type checking to identify issues:

```bash
npm run typecheck
```
