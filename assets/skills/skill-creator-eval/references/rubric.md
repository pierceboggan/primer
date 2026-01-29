# skill-creator-eval rubric

## Gates (fail any ⇒ Blocked)

1. **Structure**: SKILL.md present; directory is coherent; no missing referenced files.
2. **Usability/UX**: clear invocation + required inputs; stepwise workflow; concise outputs.
3. **Safety/security**: no secrets; no destructive defaults; confirmations before privileged actions.
4. **Platform correctness**: Windows/PowerShell friendly; uses Windows paths; avoids pagers.

## Non-gate quality dimensions (score 0–2 each)

- Script quality (parameterization, errors, deterministic behavior)
- Reference quality (findable, not duplicated, not bloated)
- Plan conformance (if plan provided)
- Maintainability (clear separation; minimal redundancy)
- Readability (clear structure, consistent headings, minimal fluff)

## Severity guidance

- **P0**: unsafe, non-functional, or unshippable
- **P1**: major UX gaps or missing artifacts
- **P2**: polish and improvements
