# Primer

> Prime your repositories for AI-assisted development.

Primer is a CLI tool that analyzes your codebase and generates `.github/copilot-instructions.md` files to help AI coding assistants understand your project better. It supports single repos, batch processing across organizations, and includes an evaluation framework to measure instruction effectiveness.

![Primer](primer.png)

## Features

- **Repository Analysis** - Detects languages, frameworks, and package managers
- **AI-Powered Generation** - Uses the Copilot SDK to analyze your codebase and generate context-aware instructions
- **Batch Processing** - Process multiple repos across organizations with a single command
- **Evaluation Framework** - Test and measure how well your instructions improve AI responses
- **GitHub Integration** - Clone repos, create branches, and open PRs automatically
- **Interactive TUI** - Beautiful terminal interface built with Ink
- **Config Generation** - Generate MCP and VS Code configurations
- **Skills Generation** - Add meta-skills for skill authoring (plan, create, evaluate, reskill)

## Prerequisites

1. **Node.js 18+**
2. **GitHub Copilot CLI** - Installed via VS Code's Copilot Chat extension
3. **Copilot CLI Authentication** - Run `copilot` then `/login` to authenticate
4. **GitHub CLI (optional)** - For batch processing and PR creation: `brew install gh && gh auth login`

## Installation

```bash
# Clone and install
git clone https://github.com/pierceboggan/primer.git
cd primer
npm install
```

## Usage

### Quick Start (Init)

The easiest way to get started is with the `init` command:

```bash
# Interactive setup for current directory
npx tsx src/index.ts init

# Accept defaults and generate instructions automatically
npx tsx src/index.ts init --yes

# Work with a GitHub repository
npx tsx src/index.ts init --github
```

### Interactive Mode (TUI)

```bash
# Run TUI in current directory
npx tsx src/index.ts tui

# Run on a specific repo
npx tsx src/index.ts tui --repo /path/to/repo

# Skip the animated intro
npx tsx src/index.ts tui --no-animation
```

**Keys:**
- `[A]` Analyze - Detect languages, frameworks, and package manager
- `[G]` Generate - Generate copilot-instructions.md using Copilot SDK
- `[S]` Save - Save generated instructions (in preview mode)
- `[D]` Discard - Discard generated instructions (in preview mode)
- `[Q]` Quit

### Generate Instructions

```bash
# Generate instructions for current directory
npx tsx src/index.ts instructions

# Generate for specific repo with custom output
npx tsx src/index.ts instructions --repo /path/to/repo --output ./instructions.md

# Use a specific model
npx tsx src/index.ts instructions --model gpt-5
```

### Batch Processing

Process multiple repositories across organizations:

```bash
# Launch batch TUI
npx tsx src/index.ts batch

# Save results to file
npx tsx src/index.ts batch --output results.json
```

**Batch TUI Keys:**
- `[Space]` Toggle selection
- `[A]` Select all repos
- `[Enter]` Confirm selection
- `[Y/N]` Confirm/cancel processing
- `[Q]` Quit

### Analyze Repository

```bash
# Analyze current directory
npx tsx src/index.ts analyze

# Analyze specific path with JSON output
npx tsx src/index.ts analyze /path/to/repo --json
```

### Generate Configs

Generate configuration files for your repo:

```bash
# Generate MCP config
npx tsx src/index.ts generate mcp

# Generate VS Code settings
npx tsx src/index.ts generate vscode --force

# Generate meta-skills for skill authoring
npx tsx src/index.ts generate skills
```

### Manage Templates

View available instruction templates:

```bash
npx tsx src/index.ts templates
```

### Configuration

View and manage Primer configuration:

```bash
npx tsx src/index.ts config
```

### Update

Check for and apply updates:

```bash
npx tsx src/index.ts update
```

### Create Pull Requests

Automatically create a PR to add Primer configs to a repository:

```bash
# Create PR for a GitHub repo
npx tsx src/index.ts pr owner/repo-name

# Use custom branch name
npx tsx src/index.ts pr owner/repo-name --branch primer/custom-branch
```

### Evaluation Framework

Test how well your instructions improve AI responses:

```bash
# Create a starter eval config
npx tsx src/index.ts eval --init

# Run evaluation
npx tsx src/index.ts eval primer.eval.json --repo /path/to/repo

# Save results and use specific models
npx tsx src/index.ts eval --output results.json --model gpt-5 --judge-model gpt-5
```

Example `primer.eval.json`:
```json
{
  "instructionFile": ".github/copilot-instructions.md",
  "cases": [
    {
      "id": "project-overview",
      "prompt": "Summarize what this project does and list the main entry points.",
      "expectation": "Should mention the primary purpose and key files/directories."
    }
  ]
}
```

## How It Works

1. **Analysis** - Scans the repository for:
   - Language files (`.ts`, `.js`, `.py`, `.go`, etc.)
   - Framework indicators (`package.json`, `tsconfig.json`, etc.)
   - Package manager lock files

2. **Generation** - Uses the Copilot SDK to:
   - Start a Copilot CLI session
   - Let the AI agent explore your codebase using tools (`glob`, `view`, `grep`)
   - Generate concise, project-specific instructions

3. **Batch Processing** - For multiple repos:
   - Select organizations and repositories via TUI
   - Clone, branch, generate, commit, push, and create PRs
   - Track success/failure for each repository

4. **Evaluation** - Measure instruction quality:
   - Run prompts with and without instructions
   - Use a judge model to score responses
   - Generate comparison reports

## Project Structure

```
primer/
├── src/
│   ├── index.ts              # Entry point
│   ├── cli.ts                # Commander CLI setup
│   ├── commands/             # CLI commands
│   │   ├── analyze.ts        # Repository analysis
│   │   ├── batch.tsx         # Batch processing
│   │   ├── config.ts         # Config management
│   │   ├── eval.ts           # Evaluation framework
│   │   ├── generate.ts       # Config generation
│   │   ├── init.ts           # Interactive setup
│   │   ├── instructions.tsx  # Instructions generation
│   │   ├── pr.ts             # PR creation
│   │   ├── templates.ts      # Template management
│   │   ├── tui.tsx           # TUI launcher
│   │   └── update.ts         # Update command
│   ├── services/             # Core business logic
│   │   ├── analyzer.ts       # Repository analysis
│   │   ├── evaluator.ts      # Eval runner
│   │   ├── generator.ts      # Config generation
│   │   ├── git.ts            # Git operations
│   │   ├── github.ts         # GitHub API
│   │   └── instructions.ts   # Copilot SDK integration
│   ├── ui/                   # Terminal UI
│   │   ├── AnimatedBanner.tsx
│   │   ├── BatchTui.tsx      # Batch processing UI
│   │   └── tui.tsx           # Main TUI
│   └── utils/                # Helpers
│       ├── fs.ts
│       └── logger.ts
├── package.json
├── tsconfig.json
├── primer.eval.json          # Example eval config
└── PLAN.md                   # Project roadmap
```

## Development

```bash
# Type check
npx tsc -p tsconfig.json --noEmit

# Run in dev mode
npx tsx src/index.ts
```

## Troubleshooting

### "Copilot CLI not found"
Install the GitHub Copilot Chat extension in VS Code. The CLI is bundled with it.

### "Copilot CLI not logged in"
Run `copilot` in your terminal, then type `/login` to authenticate.

### "GitHub authentication required" (batch/PR commands)
Install GitHub CLI and authenticate: `brew install gh && gh auth login`

Or set a token: `export GITHUB_TOKEN=<your-token>`

### Generation hangs or times out
- Ensure you're authenticated with the Copilot CLI
- Check your network connection
- Try a smaller repository first

## License

MIT
