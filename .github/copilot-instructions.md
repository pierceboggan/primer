# Copilot Instructions for Primer

## Overview

**Primer** is a TypeScript CLI tool for priming repositories for AI-assisted development and evaluation.

- **Tech Stack:** TypeScript (ESM, strict), Node.js, React (Ink for TUI)
- **Entrypoint:** `src/index.ts` (calls `runCli` in `src/cli.ts`)
- **Key Directories:**
  - `src/commands/` — CLI subcommands
  - `src/services/` — core logic (analyzer, instructions, generator, git, github, evaluator)
  - `src/ui/` — Ink/React-based terminal UI
  - `.github/` — Copilot instructions
  - `.vscode/` — Editor settings

## Architecture

- **CLI:** Uses `commander` to wire subcommands to service functions.
- **Analyzer:** Scans repo files to infer languages, frameworks, and package manager.
- **Instructions:** Generates `.github/copilot-instructions.md` from convention files.
- **Config Generation:** Writes `.vscode/settings.json` and `.vscode/mcp.json` (safe overwrite).
- **Skills Generation:** Copies bundled meta-skills from `assets/skills/` to target repos.
- **Git/GitHub:** Automates clone/branch/PR via `simple-git` and Octokit.
- **Evaluation:** Compares agent responses with/without instructions using Copilot sessions.
- **TUI:** `src/ui/tui.tsx` (Ink/React) for interactive terminal usage.

## Usage

- **Run locally (no build step):**
  - `npx tsx src/index.ts --help`
  - `npx tsx src/index.ts analyze [path] --json`
  - `npx tsx src/index.ts generate mcp|vscode|skills [path] [--force]`
  - `npx tsx src/index.ts instructions [--repo <path>] [--output <path>] [--model gpt-5]`
  - `npx tsx src/index.ts tui [--repo <path>]`
  - `npx tsx src/index.ts pr <owner/name> [--branch primer/add-configs]`
  - `npx tsx src/index.ts eval [configPath] --repo <path> [--model gpt-5] [--judge-model gpt-5] [--output results.json]`

## Conventions

- **ESM everywhere** (`"type": "module"` in `package.json`)
- **Strict TypeScript** (`tsconfig.json` targets ES2022, module ESNext, strict mode)
- **Single glob pass** for convention sources (see `src/services/instructions.ts`)
- **Safe file writes:** Overwrites only with `--force`
- **VS Code Copilot settings** reference this file and enable MCP

## Prerequisites

- **Copilot CLI** must be installed and authenticated for SDK calls.
- **GitHub automation** requires `GITHUB_TOKEN` or `GH_TOKEN` in the environment.

## Key Files

- `.github/copilot-instructions.md` — This file
- `src/index.ts` — CLI entrypoint
- `src/services/` — Core logic
- `src/services/skills.ts` — Skills generation service
- `assets/skills/` — Bundled meta-skills (skill-creator, skill-planner, etc.)
- `.vscode/settings.json` — Copilot/VS Code integration