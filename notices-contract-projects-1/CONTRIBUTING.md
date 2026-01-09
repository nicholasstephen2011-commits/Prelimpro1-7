# Contributing

Thank you for contributing — this file documents branch/PR conventions and tips for using GitKraken/GitLens.

## Branch naming

- `feature/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `chore/<short-description>` — housekeeping (deps, formatting)
- `hotfix/<short-description>` — urgent fixes to release

Keep branch names short, lowercase, and hyphen-separated.

## Commit messages

Use Conventional Commits-style messages: `type(scope): short summary`. Examples:

- `feat(auth): add magic link login`
- `fix(pdf): correct page orientation`

## Pull requests

- Create PRs against `main` (feature branches should branch from `main`).
- Fill out the PR template at `.github/pull_request_template.md`.
- Link related issues in the PR description.

## GitKraken / GitLens tips

- GitKraken: open the repository in GitKraken for visual branch management and conflict resolution.
- Use GitKraken to create branches from the UI using our naming conventions.
- GitLens: use the sidebar to inspect commits, authorship, and for quick code lens blame information.
- Use GitLens' Compare feature to review diffs across commits or branches before opening PRs.

## CI / Local checks

- Run local typecheck: `npm run typecheck` (or `yarn typecheck`).
- Run linter: `npm run lint`.
- Run tests: `npm test` or `npm run test -- --watch`.

## Need help?

Open an issue or DM a maintainer for guidance.
