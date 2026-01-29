# Reskilling Proposal Template

Use this structure for reskilling proposals.

---

## Reskilling Proposal: \<skill-name\>

> **Generated**: \<timestamp\>  
> **Target Skill**: `.github/skills/<skill-name>/`  
> **Last Updated**: \<skill-last-updated\>  
> **Time Window Analyzed**: \<start\> to \<end\>

---

### Signal Summary

| Source | Signals Found | Details |
|--------|---------------|---------|
| Git history | X commits | ... |
| Eval outputs | X issues | ... |
| Wiki diffs | X pages changed | ... |
| User feedback | X items | ... |
| Dependent skills | X updated | ... |

---

### Proposed Changes

| # | Type | Section/File | Change | Rationale | Risk |
|---|------|--------------|--------|-----------|------|
| 1 | Upskill | ... | ... | ... | Low |
| 2 | Update | ... | ... | ... | Medium |
| 3 | Unlearn | ... | ... | ... | High |

---

### Risk Assessment

**Overall Risk**: Low / Medium / High

**Key Risks**:
- ...

**Mitigation**:
- ...

---

### Validation Plan

1. Run `skill-planner-eval` on this proposal
2. If approved, apply edits to skill files
3. Run `skill-creator-eval` on updated skill
4. If approved, commit and document

---

### Files to Edit

- `.github/skills/<skill-name>/SKILL.md`
- `.github/skills/<skill-name>/references/...`
- `artifacts/skills/plans/skills-status.md` (update timestamp)

---

### Approval

- [ ] User reviewed signal summary
- [ ] User approved proposed changes
- [ ] `skill-planner-eval` passed
- [ ] Edits applied
- [ ] `skill-creator-eval` passed
- [ ] Committed and documented

