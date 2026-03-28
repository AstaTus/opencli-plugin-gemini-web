# opencli-plugin-gemini-web

OpenCLI plugin for interacting with [Google Gemini](https://gemini.google.com/app) web interface.

[中文](./README.zh-CN.md) | [日本語](./README.ja.md) | English

## Prerequisites

- [OpenCLI](https://github.com/jackwener/opencli) installed (`npm install -g @jackwener/opencli`)
- [esbuild](https://esbuild.github.io/) installed (`npm i -g esbuild`) — required for TypeScript plugin compilation
- Chrome browser with **OpenCLI Browser Bridge** extension installed
  - Download from [OpenCLI Releases](https://github.com/jackwener/opencli/releases)
  - Load unpacked in `chrome://extensions/`
- Logged into Gemini in Chrome

## Installation

```bash
# Via opencli plugin manager
opencli plugin install github:AstaTus/opencli-plugin-gemini-web

# Or manually
git clone https://github.com/AstaTus/opencli-plugin-gemini-web \
  ~/.opencli/plugins/gemini-web
```

## Usage

```bash
# Quick mode (default)
opencli gemini-web ask "What is the capital of France?"

# Thinking mode for complex problems
opencli gemini-web ask "Explain quantum computing in detail" --mode think

# Pro mode for advanced tasks
opencli gemini-web ask "Write a complex algorithm" --mode pro

# Deep Research (default 600s timeout)
opencli gemini-web ask "Compare Python vs JavaScript ecosystems" --deep-research

# Combine Deep Research with a specific mode
opencli gemini-web ask "Analyze market trends" --deep-research --mode pro
```

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `prompt` | (required) | The question to ask Gemini |
| `--mode` | `quick` | Response mode: `quick`, `think`, `pro` |
| `--deep-research` | `false` | Enable Deep Research (can combine with `--mode`) |

## Modes

- `quick` (default) — Fast response
- `think` — Deep thinking for complex problems
- `pro` — Advanced capabilities

## Deep Research

When using `--deep-research`, the plugin handles the full research flow:
1. Sends your prompt and waits for Gemini to generate a research plan
2. Automatically clicks "Start research" to begin
3. Waits for the research to complete and returns the full report

## Configuration

**Important**: Add this to your `~/.zshrc` or `~/.bashrc` to avoid timeout errors:

```bash
export OPENCLI_BROWSER_COMMAND_TIMEOUT=350
```

Then reload:
```bash
source ~/.zshrc
```

## Troubleshooting

### Timeout errors

If you see `timed out after 60s`, make sure you set the environment variable:
```bash
export OPENCLI_BROWSER_COMMAND_TIMEOUT=350
```

### "Not logged in" error

Make sure you are logged into Gemini in Chrome:
1. Open Chrome and navigate to https://gemini.google.com/app
2. Log in with your Google account
3. Retry the command

### Extension not connected

Make sure the OpenCLI Browser Bridge extension is installed and enabled in Chrome:
1. Download `opencli-extension.zip` from [OpenCLI Releases](https://github.com/jackwener/opencli/releases)
2. Unzip and load in `chrome://extensions/` → "Load unpacked"
3. Run `opencli doctor` to verify connection

## Project Structure

```
opencli-plugin-gemini-web/
├── ask.ts            # Main ask command (TypeScript)
├── package.json
└── README.md
```

## License

MIT

## Related

- [OpenCLI](https://github.com/jackwener/opencli) - The main OpenCLI project
