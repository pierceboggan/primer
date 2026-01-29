---
name: skill-reskilling
description: |
  Continuous learning and improvement for existing skills.
  Use this skill when you want to:
  - Refresh a skill that may have drifted from current best practices
  - Incorporate feedback from evals, PRs, or users
  - Update a skill after upstream knowledge sources changed (wiki, code, SRE agents)
  - Prune stale or incorrect guidance from a skill
  
  Reskilling uses planner-style exploration to collect signals, proposes changes
  (upskill/update/unlearn), validates via eval skills, and applies edits directly.
license: Complete terms in LICENSE.txt
---

<!-- Model provenance: Generated with a non-Opus 4.5 model/vendor (Copilot CLI session). -->

# Skill Reskilling

Continuously improve existing skills based on signals from git history, eval outputs, wiki changes, and user feedback.

## When to Use

- Skill hasn't been updated in 90+ days
- Eval failure or user-reported issue
- Upstream knowledge sources changed significantly
- User explicitly requests: "reskill \<skill-name\>"

## Quick Start

```
"Reskill the deploy-assistant skill"
```

## Inputs to Ask For

1. **Which skill?** — name or path (e.g., `skill-planner`, `deploy-assistant`)
2. **Any specific feedback?** — optional: known issues, PR comments, user requests
3. **Time window?** — default: 90 days or since last reskill
4. **Auto-apply or proposal-only?** — default: proposal-only (safer)

## Workflow

### Phase 1: Signal Collection

Gather reskilling signals. See `references/signal-sources.md`.

| Source | What to Look For |
|--------|------------------|
| Git history | Commits touching the skill or its domain; bug fixes; reverts |
| Eval outputs | Past `skill-planner-eval` or `skill-creator-eval` reports |
| Wiki diffs | Changes to referenced wiki pages since skill was last updated |
| User feedback | Explicit requests, PR comments, issues |
| Dependent skills | If this skill is invoked by others, check their status |

### Phase 2: Categorize Changes

Classify signals. See `references/change-categories.md`.

| Type | Description | Example |
|------|-------------|---------|
| **Upskill** | Add new capability or knowledge | New workflow step, new tool support |
| **Update** | Correct or refresh existing content | Path changed, better example |
| **Unlearn** | Remove obsolete or incorrect guidance | Deprecated pattern, wrong command |

### Phase 3: Draft Proposal

Produce a structured proposal. See `references/proposal-template.md`.

Output file: `.wiki\Copilot\skills\plans\<skill-name>-reskilling-proposal.md`

### Phase 4: Validate Proposal

Run `skill-planner-eval` on the proposal.

Gate: proceed only if verdict is **Approve** or **Needs Changes**.

### Phase 5: Apply Edits

Directly edit existing skill files (SKILL.md, references, scripts).

This is **update**, not create—no scaffolding.

### Phase 6: Validate Updated Skill

Run `skill-creator-eval` on the updated skill directory.

Gate: proceed to commit only if verdict is **Approve** or **Needs Changes**.

### Phase 7: Document

- Add changelog entry (in skill or `skills-status.md`)
- Update `Last Reskilled` timestamp

## Example Invocations

| Command | What Happens |
|---------|--------------|
| `"Reskill skill-planner"` | Analyze for drift, propose updates |
| `"Reskill deploy-assistant based on recent PR feedback"` | Focus on specific feedback |
| `"Reskill architect skill - check wiki changes"` | Focus on wiki signals |
| `"Show reskilling proposal for rca-assistant (don't apply)"` | Proposal-only mode |

## Outputs

1. **Signal summary**: what changed (git, wiki, evals, feedback)
2. **Reskilling proposal**: table of upskill/update/unlearn changes
3. **Validation results**: eval verdicts
4. **Updated files** (if approved): edited skill files
5. **Changelog entry**: documented in `skills-status.md`

## Tips

- Start with **proposal-only mode** until you trust the process
- Review signal summary before approving changes
- If eval returns "Blocked", address P0 issues before retrying
- Use specific feedback to guide targeted reskilling

## Continuous Loop

```
Trigger → Collect Signals → Propose → Validate (plan-eval) → Apply → Validate (skill-eval) → Document → (repeat)
```

Triggers:
- Manual: user says "reskill \<skill-name\>"
- Time-based: skill not reskilled in 90+ days
- Event-based: eval failure, wiki change, user feedback

