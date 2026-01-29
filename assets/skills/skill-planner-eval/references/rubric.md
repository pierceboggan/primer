# skill-planner-eval rubric

## Gates (fail any ⇒ Blocked)

1. **Scope & success criteria**: in/out clearly stated; measurable success.
2. **Exploration evidence**: concrete sources (repo paths, wiki, existing skills) cited.
3. **Architecture/data-flow accuracy** (if applicable): correct components, dependencies, boundaries.
4. **Validation plan**: how to validate success safely (prefer lower env / local).
5. **Safety/security**: no secrets required; privileged actions gated by explicit confirmation.

## Non-gate quality dimensions (score 0–2 each)

- Workflow clarity (stepwise, decision points, required inputs)
- Script readiness (parameters, safe defaults, testability)
- Reusability/composition (invokes existing skills vs duplication)
- Readability (structure, headings, concise)
- Operational realism (uses repo conventions; realistic commands)

## Severity guidance

- **P0**: blocks execution or unsafe (secrets, PROD impact, missing validation)
- **P1**: major gaps (missing key sections, ambiguous steps)
- **P2**: improvements (wording, extra examples)
