---
name: skill-creator-eval
description: |
  Evaluates an implemented skill package under .github/skills/<skill-name>/ for structure,
  usability, safety, and conformance to its plan.
  Use after skill-creator implementation and before merging/shipping.
license: Complete terms in LICENSE.txt
---

<!-- Model provenance: Generated with a non-Opus 4.5 model/vendor (Copilot CLI session). -->

# Skill Creator Eval

## Purpose

Evaluate an implemented skill directory (SKILL.md + scripts/references) and decide if it is ready to ship.

## Inputs to Ask For

- Skill directory path: `.github\skills\<skill-name>\`
- Optional: the approved plan doc path
- Any constraints (Windows-only, available tools)

## Output

Produce a structured report with:
- Verdict: **Approve / Needs Changes / Blocked**
- Checklist scorecard
- Top issues (P0/P1/P2)
- Concrete edits requested (file/section-level; line-level when easy)
- Packaging/release risks

Recommended file output:
- `.wiki\Copilot\skills\plans\<skill-name>-skill-eval.md`

## Workflow

1. **Inventory**: list files; confirm `SKILL.md` exists and is the entry point.
2. **Evaluate SKILL.md**: invocation, stepwise workflow, guardrails, CLI-friendly output.
3. **Evaluate scripts (if any)**: parameters, safe defaults, error handling; no secrets.
4. **Cross-check vs plan (if provided)**: missing promised artifacts; scope creep.
5. **Write the evaluation report** (see `references\output-template.md`).

## Notes

- This repo may require `git add -f` for `.github` paths; flag if packaging looks wrong.

