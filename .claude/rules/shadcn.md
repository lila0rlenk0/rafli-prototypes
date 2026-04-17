---
paths:
  - 'src/components/**/*.tsx'
---

# shadcn/ui

Primitives in `src/components/ui/`. Managed by CLI — `bunx --bun shadcn@latest add <component>`. Never hand-edit files in `ui/`.

## Usage

- always prefer a shadcn primitive over a hand-rolled or third-party equivalent
- missing primitive → install it via CLI, never fork
- import from `@/components/ui/<component>` — e.g., `import { Button } from '@/components/ui/button'`
- compose primitives into domain components — never extend or fork `ui/` files

## Styling

- `className` for layout only — never override component colors/typography
- `gap-*` not `space-x-*` / `space-y-*`
- `size-*` when width = height
- `truncate` shorthand
- no manual `dark:` overrides — semantic tokens handle theming
- `cn()` for conditional classes — no template literal ternaries
- no manual `z-index` on overlays — primitive handles stacking

## Composition

- items inside groups: `SelectItem` in `SelectGroup`, `DropdownMenuItem` in `DropdownMenuGroup`
- Dialog/Sheet/Drawer need Title (use `className="sr-only"` if hidden)
- full Card: `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter`
- `TabsTrigger` inside `TabsList`
- `Avatar` needs `AvatarFallback`
- toasts via `sonner` — `toast()` from `sonner`

## Icons

- `data-icon="inline-start"` or `data-icon="inline-end"` inside Button — CSS handles sizing
- no `size-*` classes on icons inside shadcn primitives
- import from `lucide-react` — tree-shaken via `optimizePackageImports` in `next.config.ts`

## Colors

Semantic tokens only (`bg-primary`, `text-muted-foreground`). Never raw scales (`bg-blue-500`). Use built-in variants before adding custom styles.
