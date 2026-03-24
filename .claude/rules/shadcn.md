---
paths:
  - 'src/components/**'
---

# shadcn/ui Conventions

Project uses shadcn components in `src/components/ui/`. CLI: `bunx --bun shadcn@latest`.

## Styling

- `className` for layout only — never override component colors or typography
- `gap-*` not `space-x-*`/`space-y-*` — use `flex` with `gap-*`, vertical stacks: `flex flex-col gap-*`
- `size-*` when width equals height — `size-10` not `w-10 h-10`
- `truncate` shorthand — not `overflow-hidden text-ellipsis whitespace-nowrap`
- No manual `dark:` overrides — use semantic tokens (`bg-background`, `text-muted-foreground`)
- `cn()` for conditional classes — no template literal ternaries
- No manual `z-index` on overlay components (Dialog, Sheet, Popover handle stacking)

## Composition

- Items inside their Group: `SelectItem` in `SelectGroup`, `DropdownMenuItem` in `DropdownMenuGroup`
- Dialog/Sheet/Drawer always need a Title component (use `className="sr-only"` if hidden)
- Full Card composition: `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`
- `TabsTrigger` must be inside `TabsList`
- `Avatar` always needs `AvatarFallback`
- Use `Alert` for callouts, `Badge` for status, `Skeleton` for loading, `Separator` for dividers
- Toast via `sonner` — `toast()` from `sonner`

## Icons

- Icons in Button use `data-icon="inline-start"` or `data-icon="inline-end"`
- No sizing classes on icons inside shadcn components — CSS handles it
- Import from `lucide-react` (barrel imports, tree-shaken via `optimizePackageImports`)

## Semantic Colors

- `bg-primary`, `text-muted-foreground` — never raw values like `bg-blue-500`
- Use built-in variants (`variant="outline"`, `size="sm"`) before custom styles
