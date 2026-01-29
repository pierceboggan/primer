# Readiness Checklist

Before marking a plan as "✅ Ready to Execute", validate it against this checklist.

## Pre-Execution Validation

### 1. Exploration Complete

- [ ] **Existing skills reviewed**
  - Listed all relevant existing skills
  - Identified skills to invoke (if any)
  - Confirmed no significant duplication

- [ ] **Wiki documentation consulted**
  - Searched for relevant topics
  - Reviewed sequence diagrams (if applicable)
  - Checked TSGs for operational patterns

- [ ] **Source code analyzed** (if applicable)
  - Identified relevant directories
  - Understood component interactions
  - Traced key data flows

- [ ] **SRE agents reviewed** (if applicable)
  - Checked for existing automation
  - Identified reusable Kusto queries
  - Noted investigation patterns

- [ ] **Git history examined** (if applicable)
  - Identified high-activity areas
  - Found common patterns/issues
  - Located domain experts

### 2. Scope Defined

- [ ] **In-scope items listed**
  - Each item has a clear description
  - Scope is realistic for v1
  - No vague or ambiguous items

- [ ] **Out-of-scope items documented**
  - Each exclusion has a reason
  - Alternatives provided where appropriate
  - No gaps (nothing implicitly out of scope)

- [ ] **Dependencies identified**
  - Skills to invoke listed
  - Required tools/CLIs noted
  - Permissions documented

- [ ] **Platform support clarified**
  - Supported platforms listed
  - Unsupported platforms noted with reasons

### 3. Architecture Documented (If Applicable)

Skip if skill doesn't need architecture documentation.

- [ ] **Components identified**
  - Role of each component clear
  - Key interactions documented

- [ ] **Data flows documented**
  - Relevant flows diagrammed/described
  - Request paths clear

- [ ] **Dependencies mapped**
  - Component → dependency relationships
  - Failure impact noted

- [ ] **Telemetry referenced**
  - Relevant Kusto tables listed
  - Key fields identified

### 4. Composition Decided

- [ ] **Single vs. split decision made**
  - Rationale documented
  - If split: all resulting skills identified

- [ ] **Skills to invoke identified**
  - How and when to invoke documented
  - No circular dependencies

- [ ] **No unnecessary duplication**
  - Checked against existing skills
  - Foundational knowledge not duplicated

### 5. Structure Complete

- [ ] **All required sections present**
  - Overview (problem + solution)
  - Scope (in-scope, out-of-scope, dependencies)
  - What Gets Created (directory structure)
  - Key Design Decisions
  - Implementation Checklist

- [ ] **File structure defined**
  - SKILL.md outline complete
  - Reference files listed with descriptions
  - Scripts specified (if any)

- [ ] **Implementation checklist created**
  - Phased tasks
  - Clear checkboxes
  - Validation steps included

### 6. Quality Checks

- [ ] **Problem statement is clear**
  - Reader understands the pain point
  - Specific, not vague

- [ ] **Solution is actionable**
  - Clear what the skill does
  - Practical to implement

- [ ] **Scope is realistic**
  - Not trying to do too much in v1
  - Can be extended later

- [ ] **Decisions are documented**
  - Key choices explained
  - Rationale provided

- [ ] **Open questions listed**
  - Items needing user input identified
  - No hidden assumptions

### 7. User Review

- [ ] **Plan presented to user**
  - Summary shared
  - Key decisions highlighted

- [ ] **Feedback incorporated**
  - User comments addressed
  - Changes made as needed

- [ ] **Approval received**
  - User confirmed plan is ready
  - No outstanding concerns

## Ready to Execute

When all applicable items are checked:

1. Update plan status: `📝 Draft` → `✅ Ready to Execute`
2. Update `artifacts/skills/plans/skills-status.md`
3. Proceed to skill-creator: `"Execute the <skill-name> skill plan"`

## Quick Validation

For simple skills, use this abbreviated checklist:

```markdown
## Quick Readiness Check

- [ ] Problem clearly stated
- [ ] Scope defined (in/out)
- [ ] File structure complete
- [ ] Key decisions documented
- [ ] Implementation checklist present
- [ ] User approved
```

## Common Issues

### Plan Not Ready If:

❌ **Vague scope**: "Handle connections" instead of specific operations
❌ **Missing rationale**: Decisions without "why"
❌ **No file structure**: "Will figure out during implementation"
❌ **Hidden assumptions**: Things the user should know but aren't stated
❌ **Scope creep indicators**: "Also maybe add..." without proper scoping

### How to Fix:

1. **Vague scope** → Add specific items with descriptions
2. **Missing rationale** → Add "Rationale" column to decisions table
3. **No file structure** → Define complete directory structure
4. **Hidden assumptions** → Add to "Open Questions" or document
5. **Scope creep** → Move to "Future Enhancements" or explicitly exclude

