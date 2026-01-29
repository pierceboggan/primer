# Skill Planning: code-reviewer-general

> **Status**: ✅ APPROVED  
> **Created**: 2026-01-14  
> **Author**: skill-planner (demo run)

---

## 1. Executive Summary

**Goal**: Create a generic, repository-agnostic code review skill that can be immediately
used in any repository and then tailored via `skill-reskilling`.

**Key Decision**: This skill should be:
- Generic enough to work out-of-box in any repo
- Structured enough to provide consistent, high-signal reviews
- Designed for reskilling (clear placeholders for repo-specific customization)

---

## 2. Exploration Summary

### 2.1 Existing Skills Checked

| Skill | Relevant? | Notes |
|-------|-----------|-------|
| `skill-reskilling` | ✅ Yes | Will be used to tailor this skill after adoption |
| `skill-creator` | ✅ Yes | Used to implement this skill |
| `skill-planner-eval` | ✅ Yes | Will evaluate this plan |

### 2.2 External References

- [GitHub awesome-copilot code-review-generic.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/code-review-generic.instructions.md)
  - Provides severity-based rubric (Critical/Important/Suggestion)
  - Language-agnostic review priorities
  - Checklist format for structured output

### 2.3 Source Code Analysis

Not applicable - this is a meta-skill that works across any codebase.

### 2.4 Wiki/Documentation

Not applicable - this skill is part of the starter kit, not a domain-specific skill.

---

## 3. Scope Definition

### 3.1 In-Scope

| Capability | Description |
|------------|-------------|
| Review uncommitted changes | `git diff` analysis |
| Review branch vs base | `git diff base...HEAD` analysis |
| Review PR (if tooling available) | PR diff analysis |
| Severity-based findings | Critical/Important/Suggestion |
| Checklist output | Structured, actionable feedback |
| Risk assessment | Low/Medium/High risk rating |

### 3.2 Out-of-Scope

| Excluded | Reason |
|----------|--------|
| PR comment posting | Requires repo-specific PR tooling integration |
| ADO/GitHub API calls | Not all repos have MCP configured |
| Auto-fix generation | Separate concern; could be a future skill |
| Test execution | Should be handled by CI or separate skill |

### 3.3 Dependencies

| Dependency | Type | Required? |
|------------|------|-----------|
| Git CLI | Tool | ✅ Yes |
| skill-reskilling | Skill | Recommended (for tailoring) |

---

## 4. Skill Composition Decision

**Decision**: Single skill with references

**Rationale**:
- Review logic is cohesive and fits in one SKILL.md
- `references/review-guidelines.md` holds the rubric (easy to reskill)
- No need to split or compose with other skills

---

## 5. Architecture (Not Applicable)

This is a stateless review skill - no architecture diagrams needed.

---

## 6. Skill Structure

```
.github/skills/code-reviewer-general/
├── SKILL.md                          # Main skill definition
└── references/
    └── review-guidelines.md          # Rubric and checklist (reskillable)
```

**Companion File**:
```
.github/instructions/code-review-generic.instructions.md
```
- Provides default review guidance for all Copilot CLI interactions
- References upstream awesome-copilot template

---

## 7. User Interaction Patterns

### 7.1 Primary Use Cases

| Use Case | User Prompt | Skill Action |
|----------|-------------|--------------|
| Review local changes | "Review my uncommitted changes" | `git status` + `git diff` |
| Review branch | "Review my branch vs main" | `git diff main...HEAD` |
| Review PR | "Review PR #123" | Fetch PR diff (if tooling available) |

### 7.2 Output Format

1. **Summary** (2-5 bullets)
2. **Risk Level**: Low / Medium / High
3. **Findings** by severity:
   - 🔴 Critical (block merge)
   - 🟡 Important (discuss/should fix)
   - 🟢 Suggestion (nice-to-have)
4. **Tests & Validation**: what to run, what's missing

---

## 8. Reskilling Strategy

After adoption, teams should immediately reskill this skill:

```
Reskill the code-reviewer-general skill for THIS repository. Find:
- Standard build/test commands
- Architecture hotspots and risk areas
- Required quality gates
- Team conventions
Update SKILL.md and references/review-guidelines.md accordingly.
```

**Reskillable Sections**:
- `references/review-guidelines.md` - Add repo-specific checks
- `SKILL.md` description - Add repo-specific context
- Test commands - Fill in actual build/test/lint commands

---

## 9. Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| Works out-of-box | Can review changes in any repo without configuration |
| Provides structured output | Uses severity-based format consistently |
| Easy to reskill | Clear placeholders, documented reskill process |
| High-signal reviews | Focuses on security, correctness, tests, performance |

---

## 10. Implementation Checklist

- [x] Create SKILL.md with frontmatter
- [x] Create references/review-guidelines.md with rubric
- [x] Create .github/instructions/code-review-generic.instructions.md
- [x] Document reskill process in SKILL.md
- [x] Update skills-status.md
- [x] Plan evaluated by skill-planner-eval

---

## 11. Next Steps

1. ✅ Plan approved (this document)
2. ✅ Skill implemented by skill-creator
3. ⏳ Teams adopt starter kit
4. ⏳ Teams run reskilling to tailor for their repos

---

*This plan was generated by skill-planner to demonstrate the planning workflow.*
