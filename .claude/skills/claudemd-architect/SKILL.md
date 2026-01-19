---
name: claudemd-architect
description: Design and implement distributed CLAUDE.md memory architectures for Claude Code projects. Use when user wants to (1) optimize context token usage, (2) create modular CLAUDE.md hierarchies, (3) implement @import relationships between memory files, (4) audit/refactor existing CLAUDE.md bloat, (5) set up layer-specific architectural guardrails, or (6) bootstrap memory structure for new/existing codebases.
---

# CLAUDE.md Context Architecture

Distributed memory system treating CLAUDE.md files as a normalized context database.

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Nodes** | Co-located CLAUDE.md per directory |
| **Edges** | @imports between files |
| **Loading** | Progressive—triggered by file access |
| **Constraints** | Golden Rules enforced at load time |

## Token Budget Targets

| Level | Tokens | Content |
|-------|--------|---------|
| Root | 100-150 | Commands, structure, critical rules |
| Layer | 200-400 | Responsibilities, patterns, golden rules |
| Sublayer | 100-200 | File inventory, conventions, few-shots |
| Leaf | 50-100 | Minimal constraints |

## Workflow

### 1. Audit Existing Structure

```bash
# Find all memory files
find . -name "CLAUDE*.md" -exec wc -l {} \;

# Check token usage (rough: words * 1.3)
cat CLAUDE.md | wc -w
```

If root >400 tokens or monolithic → split.

### 2. Map Architecture Layers

Identify boundaries:
- **Domain**: Pure business logic, zero framework imports
- **Application**: Use cases, orchestration
- **Infrastructure**: Framework adapters, external services
- **Presentation**: UI/API layer

Each boundary gets its own CLAUDE.md.

### 3. Create Node Structure

See references/templates.md for node templates.

```
project/
├── CLAUDE.md                 # Root: ~100 tokens
├── domain/CLAUDE.md          # Layer: golden rules
│   ├── model/CLAUDE.md       # Sublayer: file inventory
│   └── service/CLAUDE.md
├── infra/CLAUDE.md
└── docs/
    ├── architecture.md       # Shared reference
    └── glossary.md
```

### 4. Wire @imports

Root CLAUDE.md:
```markdown
@docs/architecture.md
@docs/glossary.md
@~/.claude/my-prefs.md
```

Layer CLAUDE.md:
```markdown
@model/CLAUDE.md
@service/CLAUDE.md
```

Rules: Max 5 hops, no cycles, prefer flat.

### 5. Extract Golden Rules

Derive FROM actual code:

```markdown
CRITICAL: Zero framework imports in domain
NEVER: Direct DB calls from domain
ALWAYS: Value objects for IDs
```

### 6. Add Few-Shot Patterns

Extract templates from existing files—see references/templates.md.

### 7. Override Hierarchy

```
~/.claude/personal.md          # Highest priority
project/CLAUDE.local.md        # Git-ignored
project/CLAUDE.md              # Team-shared
project/layer/CLAUDE.md        # Layer-specific
```

## Anti-Patterns

| Anti-Pattern | Fix |
|--------------|-----|
| Monolithic root (>400 tokens) | Split into layers |
| Abstract rules | Extract from code |
| Duplicate content | @import shared |
| Deep nesting (>5 hops) | Flatten |
| No file inventory | List files in leaves |
| Code style in CLAUDE.md | Use linter |

## Resources

- **references/templates.md** - Node templates by type
- **references/examples.md** - Real architecture examples
- **scripts/scaffold.py** - Generate structure from config
