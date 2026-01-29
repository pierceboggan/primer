# Skill Composition Framework

Deciding whether to create a single skill, split into multiple skills, or compose with existing skills is a critical planning decision.

## Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SKILL COMPOSITION DECISION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Q1: Does this skill need architectural/domain knowledge?                    │
│      │                                                                       │
│      ├── YES → Q2: Does an existing skill provide this knowledge?           │
│      │          │                                                            │
│      │          ├── YES → INVOKE that skill (don't duplicate)               │
│      │          │                                                            │
│      │          └── NO → Q3: Would OTHER future skills need this?           │
│      │                   │                                                   │
│      │                   ├── YES → CREATE separate foundational skill       │
│      │                   │         Then INVOKE it from your skill           │
│      │                   │                                                   │
│      │                   └── NO → EMBED in references/ of your skill        │
│      │                                                                       │
│      └── NO → Continue to Q4                                                │
│                                                                              │
│  Q4: Is the scope too broad?                                                 │
│      │                                                                       │
│      ├── YES (any of these):                                                │
│      │   • SKILL.md would exceed 500 lines                                  │
│      │   • Multiple unrelated workflows                                     │
│      │   • Different expertise required for parts                           │
│      │   → SPLIT into multiple focused skills                               │
│      │                                                                       │
│      └── NO → Continue to Q5                                                │
│                                                                              │
│  Q5: Does this overlap with existing skills?                                 │
│      │                                                                       │
│      ├── SIGNIFICANT OVERLAP → EXTEND existing skill instead               │
│      │                                                                       │
│      ├── PARTIAL OVERLAP → INVOKE existing skill for shared parts          │
│      │                                                                       │
│      └── NO OVERLAP → CREATE new skill                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Composition Patterns

### Pattern 1: Single Focused Skill

**When to Use:**
- Clear, narrow scope
- SKILL.md < 500 lines
- Single domain expertise
- No reusable foundational knowledge

**Example:** `deploy-assistant`
- Focused on deployment workflows
- Two related workflows (TIP/DF monitoring, production rollout)
- No architectural knowledge needed by other skills

```
deploy-assistant/
├── SKILL.md
└── scripts/
    └── [deployment scripts]
```

### Pattern 2: Skill Invokes Existing Skill

**When to Use:**
- Need knowledge another skill already provides
- Want to leverage existing automation
- Avoid duplicating documentation

**Example:** `rca-assistant` invokes `architect`
- rca-assistant needs component/dependency knowledge
- architect skill already has this knowledge
- rca-assistant invokes architect for tracing

```
rca-assistant/
├── SKILL.md (invokes architect for component tracing)
└── references/
    └── [RCA-specific patterns]
```

**How to Invoke:**
In SKILL.md:
```markdown
## Component Tracing

When you need to understand which components are involved or how failures 
propagate, consult the `architect` skill by asking:

- "Which component handles [operation]?"
- "What dependencies does [component] have?"
- "Trace the data flow for [operation]"
```

### Pattern 3: Split into Foundational + Operational Skills

**When to Use:**
- Architecture/domain knowledge is reusable
- Multiple future skills would need same knowledge
- Clear separation between "knowledge" and "workflow"

**Example:** `rca-helper` → `architect` + `rca-assistant`
- Original rca-helper had embedded architecture
- Architecture knowledge useful for incident-investigator, livesite-response
- Split: architect (knowledge) + rca-assistant (workflow)

```
architect/           (foundational - knowledge layer)
├── SKILL.md
└── references/
    ├── components.md
    ├── data-flows.md
    └── failure-propagation.md

rca-assistant/       (operational - workflow layer)
├── SKILL.md (invokes architect)
└── references/
    └── investigation-workflow.md
```

### Pattern 4: Parallel Skills for Different Domains

**When to Use:**
- Similar structure but different domains
- Would confuse users if combined
- Different expertise required

**Example:** `region-buildout` vs `scale-unit-expansion`
- Both are infrastructure skills
- Different processes, different prerequisites
- Kept separate to avoid confusion

```
region-buildout/           (new regions)
├── SKILL.md
└── references/

scale-unit-expansion/      (existing regions)
├── SKILL.md
└── references/
```

## Examples from This Repository

| Original Plan | Problem | Decision | Result |
|---------------|---------|----------|--------|
| rca-helper | Architecture embedded, not reusable | Split | `architect` + `rca-assistant` |
| deploy-assistant | Focused scope, single purpose | Keep single | `deploy-assistant` |
| region-buildout | Different from scale expansion | Keep separate | Two skills |
| skill-planner | Distinct from skill-creator | New skill | `skill-planner` |

## Anti-Patterns to Avoid

### ❌ Duplicating Knowledge
```
skill-a/
└── references/architecture.md  ← Duplicated!

skill-b/
└── references/architecture.md  ← Same content!
```

**Fix:** Create foundational skill, both invoke it.

### ❌ Monolithic Mega-Skill
```
mega-skill/
├── SKILL.md (1500 lines!)
└── references/ (20 files)
```

**Fix:** Split into focused skills.

### ❌ Circular Dependencies
```
skill-a invokes skill-b
skill-b invokes skill-a  ← Circular!
```

**Fix:** Extract shared knowledge to foundational skill.

## Composition Documentation

When composing skills, document in the plan:

```markdown
## Skill Composition

### Skills Invoked
| Skill | Purpose | When Invoked |
|-------|---------|--------------|
| architect | Component tracing | When identifying affected components |
| kusto-helper | Query patterns | When building Kusto queries |

### Rationale
- `architect` provides reusable component knowledge
- Avoids duplicating architecture documentation
- Keeps this skill focused on [specific workflow]
```
