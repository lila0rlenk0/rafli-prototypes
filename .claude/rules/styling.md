---
paths:
  - 'src/**/*.tsx'
---

# Styling

## cn()

Always use `cn()` from `@/lib/utils` for conditional or merged classes. Handles Tailwind conflicts correctly.

```tsx
<div
	className={cn(
		'flex items-center gap-2 rounded-md p-3',
		isActive && 'bg-accent text-accent-foreground',
		className,
	)}
/>
```

- never string-concatenate Tailwind classes
- never template-literal ternaries — `cn('a', cond && 'b')`
- Prettier plugin auto-sorts class order

## Variants — CVA

- `class-variance-authority` for components with multiple visual states
- `variants` object, named options, never conditional class strings
- export variant types: `type ButtonVariant = VariantProps<typeof buttonVariants>`

## Layout conventions

- mobile-first: base = mobile, `sm:`/`md:`/`lg:` stack upward
- `flex` for 1D, `grid` for 2D
- space siblings via parent `gap-*` — never `mb-*` on last child
- spacing scale: multiples of 2 (`p-2`, `p-4`, `p-6`, `p-8`)

## shadcn overrides

- `className` for layout only — never override component colors/typography
- semantic tokens only — never raw scales inside primitives
- built-in variants before custom styles

## Forbidden

- arbitrary values where a token works: `w-[347px]`, `text-[13px]`, `#1a1a1a`
- inline `style={}` for anything Tailwind can express
- duplicate base classes via `cn()` — let tailwind-merge collapse them once, not at two call sites
