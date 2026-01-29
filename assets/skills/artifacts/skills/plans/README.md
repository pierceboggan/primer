# Skill Plans

This directory contains planning documents for skills.

## Directory Structure

```
plans/
├── README.md                           # This file
├── skills-status.md                    # Skill tracking and status
└── <skill-name>-skill-planning.md      # Individual skill plans
```

## Plan Document Lifecycle

```
📝 Draft → ✅ Ready to Execute → 🚀 Executing → ✔️ Complete
```

| Status | Meaning | Next Action |
|--------|---------|-------------|
| 📝 Draft | Initial planning | Continue gathering requirements |
| ✅ Ready to Execute | Plan approved | Run skill-creator to implement |
| 🚀 Executing | Implementation in progress | Complete implementation |
| ✔️ Complete | Fully implemented | Skill available for use |
| ⏸️ On Hold | Paused | Waiting for dependency |
| ⚠️ Superseded | Replaced | See replacement skill |

## Creating a Plan

1. Use `skill-planner`: "Use skill-planner to plan a skill for X"
2. Document is created at `<skill-name>-skill-planning.md`
3. Iterate on the plan with user feedback
4. Run `skill-planner-eval` before proceeding

## Plan Template

See the skill-planner skill's `references/plan-template.md` for the standard template.

## Conventions

- One plan document per skill
- Update status as you progress
- Include exploration summary before designing
- Get user confirmation before implementation
