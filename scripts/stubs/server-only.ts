/**
 * Stub for the `server-only` package used by standalone Node scripts.
 *
 * The real package intentionally throws outside a React Server Component graph.
 * The seed script is plain Node, so `scripts/tsconfig.json` aliases `server-only`
 * here to keep the models importable without weakening the Next.js guarantee.
 */
export {};