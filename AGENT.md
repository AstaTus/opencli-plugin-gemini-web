# AGENT.md - OpenCLI Plugin: Gemini

This plugin provides CLI commands for interacting with Google Gemini web interface.

## Available Commands

- `opencli gemini status` - Check login status
- `opencli gemini new` - Start new conversation
- `opencli gemini ask "<prompt>"` - Send message to Gemini
- `opencli gemini read` - Read last response
- `opencli gemini history` - List conversations

## Usage Examples

```bash
# Check if logged in
opencli gemini status

# Ask a question
opencli gemini ask "Explain quantum computing in simple terms"

# Read response with JSON output
opencli gemini read -f json

# View recent conversations
opencli gemini history --limit 5
```

## Requirements

- User must be logged into Gemini in Chrome browser
- Playwright MCP Bridge extension must be installed
