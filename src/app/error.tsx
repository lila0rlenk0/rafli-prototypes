'use client';

// -- Next 16: `error.tsx` is rendered on the client, so the file itself
// must carry `'use client'`. Re-exporting an already-client component no
// longer satisfies the directive check — Turbopack reads the boundary
// off this module, not the module it imports from.
export { SegmentRouteError as default } from '@/components/ui-custom/segment-route-error';
