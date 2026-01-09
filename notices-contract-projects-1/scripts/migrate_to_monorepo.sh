#!/usr/bin/env bash
set -euo pipefail

echo "Starting migration to monorepo layout (PrelimPro-web, PrelimPro-mobile, shared)"

root_dir="$(pwd)"
echo "Working directory: $root_dir"

mkdir -p PrelimPro-web PrelimPro-mobile shared

mv_or_git() {
  src="$1"
  dest="$2"
  if [ -e "$src" ]; then
    if command -v git >/dev/null 2>&1 && [ -d .git ]; then
      echo "git mv $src $dest"
      git mv "$src" "$dest" || (echo "git mv failed, falling back to mv" && mv "$src" "$dest")
    else
      echo "mv $src $dest"
      mv "$src" "$dest"
    fi
  else
    echo "Skipping missing: $src"
  fi
}

echo "Moving Expo app and mobile config files into PrelimPro-mobile/"
mv_or_git app PrelimPro-mobile/app || true

if [ -f app.json ]; then
  if [ -f PrelimPro-mobile/app.json ]; then
    echo "PrelimPro-mobile/app.json already exists — leaving root app.json in place"
  else
    mv_or_git app.json PrelimPro-mobile/app.json
  fi
fi

mv_or_git babel.config.js PrelimPro-mobile/babel.config.js
mv_or_git metro.config.js PrelimPro-mobile/metro.config.js

echo "Moving shared code (components, contexts, lib, constants) into shared/"
for d in components contexts lib constants; do
  if [ -d "$d" ]; then
    mv_or_git "$d" shared/
  else
    echo "No $d folder found, skipping"
  fi
done

echo "Handling package.json positioning"
if [ -f PrelimPro-mobile/package.json ]; then
  echo "PrelimPro-mobile/package.json already exists (from scaffolding)."
  echo "Leaving root package.json in place as a backup: package.json.root.bak"
  if [ -f package.json ]; then cp package.json package.json.root.bak && echo "Backed up root package.json to package.json.root.bak"; fi
else
  if [ -f package.json ]; then
    mv_or_git package.json PrelimPro-mobile/package.json
  fi
fi

echo "Adjusting root files: README, .github, .vscode remain at repo root."

echo "Migration complete. Create a stepping-stone commit now (use scripts/create_stepping_stone.bat or .sh)"

echo "Post-migration steps (run locally):"
echo "  - Inspect the tree: ls -la"
echo "  - In PrelimPro-web: npm install && npm run dev (or pnpm/yarn)"
echo "  - In PrelimPro-mobile: npm install && expo start"

echo "Done."
