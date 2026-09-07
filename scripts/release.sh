#!/usr/bin/env bash
# scripts/release.sh <version> [--yes] [--push] [--dry-run]
#
# T23: checklist-driven release script for @janhapke/libraw. It never runs
# `npm publish` itself -- publishing happens only in CI's `package` job,
# triggered by pushing the `vX.Y.Z` tag this script creates (see the
# `package` job's `if: startsWith(github.ref, 'refs/tags/v')` guard in
# .github/workflows/build.yml, and docs/how-to/set-up-prebuilds-and-ci.md
# §5, which this script implements).
#
# What it does, in order:
#   1. Asserts the working tree is clean and on `main` (skipped in
#      --dry-run mode -- see below).
#   2. `npm run gen:check` -- every generated file, including
#      THIRD_PARTY_NOTICES.md (scripts/gen-notices.js, T23), must already
#      be up to date; a release must never ship a stale generated file.
#   3. `npm test`.
#   4. Bumps package.json/package-lock.json via
#      `npm version <version> --no-git-tag-version` (no commit, no tag --
#      npm's own git integration is deliberately not used, so this script
#      controls the commit message and can run the CHANGELOG check before
#      committing anything).
#   5. Checks CHANGELOG.md for a `## [<version>]` section; with a TTY and
#      no --yes, asks for interactive confirmation if the section is
#      missing (e.g. it exists under a slightly different heading); with
#      --yes (no prompting possible), missing means abort.
#   6. Commits `release: v<version>` and tags `v<version>` (annotated).
#   7. Prints `git push origin main --follow-tags` -- never runs it, unless
#      --push is also given.
#
# --dry-run: runs steps 2-5 for real (so `npm test`/`gen:check` failures
# are caught before anything is committed), but restores package.json and
# package-lock.json to their exact prior byte content afterwards -- a
# plain file copy, not a git operation, so it is safe to run against a
# working tree that already has unrelated uncommitted changes -- and stops
# before step 6: no commit, no tag, nothing left in the working tree.
# --dry-run also skips the "clean tree on main" precondition in step 1
# (rehearsable from any branch/state) and passes --force to the underlying
# `npm version` call so it isn't blocked by npm's own "git working
# directory not clean" check.
#
# Usage:
#   scripts/release.sh 0.1.0                 interactive release
#   scripts/release.sh 0.1.0 --yes           non-interactive (CI use)
#   scripts/release.sh 0.1.0 --yes --push    also pushes main + the tag
#   scripts/release.sh 0.1.0-test --dry-run  rehearsal, no lasting changes
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { echo "release.sh: $*"; }
err() { echo "release.sh: $*" >&2; }

usage() {
  echo "usage: scripts/release.sh <version> [--yes] [--push] [--dry-run]" >&2
}

VERSION=""
ASSUME_YES=0
DO_PUSH=0
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=1 ;;
    --push) DO_PUSH=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      err "unknown flag: $arg"
      usage
      exit 1
      ;;
    *)
      if [ -n "$VERSION" ]; then
        err "unexpected extra argument: $arg"
        usage
        exit 1
      fi
      VERSION="$arg"
      ;;
  esac
done

if [ -z "$VERSION" ]; then
  usage
  exit 1
fi

if [ "$DRY_RUN" -eq 1 ]; then
  log "--dry-run: skipping the 'clean tree on main' precondition"
else
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$BRANCH" != "main" ]; then
    err "must be run on 'main' (currently on '$BRANCH')"
    exit 1
  fi
  if [ -n "$(git status --porcelain)" ]; then
    err "working tree is not clean:"
    git status --porcelain >&2
    exit 1
  fi
fi

log "npm run gen:check"
npm run gen:check

log "npm test"
npm test

# Snapshot package.json/package-lock.json byte-for-byte before `npm
# version` touches them. RESTORE_NEEDED stays 1 (the safe default) through
# every early-exit path below (changelog missing, --dry-run finishing) so
# the EXIT trap restores them; it is only set to 0 once we commit for real,
# at which point the bumped files are meant to stick around.
BACKUP_DIR="$(mktemp -d)"
cp package.json "$BACKUP_DIR/package.json"
if [ -f package-lock.json ]; then
  cp package-lock.json "$BACKUP_DIR/package-lock.json"
fi
RESTORE_NEEDED=1

cleanup() {
  if [ "$RESTORE_NEEDED" -eq 1 ] && [ -d "$BACKUP_DIR" ]; then
    cp "$BACKUP_DIR/package.json" package.json
    if [ -f "$BACKUP_DIR/package-lock.json" ]; then
      cp "$BACKUP_DIR/package-lock.json" package-lock.json
    fi
  fi
  rm -rf "$BACKUP_DIR"
}
trap cleanup EXIT

NPM_VERSION_FLAGS=(--no-git-tag-version)
if [ "$DRY_RUN" -eq 1 ]; then
  # --dry-run may run on a working tree with unrelated uncommitted changes
  # (see the header comment); --force bypasses npm's own "git working
  # directory not clean" check, which is independent of the "clean tree on
  # main" precondition this script already skipped above.
  NPM_VERSION_FLAGS+=(--force)
fi

log "npm version $VERSION ${NPM_VERSION_FLAGS[*]}"
npm version "$VERSION" "${NPM_VERSION_FLAGS[@]}" >/dev/null

NEW_VERSION="$(node -p "require('./package.json').version")"
CHANGELOG_HEADING="## [$NEW_VERSION]"

if grep -qF "$CHANGELOG_HEADING" CHANGELOG.md; then
  log "CHANGELOG.md already has a '$CHANGELOG_HEADING' section"
elif [ "$ASSUME_YES" -eq 1 ]; then
  err "CHANGELOG.md has no '$CHANGELOG_HEADING' section, and --yes was given (cannot prompt) -- aborting"
  exit 1
else
  echo "release.sh: CHANGELOG.md has no '$CHANGELOG_HEADING' section."
  read -r -p "Add it now (in another terminal), then type 'yes' here to continue (anything else aborts): " reply
  if [ "$reply" != "yes" ] || ! grep -qF "$CHANGELOG_HEADING" CHANGELOG.md; then
    err "aborting -- CHANGELOG.md section for $NEW_VERSION not confirmed"
    exit 1
  fi
fi

if [ "$DRY_RUN" -eq 1 ]; then
  log "--dry-run: would commit 'release: v$NEW_VERSION', tag 'v$NEW_VERSION' -- restoring package.json/package-lock.json now, no lasting changes"
  exit 0
fi

# Past this point the release is really happening: keep the bumped files
# (the EXIT trap will no longer undo them) and commit.
RESTORE_NEEDED=0

log "git commit -m 'release: v$NEW_VERSION'"
git add package.json CHANGELOG.md
if [ -f package-lock.json ]; then
  git add package-lock.json
fi
git commit -m "release: v$NEW_VERSION"

log "git tag -a v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "v$NEW_VERSION"

echo
echo "release.sh: done. Review the commit and tag, then push with:"
echo
echo "    git push origin main --follow-tags"
echo

if [ "$DO_PUSH" -eq 1 ]; then
  log "--push given: running git push origin main --follow-tags"
  git push origin main --follow-tags
else
  log "not pushing (pass --push to push automatically)"
fi
