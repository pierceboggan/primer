# Autonomic Principles for Skills

Applying self-* properties from autonomic computing to skill maintenance.

## Background

Autonomic computing (IBM, 2001) defines self-managing systems with these properties:
- Self-configuration
- Self-healing
- Self-optimization
- Self-learning

Reference: https://en.wikipedia.org/wiki/Autonomic_computing

## Application to Skills

| Property | Traditional Software | Skills (via Reskilling) |
|----------|---------------------|-------------------------|
| **Self-configuration** | System adapts to new hardware/network | Skill adapts to new repo structure, tools, paths |
| **Self-healing** | System detects and corrects faults | Skill corrects itself after eval failure or user report |
| **Self-optimization** | System tunes performance | Skill prunes redundant content, improves clarity |
| **Self-learning** | System learns from experience | Skill incorporates patterns from git history, wiki changes |

## The MAPE Loop

Autonomic systems use Monitor-Analyze-Plan-Execute (MAPE):

```
Monitor → Analyze → Plan → Execute → (repeat)
```

For skills:

| MAPE Phase | Reskilling Equivalent |
|------------|----------------------|
| Monitor | Signal collection (git, wiki, evals, feedback) |
| Analyze | Categorize changes (upskill/update/unlearn) |
| Plan | Draft proposal, validate with `skill-planner-eval` |
| Execute | Apply edits, validate with `skill-creator-eval`, document |

## Compounding Effect

From compounding engineering (Every.to):
> "Each unit of work should make subsequent units easier—not harder."

Applied to skills:
- Each reskilling cycle captures lessons permanently
- Eval failures become documented fixes
- User feedback becomes improved guidance
- The skill gets better over time, not worse

## Trigger Model

| Trigger Type | Example | Frequency |
|--------------|---------|-----------|
| **Manual** | User says "reskill X" | On demand |
| **Time-based** | Skill not reskilled in 90+ days | Periodic |
| **Event-based** | Eval failure, wiki change | Reactive |

## Goal

Skills should behave like well-maintained software:
- Actively monitored for drift
- Quickly corrected when wrong
- Continuously improved over time
- Never allowed to rot silently
