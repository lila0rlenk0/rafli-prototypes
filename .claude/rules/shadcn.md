---
paths:
  - 'src/components/**'
---

# shadcn/ui

Components in `src/components/ui/`. CLI: `bunx --bun shadcn@latest`.

## Styling

- `className` for layout only — never override component colors/typography
- `gap-*` not `space-x-*`/`space-y-*`
- `size-*` when width = height
- `truncate` shorthand
- no manual `dark:` — use semantic tokens (`bg-background`, `text-muted-foreground`)
- `cn()` for conditional classes — no template literal ternaries
- no manual `z-index` on overlays

## Composition

- items inside groups: `SelectItem` in `SelectGroup`, `DropdownMenuItem` in `DropdownMenuGroup`
- Dialog/Sheet/Drawer need Title (use `className="sr-only"` if hidden)
- full Card: `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`
- `TabsTrigger` inside `TabsList`
- `Avatar` needs `AvatarFallback`
- toast via `sonner` — `toast()` from `sonner`

## Icons

- `data-icon="inline-start"` or `data-icon="inline-end"` in Button
- no sizing classes on icons inside shadcn — CSS handles it
- import from `lucide-react` (tree-shaken via `optimizePackageImports`)

## Colors

Semantic tokens only (`bg-primary`, `text-muted-foreground`), never raw (`bg-blue-500`). Built-in variants before custom styles.
