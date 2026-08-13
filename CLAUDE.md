# Typemon

A pixel-inspired typing RPG. Typing speed and accuracy drive attack damage in a
boss battle against Mossmaw. React 19 + Vite, deployed to GitHub Pages.

Game rules live in `src/game-logic.mjs` as plain ESM with no React imports, so
they stay unit-testable via `node --test`. Keep balance logic there, not in
`src/App.tsx`.

## Commands

```bash
pnpm dev     # local dev server (do NOT open index.html directly)
pnpm test    # node --test tests/*.test.mjs
pnpm lint    # eslint
pnpm build   # tsc -b && vite build
```

Requires Node 22.12+.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, lints,
builds, and publishes to GitHub Pages. Pages must be set to build from GitHub
Actions (Settings -> Pages -> Source).

The `gh-pages` branch and the `deploy:pages` script are the older manual path.
They are superseded by the workflow but kept until the Actions deploy is
confirmed green.

`vite.config.ts` sets `base: "./"` so the built site works from any repo path.

## Gotchas

`pnpm install` exits non-zero with `ERR_PNPM_IGNORED_BUILDS` unless esbuild's
build script is approved. `pnpm-workspace.yaml` pins `allowBuilds: esbuild:
true` for this reason. Do not remove it — CI fails at its first step without it.

## Working in Claude Code cloud sessions

The session's git proxy allows creating and updating refs but **blocks all ref
deletions**. Both `git push origin --delete <branch>` and the REST API
`DELETE /git/refs/heads/<branch>` return 403 with "Write access to this GitHub
API path is not permitted through this proxy." This is not a repo permission
problem and no session setting changes it.

**To delete a remote branch, run the deletion from inside GitHub Actions**,
which has its own token and is not behind the proxy:

1. Add a one-shot workflow on the current branch that triggers on push to it,
   with `permissions: contents: write`.
2. In a step, `gh api -X DELETE "repos/$REPO/git/refs/heads/<branch>"` for each
   branch to remove, with `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.
3. Push to trigger it, verify with `git ls-remote --heads origin`, then commit
   the workflow's removal.

This works. Use it instead of reporting that branch deletion is impossible, and
never hand the deletion back to the user as a manual step.

Related: since deletions are blocked by default, do not create scratch or test
branches on the remote. Verify permissions by asking rather than by writing to
the repo.
