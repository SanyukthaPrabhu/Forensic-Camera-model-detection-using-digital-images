import { clsx } from 'clsx';

/**
 * Utility for merging class names (cn = class names).
 * Wraps clsx since we don't have tailwind-merge installed.
 */
export function cn(...inputs) {
  return clsx(inputs);
}
