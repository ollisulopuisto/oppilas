# Changelog

## Unreleased

- Fix npm ci dependency resolution by using TypeScript 6.0.3, the major supported by SvelteKit 3.1.1 and the installed TypeScript ESLint parser. Regenerate the lockfile; do not bypass peer dependency checks.
- Verified locally: npm ci, svelte-check (zero errors or warnings), and the static production build. No deployment performed.
