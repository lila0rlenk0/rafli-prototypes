# Real Architecture Examples

## Example 1: Kotlin Clean Architecture

```
myapp/
├── CLAUDE.md                          # 80 tokens
│   # MyApp
│   Android app using Clean Architecture.
│   ## Commands
│   - ./gradlew build
│   - ./gradlew test
│   ## Shared
│   @docs/architecture.md
│
├── domain/CLAUDE.md                   # 150 tokens
│   # Domain Layer
│   CRITICAL: Zero android.* imports
│   NEVER: Suspend without Result wrapper
│   @model/CLAUDE.md
│   @usecase/CLAUDE.md
│
├── domain/model/CLAUDE.md             # 100 tokens
│   # Models
│   ## Files
│   - User.kt, Order.kt, Money.kt
│   ## Pattern: data class + value class IDs
│
├── data/CLAUDE.md                     # 180 tokens
│   # Data Layer
│   Repository implementations.
│   ALWAYS: Map to domain types
│   NEVER: Expose Room entities
│
└── presentation/CLAUDE.md             # 200 tokens
    # Presentation
    MVVM with Compose.
    ALWAYS: Single StateFlow per ViewModel
    @components/CLAUDE.md
```

## Example 2: TypeScript Monorepo

```
monorepo/
├── CLAUDE.md                          # 100 tokens
│   # Monorepo
│   pnpm workspace with Turborepo.
│   ## Commands
│   - pnpm dev, pnpm test, pnpm build
│   @docs/conventions.md
│
├── packages/core/CLAUDE.md            # 150 tokens
│   # @myapp/core
│   Shared business logic.
│   NEVER: Import from other packages
│   ALWAYS: Export types explicitly
│
├── packages/api/CLAUDE.md             # 200 tokens
│   # @myapp/api
│   Express + tRPC.
│   ALWAYS: Zod validation on inputs
│   NEVER: Throw untyped errors
│
└── apps/web/CLAUDE.md                 # 180 tokens
    # Web App
    Next.js 14 App Router.
    ALWAYS: Server components default
    NEVER: 'use client' in page.tsx
```

## Example 3: Python ML Project

```
ml-project/
├── CLAUDE.md                          # 90 tokens
│   # ML Project
│   PyTorch training pipeline.
│   ## Commands
│   - uv run train, uv run evaluate
│   @docs/model-spec.md
│
├── src/data/CLAUDE.md                 # 120 tokens
│   # Data Pipeline
│   ## Files
│   - dataset.py, transforms.py
│   ALWAYS: Return torch.Tensor
│   NEVER: Load full dataset to memory
│
├── src/models/CLAUDE.md               # 150 tokens
│   # Models
│   ALWAYS: nn.Module subclass
│   ALWAYS: Type hints for forward()
│   Pattern: See @src/models/base.py:1-20
│
└── src/training/CLAUDE.md             # 130 tokens
    # Training
    ALWAYS: Use accelerate
    NEVER: Manual device placement
```

## Loading Behavior Summary

| Action | What Loads |
|--------|------------|
| `cd project && claude` | Root + parent chain |
| Edit `domain/model/User.kt` | + domain/ + domain/model/ |
| `@docs/arch.md` in any loaded file | + docs/arch.md |

Total context = sum of loaded nodes ≈ 300-600 tokens typical.
