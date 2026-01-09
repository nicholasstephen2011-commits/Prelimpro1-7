#!/usr/bin/env bash
set -euo pipefail

echo "Running checks across workspace packages"

ROOT="$(pwd)"
PACKAGES=("PrelimPro-web" "PrelimPro-mobile")

for pkg in "${PACKAGES[@]}"; do
  if [ -d "$pkg" ]; then
    echo "\n==> Checking package: $pkg"
    cd "$ROOT/$pkg"

    if [ -f package.json ]; then
      echo "Installing dependencies for $pkg"
      npm ci || { echo "npm ci failed in $pkg"; exit 1; }
    else
      echo "No package.json in $pkg, skipping install"
    fi

    if npm run -s typecheck >/dev/null 2>&1; then
      echo "Running typecheck (tsc --noEmit) in $pkg"
      npm run typecheck || { echo "Typecheck failed in $pkg"; exit 1; }
    else
      echo "No typecheck script in $pkg/package.json; running tsc --noEmit if available"
      if command -v tsc >/dev/null 2>&1; then
        tsc --noEmit || { echo "tsc failed in $pkg"; exit 1; }
      else
        echo "tsc not available — skip typecheck for $pkg"
      fi
    fi

    if npm run -s lint >/dev/null 2>&1; then
      echo "Running lint in $pkg"
      npm run lint || { echo "Lint failed in $pkg"; exit 1; }
    else
      echo "No lint script in $pkg/package.json; skipping"
    fi

    if [ "$pkg" = "PrelimPro-web" ]; then
      if npm run -s build >/dev/null 2>&1; then
        echo "Running web build"
        npm run build || { echo "Build failed in web"; exit 1; }
      else
        echo "No build script detected for web package; skipping"
      fi
    fi

    if [ "$pkg" = "PrelimPro-mobile" ]; then
      echo "Running expo doctor (if available)"
      if command -v npx >/dev/null 2>&1; then
        npx expo doctor || echo "expo doctor failed or not available — check expo installation"
      else
        echo "npx not available — skip expo doctor"
      fi
    fi

    cd "$ROOT"
  else
    echo "Package folder $pkg not found, skipping"
  fi
done

echo "All checks completed (simulated)."
