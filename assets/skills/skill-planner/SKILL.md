---
name: skill-planner
description: |
  Skill planning expert for creating high-quality skill plans before implementation.
  Use this skill BEFORE skill-creator when you need to:
  - Plan a new skill from scratch
  - Analyze requirements and scope for a skill
  - Decide on skill composition (single vs. split vs. compose with existing skills)
  - Document architecture and data flows for operational skills
  - Create comprehensive plan documents ready for execution
  
  This skill guides systematic exploration of the codebase, wiki, existing skills,
  and SRE agents to inform planning decisions. Outputs a plan document in 
  artifacts/skills/plans/<skill-name>-skill-planning.md that is ready for execution 
  by skill-creator.
---

# Skill Planner

This skill provides comprehensive guidance for the planning phase of skill creation. Planning is the most critical aspect of skill creation - a well-planned skill is faster to implement, easier to maintain, and more likely to meet user needs.

## When to Use This Skill

- **Always** before creating a new skill (runs before skill-creator)
- When deciding whether to split a skill into multiple skills
- When deciding whether to compose with existing skills
- When architecture documentation is needed for operational skills
- For major refactoring of existing skills

## Workflow Position

```
User Request → skill-planner → Plan Document → User Review → skill-creator → Implementation
```

## The Planning Process

Follow these phases in order:

### Phase 1: Exploration

Before planning, systematically explore sources. See `references/exploration-checklist.md`.

**Source Priority Order:**
1. **Existing Skills** (`.github/skills/`) - Avoid duplication, find skills to invoke
2. **Wiki Documentation** (`artifacts/`) - Architecture, TSGs, sequence diagrams
3. **Source Code** (`src/`) - Component interactions, data flows
4. **SRE Agents** (`sreagent/`) - Existing automation, Kusto queries
5. **Git History** - Recent activity, pain points, common patterns
6. **External Dependencies** - Partner teams, APIs, tools

**Key Questions:**
- What existing skills could this skill invoke?
- What wiki documentation describes this domain?
- Which source directories are relevant?
- Are there SRE agents with reusable patterns?
- What does git history reveal about this area?

### Phase 2: Scope Definition

Define clear boundaries. See `references/scope-framework.md`.

**Must Define:**
- **In-Scope**: What the skill covers (be specific)
- **Out-of-Scope**: What is explicitly excluded and why
- **Dependencies**: Other skills, tools, or services required
- **Platform Considerations**: Which platforms/environments supported

**Scope Decision Criteria:**
- Is this a distinct domain? → Consider separate skill
- Would multiple skills need this? → Create reusable foundational skill
- Would SKILL.md exceed 500 lines? → Split into references or multiple skills

### Phase 3: Architecture Analysis (If Needed)

Not all skills need architecture documentation. See `references/architecture-patterns.md`.

**When Architecture is Needed:**
| Skill Type | Need | Depth |
|------------|------|-------|
| Operations (RCA, incident, livesite) | ✅ Yes | Deep |
| Infrastructure (region, scale unit) | ✅ Yes | Medium |
| Development (connector, API) | ⚠️ Maybe | Light |
| Utility (formatting, conversion) | ❌ No | N/A |

**What to Document:**
- Components involved and their roles
- Data flows (control plane, runtime, OAuth, etc.)
- Dependencies and failure propagation
- Relevant Kusto tables for telemetry

### Phase 4: Skill Composition Decision

Decide whether to create one skill or multiple. See `references/composition-framework.md`.

**Decision Tree:**
1. Does this skill need architectural knowledge?
   - YES + Would benefit other skills → Create separate architect-style skill
   - YES + Only this skill needs it → Embed in references/
   - NO → Continue

2. Is scope too broad (>500 lines, multiple domains)?
   - YES → Split into multiple skills
   - NO → Single skill

3. Does this overlap with existing skills?
   - Significant overlap → Extend existing skill
   - Partial overlap → Invoke existing skill
   - No overlap → Create new skill

**Examples:**
- `rca-helper` was split into `architect` + `rca-assistant` (architecture reusable)
- `deploy-assistant` stayed single (focused scope)
- `region-buildout` vs `scale-unit-expansion` are separate (different domains)

### Phase 5: Plan Document Creation

Create the plan document. See `references/plan-template.md`.

**Required Sections:**
1. Overview (problem + solution)
2. Scope (in-scope, out-of-scope, dependencies)
3. Exploration Summary (what was found)
4. What Gets Created (directory structure)
5. Key Design Decisions (with rationale)
6. SKILL.md Structure (outline)
7. Script Specifications (if any)
8. Implementation Checklist (phased)

**Output Location:** `artifacts/skills/plans/<skill-name>-skill-planning.md`

### Phase 6: Readiness Assessment

Before marking "Ready to Execute", validate. See `references/readiness-checklist.md`.

**Checklist Categories:**
- [ ] Exploration complete (all sources consulted)
- [ ] Scope defined (in/out clear)
- [ ] Architecture documented (if applicable)
- [ ] Composition decided (single/split/compose)
- [ ] Structure complete (all sections present)
- [ ] Quality checks passed (clear, actionable)
- [ ] User review complete (feedback incorporated)

## After Planning

Once the plan is approved:

1. Update status in plan document: `📝 Draft` → `✅ Ready to Execute`
2. Update `artifacts/skills/plans/skills-status.md`
3. Run **skill-planner-eval** as a gate: `"Evaluate this skill plan with skill-planner-eval"`
4. If approved, invoke `skill-creator` to implement: `"Execute the <skill-name> skill plan"`

## Key Principles

### Planning vs Implementation
- Planning is cheap, implementation is expensive
- Catch issues in the plan, not in code
- Iterate on plans, not implementations

### Skill Composition
- Foundational skills (like `architect`) should be invoked, not duplicated
- Each skill should have a single, clear purpose
- Prefer composition over monolithic skills

### Documentation Balance
- SKILL.md should be <500 lines
- Move detailed content to `references/`
- Only document what Claude doesn't already know

### Progressive Disclosure
- Frontmatter (always loaded): name + description
- SKILL.md body (when triggered): core workflow
- References (as needed): detailed patterns

## Repository Conventions

| Location | Purpose |
|----------|---------|
| `artifacts/skills/plans/` | Plan documents |
| `artifacts/skills/plans/skills-status.md` | Skill tracking |
| `.github/skills/` | Implemented skills |
| `sreagent/` | SRE Agent configurations |

