# Signal Sources for Reskilling

Where to look for signals that a skill needs reskilling.

## Primary Sources

### 1. Git History
```powershell
# Commits touching the skill directory
git --no-pager log --oneline --since="90 days ago" -- .github/skills/<skill-name>/

# Commits touching the skill's domain (e.g., deploy-related code)
git --no-pager log --oneline --since="90 days ago" -- src/<relevant-paths>/
```

Look for:
- Bug fixes in the skill itself
- Reverts (something was wrong)
- Changes to referenced code/scripts

### 2. Eval Outputs

Check for past evaluation reports:
- `artifacts/skills/plans/<skill-name>-skill-plan-eval.md`
- `artifacts/skills/plans/<skill-name>-skill-eval.md`

Look for:
- P0/P1 issues that were flagged
- Recurring patterns across evals

### 3. Wiki Diffs

Check if referenced wiki pages changed:
```powershell
# Changes to wiki since skill was last updated
git --no-pager log --oneline --since="<skill-last-updated>" -- artifacts/
```

Look for:
- Architecture changes
- New TSGs or workflows
- Deprecated patterns

### 4. User Feedback

Sources:
- PR comments on the skill
- Issues mentioning the skill
- Direct user requests ("this skill told me the wrong thing")

### 5. Dependent Skills

If this skill is invoked by others:
```powershell
# Find skills that reference this skill
grep -r "<skill-name>" .github/skills/ --include="*.md"
```

Check if dependent skills have been updated and this one hasn't.

## Secondary Sources

### 6. SRE Agent Changes
```powershell
git --no-pager log --oneline --since="90 days ago" -- sreagent/
```

### 7. External API/Tool Changes

If the skill references external tools (az CLI, npm, etc.), check for version changes or deprecations.

## Signal Priority

| Priority | Source | Why |
|----------|--------|-----|
| P0 | Eval failures (Blocked) | Skill is broken |
| P0 | User reports | Direct evidence of problem |
| P1 | Git reverts | Something was wrong |
| P1 | Wiki architecture changes | Core knowledge may be stale |
| P2 | Code path changes | References may be outdated |
| P2 | Time since last reskill | Preventive maintenance |

