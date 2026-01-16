# CLAUDE.md Node Templates

## Root Node (~100-150 tokens)

```markdown
# [Project Name]

[One sentence purpose]

## Commands
- `npm run dev` - dev server
- `npm test` - tests
- `npm run lint` - lint

## Structure
- src/ - source
- tests/ - tests  
- docs/ - docs

## Critical
ALWAYS: Test before commit
NEVER: Commit secrets

## Shared
@docs/architecture.md
```

## Layer Node (~200-400 tokens)

```markdown
---
title: Domain Layer
pattern: Clean Architecture
---

# Domain

Business logic, zero external deps.

## Golden Rules

CRITICAL: No framework imports
NEVER: Direct I/O
ALWAYS: Result<T,E> for errors

## Sublayers
@model/CLAUDE.md
@service/CLAUDE.md

## Patterns

### Entity
```kotlin
data class Entity(
    val id: EntityId,
    val createdAt: Instant
)
```

### Value Object
```kotlin
@JvmInline
value class EntityId(val value: UUID)
```
```

## Sublayer Node (~100-200 tokens)

```markdown
# Model

Domain entities and value objects.

## Files
- User.kt - user aggregate
- Order.kt - order entity
- Money.kt - value object

## Conventions
- Entities: data class + EntityId
- Value objects: @JvmInline
- Immutable: use copy()

## Forbidden
- ❌ Mutable state
- ❌ Framework annotations
```

## Leaf Node (~50-100 tokens)

```markdown
# Repositories

Repository interfaces.

## Files
- UserRepository.kt
- OrderRepository.kt

## Rules
- Interface only
- Suspend for async
- Domain types only
```

## Personal Override

```markdown
# My Preferences

- Explicit types
- 100 char lines
- Always branch first
```
