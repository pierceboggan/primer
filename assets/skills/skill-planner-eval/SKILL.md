---
name: skill-planner-eval
description: |
  Evaluates skill planning documents for completeness, accuracy, feasibility, and safety.
  Use after a plan is drafted (often by skill-planner) and before implementing with skill-creator.
  Produces a readiness verdict (Approve / Needs Changes / Blocked) with prioritized fixes.
license: Complete terms in LICENSE.txt
---

<!-- Model provenance: Generated with a non-Opus 4.5 model/vendor (Copilot CLI session). -->

# Skill Planner Eval

## Purpose

Evaluate a skill plan (typically `.wiki\Copilot\skills\plans\<skill-name>-skill-planning.md`) and decide if it is ready for implementation.

## Inputs to Ask For

- Path to the plan document
- Any constraints (time budget, allowed tools, environments)
- Optional: alternate plan variants for comparison

## Output

Produce a structured report with:
- Verdict: **Approve / Needs Changes / Blocked**
- Scorecard (rubric categories)
- Top issues (P0/P1/P2)
- Concrete edits requested (prefer line-level suggestions)
- Missing artifacts list

Recommended file output:
- `.wiki\Copilot\skills\plans\<skill-name>-skill-plan-eval.md`

## Workflow

1. **Parse the plan**: goals, scope, workflow steps, artifacts, dependencies.
2. **Run the rubric** (see `references\rubric.md`).
3. **Validate executability**: ensure steps are concrete (repo paths, commands, expected outputs).
4. **Flag safety risks**: secrets, destructive defaults, privileged/PROD assumptions.
5. **Write the evaluation report** (see `references\output-template.md`).

## Notes

- If the plan references `.github\skills\...`, remember this repo may require `git add -f` for `.github` paths.

