# Architecture Documentation Patterns

Not all skills need architecture documentation. This guide helps you decide when and how to document architecture.

## When Architecture Documentation is Needed

| Skill Type | Need Architecture? | Depth | Example |
|------------|-------------------|-------|---------|
| **Operations** (RCA, incident, livesite) | ✅ Yes | Deep | Components, flows, failures |
| **Infrastructure** (region, scale unit) | ✅ Yes | Medium | Resources, dependencies |
| **Development** (connector, API) | ⚠️ Maybe | Light | Relevant APIs only |
| **Utility** (PDF, formatting) | ❌ No | N/A | - |

**Rule of Thumb:** If the skill needs to understand how requests flow through the system or how failures propagate, document architecture.

## What to Document

### 1. Components Involved

```markdown
### Components
| Component | Role in This Skill | Key Interactions |
|-----------|-------------------|------------------|
| RP | Connection management | Reads/writes Cosmos |
| TE | Token exchange | Calls OAuth providers |
| CS | Consent flow | Stores tokens |
| SGM | Environment routing | Maps env → scale unit |
```

### 2. Data Flows

Choose the appropriate pattern based on complexity:

**Pattern 1: Simple Flow (inline text)**
```
Client → APIM → TE → Cosmos → Response
```

**Pattern 2: Box Diagram (component relationships)**
```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │────▶│  APIM   │────▶│   TE    │
└─────────┘     └─────────┘     └────┬────┘
                                     │
                                     ▼
                               ┌─────────┐
                               │ Cosmos  │
                               └─────────┘
```

**Pattern 3: Detailed Flow (numbered steps)**
```markdown
### Token Exchange Flow

1. Client sends request to Runtime APIM with connection ID
2. APIM extracts connection ID from headers
3. APIM calls Token Exchange (TE) to get access token
4. TE looks up connection in Cosmos (checks Redis cache first)
5. TE retrieves encrypted refresh token
6. TE decrypts using Key Vault
7. TE exchanges refresh token with OAuth provider
8. TE caches access token in Redis
9. TE returns access token to APIM
10. APIM forwards request to backend with access token
```

**Pattern 4: Multi-tier Architecture**
```
┌─────────────────────────────────────────────────────────┐
│                    SCALE GROUP                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │                      SGM                         │    │
│  │  Environment → Scale Unit routing               │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│          ┌───────────────┴───────────────┐              │
│          ▼                               ▼              │
│  ┌───────────────────┐       ┌───────────────────┐     │
│  │   Scale Unit 001  │       │   Scale Unit 002  │     │
│  │  RP, TE, CS, Jobs │       │  RP, TE, CS, Jobs │     │
│  └───────────────────┘       └───────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 3. Dependencies

```markdown
### Component Dependencies
| Component | Dependencies | Failure Impact |
|-----------|--------------|----------------|
| RP | Cosmos, Key Vault, Storage | CRUD operations fail |
| TE | Cosmos, Redis, Key Vault | Token exchange fails |
| CS | Cosmos, Redis, External OAuth | Login flow fails |
| SGM | Cosmos, DNS | Routing fails |
```

### 4. Failure Propagation

```markdown
### Failure Impact

**If Cosmos fails:**
└──▶ All components lose data access
    └──▶ Complete service outage

**If Redis fails:**
└──▶ TE/CS cache misses
    └──▶ Increased Cosmos load
        └──▶ Potential throttling

**If Key Vault fails:**
└──▶ Cannot decrypt tokens
    └──▶ Token exchange fails
        └──▶ Runtime calls fail
```

### 5. Relevant Telemetry

```markdown
### Kusto Tables
| Component | Primary Table | Key Fields |
|-----------|---------------|------------|
| RP | ApiHubRPHttpIncomingRequests | StatusCode, Duration |
| TE | ApiHubTokenExchangeLogs | ErrorCode, ConnectionId |
| CS | ApiHubCstSvrRequests | LoginType, Result |
| SGM | ApiHubSGMLogs | Operation, ScaleUnit |
```

## Architecture Documentation Template

```markdown
## Architecture Analysis

### Components Involved
| Component | Role | Key Interactions |
|-----------|------|------------------|
| [Component] | [Role in this skill] | [What it talks to] |

### Data Flow: [Flow Name]
[Diagram or numbered steps]

### Dependencies
| Component | Dependencies | Failure Impact |
|-----------|--------------|----------------|
| [Component] | [Deps] | [What fails] |

### Failure Propagation
[Key failure chains relevant to this skill]

### Telemetry Reference
| Component | Kusto Table | Key Fields |
|-----------|-------------|------------|
| [Component] | [Table] | [Fields] |
```

## When to Create a Separate Architect Skill

Create a separate foundational "architect" skill when:

1. **Multiple skills need the same architecture knowledge**
   - rca-assistant, incident-investigator, livesite-response all need component knowledge
   
2. **Architecture is complex enough to warrant dedicated documentation**
   - Multi-tier, many components, complex flows

3. **Architecture knowledge has value beyond current skill**
   - Reusable for future skills

**Example:** The `architect` skill was created because both `rca-assistant` and future `incident-investigator` need component/dependency knowledge.
