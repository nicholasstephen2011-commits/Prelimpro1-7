#!/usr/bin/env bash
set -euo pipefail

# Create a timestamped branch and commit all current changes as a stepping-stone snapshot.
# Run from the repository root where git is available.

timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
branch_name="stepping-stone-${timestamp}"

echo "Creating branch ${branch_name} and committing current state..."
git checkout -b "${branch_name}"
git add -A
git commit -m "chore: stepping-stone snapshot ${timestamp}" || {
  echo "Nothing to commit or commit failed."
}

echo "Snapshot committed on branch ${branch_name}. To push: git push origin ${branch_name}"
