# Change Categories for Reskilling

How to classify reskilling signals into actionable changes.

## Categories

### 1. Upskill

**Definition**: Add new capability or knowledge that didn't exist before.

**Triggers**:
- New workflow or tool added to the domain
- New wiki documentation that should be referenced
- User request for new functionality
- Dependent skill added new capability this skill should leverage

**Examples**:
- Add support for a new deployment target
- Reference a new TSG that was created
- Add a new phase to the workflow

**Risk**: Low (additive change)

---

### 2. Update

**Definition**: Correct or refresh existing content to match current state.

**Triggers**:
- Path or file renamed
- Command syntax changed
- Better example discovered
- Wording unclear (based on user feedback)

**Examples**:
- Update a script path that moved
- Fix a command that now has different flags
- Improve an example that confused users

**Risk**: Medium (existing content changes)

---

### 3. Unlearn

**Definition**: Remove obsolete, incorrect, or harmful guidance.

**Triggers**:
- Pattern deprecated
- Guidance caused user error
- Eval flagged as unsafe or incorrect
- Duplicate of content now in another skill

**Examples**:
- Remove reference to deprecated API
- Delete workflow step that's no longer needed
- Prune section that duplicates another skill

**Risk**: High (removal is harder to undo)

---

## Decision Matrix

| Signal | Likely Category | Confidence |
|--------|-----------------|------------|
| New wiki page in domain | Upskill | High |
| Wiki page edited | Update | Medium |
| Wiki page deleted | Unlearn | High |
| Git revert in skill | Update or Unlearn | Medium |
| User says "this is wrong" | Update or Unlearn | High |
| User says "can you also do X" | Upskill | High |
| Eval P0: unsafe | Unlearn | High |
| Eval P1: missing section | Upskill | Medium |
| Eval P2: wording | Update | Low |

---

## Handling Conflicts

When signals suggest conflicting changes:
1. Surface the conflict to the user
2. Ask for clarification
3. Default to the safer option (usually Update over Unlearn)
