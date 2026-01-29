# Exploration Checklist

Systematic exploration before planning ensures you understand the domain and avoid duplicating existing work.

## Source Priority Order

Explore sources in this order:

### 1. Existing Skills (.github/skills/)

```powershell
# List all existing skills
Get-ChildItem .github/skills -Directory | Select-Object Name

# Read a skill's description
Get-Content .github/skills/<name>/SKILL.md | Select-Object -First 20
```

**Look For:**
- Skills that could be invoked by your new skill
- Skills with overlapping functionality
- Patterns to reuse (structure, reference organization)
- The skill-creator for creation patterns

**Questions:**
- [ ] What skills already exist?
- [ ] Which could this skill invoke?
- [ ] Is there overlap to avoid?

### 2. Wiki Documentation (artifacts/)

```powershell
# Search wiki for topic
Get-ChildItem .wiki -Recurse -Filter "*.md" | Select-String -Pattern "topic"

# List key directories
Get-ChildItem .wiki -Directory | Select-Object Name

# Check sequence diagrams
Get-ChildItem artifacts/Sequence-Diagrams -Filter "*.mmd"
```

**Key Locations:**
- `artifacts/Sequence-Diagrams/` - Data flow diagrams
- `artifacts/DataLayer/` - Data architecture
- `artifacts/TSG/` - Troubleshooting guides
- `artifacts/skills/plans/` - Existing skill plans

**Questions:**
- [ ] What documentation exists for this domain?
- [ ] Are there sequence diagrams showing flows?
- [ ] What TSGs describe operational procedures?

### 3. Source Code (src/)

```powershell
# List main source directories
Get-ChildItem src -Directory | Select-Object Name

# Search for patterns in code
grep -r "pattern" src --include="*.cs" -l

# Find relevant files
Get-ChildItem src -Recurse -Filter "*keyword*"
```

**Key Directories:**
- `src/Administration.ResourceProvider/` - RP (management plane)
- `src/Consent/ConsentServer.Core/` - CS (OAuth flows)
- `src/Integration/APIM.RuntimeAdapter/` - TE (token exchange)
- `src/ScaleGroupManager/` - SGM (routing)
- `src/Data/` - Data layer, Cosmos
- `src/Deployment/` - ARM templates

**Questions:**
- [ ] Which source directories are relevant?
- [ ] What are the key components?
- [ ] How do components interact?

### 4. SRE Agents (sreagent/)

```powershell
# List existing agents
Get-ChildItem sreagent/agents -Directory | Select-Object Name

# List available tools/queries
Get-ChildItem sreagent/tools -Filter "*.yaml"

# Read an agent configuration
Get-Content sreagent/agents/<name>/<name>.yaml
```

**Look For:**
- Existing automation patterns
- Kusto queries to reuse
- Investigation workflows
- Handoff relationships between agents

**Questions:**
- [ ] Are there relevant SRE agents?
- [ ] What Kusto queries exist?
- [ ] What investigation patterns are used?

### 5. Git History

```powershell
# Search commits for keywords
git log --oneline --all --grep="keyword" | head -20

# Find high-activity files (last 6 months)
git log --pretty=format: --name-only --since="6 months ago" | sort | uniq -c | sort -rn | head -20

# See recent changes to a directory
git log --oneline -20 -- src/path/to/dir

# Find commits by pattern in diffs
git log -p --all -S "pattern" -- "*.cs" | head -100
```

**Questions:**
- [ ] What areas have high commit activity?
- [ ] What patterns emerge from recent changes?
- [ ] Who are the domain experts (by commit frequency)?

### 6. External Dependencies

**Document:**
- Partner teams and services
- Required APIs and authentication
- CLI tools needed (az, git, node, etc.)
- External systems (ICM, Kusto, Azure DevOps)

**Questions:**
- [ ] What external services are involved?
- [ ] What authentication is required?
- [ ] What tools must be installed?

## Exploration Summary Template

After exploration, summarize findings:

```markdown
## Exploration Summary

### Sources Consulted
- [x] Existing skills: Found `architect`, `skill-creator` relevant
- [x] Wiki: Reviewed Sequence-Diagrams, DataLayer docs
- [x] Source code: Analyzed src/Consent, src/Integration
- [x] SRE agents: Found WebAppAgent, CosmosAgent patterns
- [x] Git history: High activity in OAuth area (30+ commits)
- [x] Dependencies: Requires Kusto MCP, icm-reader.js

### Key Findings
1. Existing `architect` skill can be invoked for component tracing
2. Sequence diagrams in artifacts/ show OAuth and OBO flows
3. SRE agents have reusable Kusto query patterns
4. Git history shows OAuth area has frequent bugs

### Skills to Invoke
- `architect` - for component and dependency knowledge

### Gaps Identified
- No existing skill for [specific area]
- Wiki missing documentation for [topic]
```

