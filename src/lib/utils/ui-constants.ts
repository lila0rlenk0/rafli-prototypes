/**
 * Delay before resetting form state after a dialog closes.
 * Must match the Radix Dialog exit animation duration (`duration-200` in dialog.tsx).
 * Used by modal components that need to defer form resets until after the close animation completes,
 * preventing visual flicker of empty fields during the exit transition.
 */
export const DIALOG_EXIT_ANIMATION_MS = 200;
