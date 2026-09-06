#!/usr/bin/env bash
# scripts/check-binary-macos.sh <file>
#
# macOS counterpart of scripts/check-binary.sh (T03/T04), for the T20 Darwin
# prebuilds. Uses otool/nm (read-only Mach-O inspection, ships with Xcode
# command line tools on every GitHub macos-* runner) -- never compiles
# anything.
#
# Prints:
#   - otool -L (linked dylibs)
#   - nm -gU (exported global symbols; -U hides undefined ones, so this is
#     exactly the addon's own exported symbol table, the Darwin equivalent of
#     `nm -D --defined-only` in scripts/check-binary.sh)
#
# Exits non-zero if:
#   - otool -L lists any linked library other than
#     /usr/lib/libSystem.B.dylib and /usr/lib/libc++.1.dylib -- this is the
#     sidecar-free acceptance bar from docs/plan/tasks.md T20 (in particular,
#     it fails if Homebrew's libomp.dylib shows up, meaning OpenMP linked
#     dynamically instead of the required static libomp.a).
#   - nm -gU lists any exported symbol other than _napi_register_module_v1
#     and _node_api_module_get_api_version_v1 (cmake/napi.exports should
#     already guarantee this at link time; this is the belt-and-suspenders
#     check on the actual binary, matching check-binary.sh's Rule 2).
set -euo pipefail

FILE="${1:?usage: check-binary-macos.sh <file>}"

if [ ! -f "$FILE" ]; then
  echo "check-binary-macos: no such file: $FILE" >&2
  exit 1
fi

status=0

echo "== otool -L =="
OTOOL_OUT="$(otool -L "$FILE")"
echo "$OTOOL_OUT"

echo
echo "== nm -gU (exported global symbols) =="
NM_OUT="$(nm -gU "$FILE" | awk '{print $NF}')"
if [ -n "$NM_OUT" ]; then
  echo "$NM_OUT"
else
  echo "(none)"
fi

echo

# --- Rule 1: linked-library allowlist --------------------------------------
# The first line of otool -L output is the file's own header (path + ':'),
# not a load-dylib command, so it's dropped before matching.
ALLOWED_DYLIB_RE='^[[:space:]]*/usr/lib/(libSystem\.B\.dylib|libc\+\+\.1\.dylib)[[:space:]]'
BAD_LIBS="$(printf '%s\n' "$OTOOL_OUT" | tail -n +2 | grep -vE "$ALLOWED_DYLIB_RE" || true)"
if [ -n "$BAD_LIBS" ]; then
  echo "FAIL: unexpected linked libraries (only libSystem.B.dylib and libc++.1.dylib allowed):" >&2
  printf '%s\n' "$BAD_LIBS" >&2
  status=1
fi

# --- Rule 2: exported symbol allowlist --------------------------------------
ALLOWED_SYMS="_napi_register_module_v1
_node_api_module_get_api_version_v1"
BAD_SYMS="$(comm -23 \
  <(printf '%s\n' "$NM_OUT" | sed '/^$/d' | sort -u) \
  <(printf '%s\n' "$ALLOWED_SYMS" | sort -u))"
if [ -n "$BAD_SYMS" ]; then
  echo "FAIL: unexpected exported symbols (only the two napi entry points allowed):" >&2
  printf '%s\n' "$BAD_SYMS" >&2
  status=1
fi

if [ "$status" -eq 0 ]; then
  echo "check-binary-macos: OK ($FILE)"
else
  echo "check-binary-macos: FAILED ($FILE)" >&2
fi

exit "$status"
