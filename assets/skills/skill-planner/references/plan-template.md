# Plan Document Template

Use this template for all skill planning documents.

## File Location

`artifacts/skills/plans/<skill-name>-skill-planning.md`

## Template

```markdown
# [Skill Name] Skill Planning

> **Created**: YYYY-MM-DD  
> **Last Updated**: YYYY-MM-DDTHH:MM:SSZ  
> **Status**: 📝 Draft

## Overview

### The Problem
[What pain point or need does this skill address?]
[Be specific about who experiences this problem and how often]

### The Solution
[High-level description of what the skill does]
[Key capabilities in 2-3 sentences]

---

## Scope

### In-Scope
| Item | Description |
|------|-------------|
| [Feature/Workflow 1] | [What it covers] |
| [Feature/Workflow 2] | [What it covers] |

### Out-of-Scope (Explicitly Excluded)
| Item | Reason | Alternative |
|------|--------|-------------|
| [Excluded item] | [Why excluded] | [What to use instead] |

### Dependencies
| Dependency | Type | Notes |
|------------|------|-------|
| [Dependency] | Skill/Tool/Permission | [Details] |

### Platform/Environment Support
| Platform | Supported | Notes |
|----------|-----------|-------|
| [Platform] | ✅/❌/⚠️ | [Details] |

---

## Exploration Summary

### Sources Consulted
- [x] Existing skills: [What was found]
- [x] Wiki documentation: [What was found]
- [x] Source code: [What was found]
- [x] SRE agents: [What was found]
- [x] Git history: [What was found]

### Key Findings
1. [Important finding 1]
2. [Important finding 2]
3. [Important finding 3]

### Skills to Invoke
| Skill | Purpose |
|-------|---------|
| [skill-name] | [Why this skill invokes it] |

---

## [Domain-Specific Sections]

[Add sections relevant to your skill type]

For Operations skills:
- Architecture Analysis
- Component Tracing
- Failure Modes

For Infrastructure skills:
- Pre-requisites Checklist
- Resource Dependencies
- Validation Steps

For Development skills:
- API Specifications
- Code Patterns
- Testing Approach

---

## What Gets Created

```
.github/skills/<skill-name>/
├── SKILL.md                    # [Brief description]
├── references/
│   ├── [file1].md              # [What it contains]
│   └── [file2].md              # [What it contains]
└── scripts/
    ├── [script1].ps1           # [What it does]
    └── [script2].ps1           # [What it does]
```

**Total: X skill file + Y reference docs + Z scripts = N files**

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| [Decision point] | [What was decided] | [Why] |
| [Decision point] | [What was decided] | [Why] |

---

## SKILL.md Structure

```yaml
---
name: [skill-name]
description: |
  [2-3 sentence description that includes:]
  [- What the skill does]
  [- When to use it (triggers)]
  [- Key capabilities]
---
```

### Main Sections
1. [Section 1] - [What it covers]
2. [Section 2] - [What it covers]
3. [Section 3] - [What it covers]

---

## Script Specifications

### [Script Name].ps1

```powershell
param(
    [Parameter(Mandatory)][type]$Param1,
    [type]$OptionalParam = "default"
)
# Purpose: [What the script does]
# Usage: [Example usage]
# Returns: [What it outputs]
```

---

## Implementation Checklist

### Phase 1: Create Skill Structure
- [ ] Create directory: `.github/skills/<skill-name>/`
- [ ] Create directory: `.github/skills/<skill-name>/references/`
- [ ] Create directory: `.github/skills/<skill-name>/scripts/` (if needed)
- [ ] Create `SKILL.md`

### Phase 2: Create Reference Files
- [ ] Create `references/[file1].md`
- [ ] Create `references/[file2].md`

### Phase 3: Create Scripts (if applicable)
- [ ] Create `scripts/[script1].ps1`
- [ ] Test script execution

### Phase 4: Validation
- [ ] Test skill loads in Copilot CLI
- [ ] Verify workflows function correctly
- [ ] Update skills-status.md

---

## Validation Criteria

How to know the skill is working correctly:

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

---

## Open Questions

[Items needing user input or decisions]

1. [Question 1]
2. [Question 2]

---

## Key Repository References

| File/Location | Purpose |
|---------------|---------|
| [path] | [Why it's relevant to this skill] |

---

## Session Notes

[Optional: Notes from the planning session]
```

## Status Values

| Status | Meaning | Next Action |
|--------|---------|-------------|
| 📝 Draft | Initial planning | Continue gathering requirements |
| ✅ Ready to Execute | Plan complete | Run skill-creator to implement |
| 🚀 Executing | Implementation in progress | Complete implementation |
| ✔️ Complete | Fully implemented | Available for use |
| ⏸️ On Hold | Paused | Waiting for [dependency] |
| ⚠️ Superseded | Replaced by other skill(s) | See replacement |

## Section Guidelines

### Required Sections (always include)
- Overview (problem + solution)
- Scope (in-scope, out-of-scope, dependencies)
- What Gets Created
- Key Design Decisions
- Implementation Checklist

### Conditional Sections (include when relevant)
- Exploration Summary (for complex skills)
- Architecture Analysis (for operational skills)
- Script Specifications (when scripts are included)
- Validation Criteria (for testable skills)

### Optional Sections
- Open Questions
- Session Notes
- Key Repository References

