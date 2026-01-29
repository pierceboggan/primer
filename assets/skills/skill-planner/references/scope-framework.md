# Scope Definition Framework

Clear scope definition prevents scope creep and ensures focused, maintainable skills.

## Required Scope Elements

Every skill plan must define:

### 1. In-Scope

What the skill explicitly covers:

```markdown
## Scope

### In-Scope
| Item | Description |
|------|-------------|
| Feature A | Create, update, delete operations for X |
| Workflow B | Step-by-step guide for Y process |
| Platform C | Support for Power Platform environments |
```

**Be Specific:**
- ❌ "Handle connections" (too vague)
- ✅ "Create OAuth connections for 3P connectors"

### 2. Out-of-Scope

What is explicitly excluded and why:

```markdown
### Out-of-Scope
| Item | Reason | Alternative |
|------|--------|-------------|
| Logic Apps | Different architecture | Future: logic-apps-skill |
| Sovereign clouds | Different auth model | See TSG for manual process |
| v2 API | Not yet stable | Will add in future version |
```

**Always Provide:**
- Clear reason for exclusion
- Alternative or future plan

### 3. Dependencies

What the skill requires:

```markdown
### Dependencies
| Dependency | Type | Notes |
|------------|------|-------|
| architect | Skill (invokes) | For component tracing |
| Kusto MCP | Tool | For telemetry queries |
| az CLI | Tool | Must be installed and authenticated |
| ICM access | Permission | Browser auth required |
```

**Dependency Types:**
- **Skill (invokes)** - Another skill this skill calls
- **Tool** - External CLI or service
- **Permission** - Access rights needed
- **Service** - External API or system

### 4. Platform/Environment Considerations

```markdown
### Platform Support
| Platform | Supported | Notes |
|----------|-----------|-------|
| Power Platform | ✅ Yes | Primary focus |
| Logic Apps | ❌ No | Different architecture |
| Sovereign (USGov) | ⚠️ Limited | Some features unavailable |
| Local dev | ✅ Yes | With emulator |
```

## Scope Decision Criteria

Use these questions to determine scope:

### Should This Be a Separate Skill?

| Question | If Yes | If No |
|----------|--------|-------|
| Is this a distinct domain? | Separate skill | Include in current |
| Would multiple skills need this knowledge? | Create foundational skill | Embed in current |
| Does this require different expertise? | Separate skill | Include in current |
| Is this optional/advanced functionality? | Move to references/ | Include in SKILL.md |

### Should This Be Split?

| Signal | Action |
|--------|--------|
| SKILL.md would exceed 500 lines | Split into references or multiple skills |
| Multiple unrelated workflows | Consider separate skills per workflow |
| Platform-specific variations | Consider platform-specific skills |
| Reusable architecture knowledge | Extract to foundational skill |

### Examples from This Repository

| Original | Decision | Result |
|----------|----------|--------|
| rca-helper (embedded architecture) | Architecture reusable | Split: `architect` + `rca-assistant` |
| deploy-assistant | Focused scope | Single skill |
| region-buildout vs scale-unit | Different domains | Two separate skills |

## Scope Negotiation

When scope is unclear, ask clarifying questions:

```markdown
Before I plan this skill, I need to understand the scope:

1. **Platforms**: Should this support Power Platform only, or also Logic Apps?
2. **Environments**: Production only, or also TIP/DF?
3. **Clouds**: Public Azure only, or also sovereign clouds?
4. **Depth**: Quick reference or comprehensive guide?
5. **Automation**: Guidance only, or scripts for automation?
```

## Scope Documentation Template

```markdown
## Scope

### In-Scope
| Item | Description |
|------|-------------|
| [Feature 1] | [What it covers] |
| [Feature 2] | [What it covers] |

### Out-of-Scope (Explicitly Excluded)
| Item | Reason | Alternative |
|------|--------|-------------|
| [Excluded 1] | [Why] | [What to use instead] |
| [Excluded 2] | [Why] | [Future plans] |

### Dependencies
| Dependency | Type | Notes |
|------------|------|-------|
| [Dep 1] | [Type] | [Details] |
| [Dep 2] | [Type] | [Details] |

### Platform/Environment Support
| Platform | Supported | Notes |
|----------|-----------|-------|
| [Platform 1] | ✅/❌/⚠️ | [Details] |
| [Platform 2] | ✅/❌/⚠️ | [Details] |
```
