# Migration to Monorepo (PrelimPro-web / PrelimPro-mobile / shared)

This document describes the automated migration scripts included in `scripts/` and the manual verification steps to finalize the split between the web and mobile codebases.

Files added to the repo:

- `scripts/migrate_to_monorepo.sh` — POSIX shell script (git-aware) to move files.
- `scripts/migrate_to_monorepo.bat` — Windows batch variant.
- `scripts/create_stepping_stone.bat` — (already present) creates a snapshot branch and commit.

Overview of what the migration scripts do

1. Create `PrelimPro-web/`, `PrelimPro-mobile/`, and `shared/` folders.
2. Move the existing Expo `app/` folder and mobile config files into `PrelimPro-mobile/`.
3. Move common code folders (`components`, `contexts`, `lib`, `constants`) into `shared/` if present.
4. Move `babel.config.js` and `metro.config.js` into `PrelimPro-mobile/`.
5. If `PrelimPro-mobile/package.json` does not exist, move the root `package.json` into `PrelimPro-mobile/`; otherwise the root `package.json` is left in place as a backup (`package.json.root.bak`).

Important: the scripts use `git mv` when a git repository is present; otherwise they use plain `mv`/`move`. Review the planned changes before committing.

Post-migration verification checklist

1. Create a stepping-stone snapshot (local branch + commit):

   - Windows: `scripts\create_stepping_stone.bat`
   - POSIX: commit manually or create your own helper

2. Inspect the repository layout; expected layout:

```
PrelimPro-web/
PrelimPro-mobile/
shared/
.github/
.vscode/
README.md
STEPPING_STONE.md
```

3. Per-package dependency install & checks

- Web:
  - `cd PrelimPro-web`
  - `npm install` (or `yarn`/`pnpm`)
  - `npm run dev` (Next.js dev server) or `npm run build` to test production build

- Mobile:
  - `cd PrelimPro-mobile`
  - `npm install`
  - `expo start` (or `npx expo start`)

4. TypeScript & lint checks (run inside each package):

- `npm run typecheck`
- `npm run lint`

5. Fix import paths

- Update imports in moved files to use `@shared/*` where appropriate or relative imports to the new `shared/` location. Use the `tsconfig.json` path mapping included in each package to reference `@shared/*`.

6. Metro resolver (mobile) — ensure `PrelimPro-mobile/metro.config.js` includes `nodeModulesPaths` and `extraNodeModules` for shared code (script already attempts to move metro config; verify `watchFolders` and `nodeModulesPaths` as needed).

7. Update CI workflows

- Adjust `.github/workflows/deploy-web.yml` to run in `PrelimPro-web` working-directory (set `working-directory: PrelimPro-web` on steps that run `npm ci` and `npm run build`).

8. Once verification passes, create a permanent branch and push:

```
git checkout -b split/web-mobile
git add -A
git commit -m "chore: split repo into PrelimPro-web / PrelimPro-mobile / shared"
git push origin split/web-mobile
```

Troubleshooting hints

- If Next.js build complains about `@shared` imports, ensure `PrelimPro-web/next.config.js` contains the webpack alias `@shared` pointing to `../shared` and `PrelimPro-web/tsconfig.json` has the same path mapping.
- If Metro can't resolve `shared` modules, add `watchFolders: [path.resolve(__dirname, '..', 'shared')]` to `PrelimPro-mobile/metro.config.js` and include `../node_modules` in `nodeModulesPaths`.
- If server-side rendering fails because `Button.native` is required during SSR, change `shared/components/Button.tsx` detection logic to favor web for SSR (e.g., check `process.emitWarning` or use environment variable).

If you want, I can now:

- Generate the POSIX stepping-stone script to parallel the Windows one.
- Update `.github/workflows/deploy-web.yml` to run builds from `PrelimPro-web`.
- Create a one-shot script to run `npm install` in each package and run `tsc --noEmit` (simulation only).
