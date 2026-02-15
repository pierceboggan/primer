# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Complete Rewrite

Primer vNext is a complete rewrite as a TypeScript CLI tool (ESM, strict, ES2022) for priming repositories for AI-assisted development and evaluation.

### New Commands

- **`primer readiness`** — AI readiness report scoring repos across 9 pillars (style, build, testing, docs, dev-env, code-quality, observability, security, AI tooling) with a 5-level maturity model (Functional → Autonomous).
- **`primer readiness --visual`** — GitHub-themed HTML report with light/dark toggle, expandable pillar details, and maturity model descriptions.
- **`primer batch-readiness`** — Consolidated visual readiness report across multiple repositories.
- **`primer generate instructions`** — Generate `copilot-instructions.md` via Copilot SDK, with `--per-app` support for monorepos.
- **`primer generate agents`** — Generate `AGENTS.md` guidance files.
- **`primer eval --init`** — AI-powered eval scaffold generation that analyzes codebases and produces cross-cutting eval cases.
- **`primer eval --list-models`** — List available Copilot CLI models.

### New Features

- **Azure DevOps integration** — Full support for batch processing, PR creation, and repo cloning via Azure DevOps PAT authentication.
- **Monorepo detection** — Detect and analyze Cargo workspaces, Go workspaces (`go.work`), .NET solutions (`.sln`), Gradle multi-project, Maven multi-module, in addition to npm/pnpm/yarn workspaces.
- **Eval trajectory viewer** — Interactive HTML viewer comparing responses with/without instructions, including token usage, tool call metrics, and duration tracking.
- **Copilot CLI discovery** — Cross-platform discovery with TTL caching and glob-based fallback for VS Code extension paths.
- **Centralized model defaults** — Default model set to `claude-sonnet-4.5` via `src/config.ts`.

### Improvements

- Replaced `process.chdir()` with safe `withCwd` utility for directory switching during Copilot SDK calls.
- Path traversal protection via `validateCachePath` for cloned repo paths.
- Credential sanitization in git push error messages to prevent token leaks.
- `buildAuthedUrl` utility supporting both GitHub (`x-access-token`) and Azure DevOps (`pat`) auth.
- `safeWriteFile` utility for safe config file writes (skip existing unless `--force`).
- `checkRepoHasInstructions` now re-throws non-404 errors instead of silently returning false.
- `init --yes` now generates instructions, MCP, and VS Code configs (previously only instructions).

### Removed

- Removed stub commands: `analyze`, `templates`, `update`, `config`.

### Testing & Tooling

- Vitest test framework with 51+ tests covering analyzer, generator, git, readiness, visual report, fs utilities, and cache path validation.
- ESLint flat config with TypeScript, import ordering, and Prettier integration.
- CI workflow with lint, typecheck, tests (Node 20/22, Ubuntu/macOS/Windows), and build verification.
- Release automation via release-please.
- Code coverage via `@vitest/coverage-v8`.

### Project Setup

- Added CONTRIBUTING.md, SECURITY.md, LICENSE (MIT), and CODEOWNERS.
- Added issue templates (bug report, feature request) and PR template.
- Added `.github/agents/` with multi-model code review agents (Opus, Gemini, Codex).
- Added `.github/prompts/` with reusable prompts (deslop, review, generate-improvements).
- Added examples folder with sample eval config and CLI usage guide.
- Added `.prettierrc.json` with project formatting rules.
