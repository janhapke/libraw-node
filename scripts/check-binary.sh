#!/usr/bin/env bash
# scripts/check-binary.sh <file>
#
# Electron-safety / glibc-floor gate for a built .node addon. Runs entirely
# on the host using ordinary binutils inspection tools (objdump, nm) -- these
# only *read* the ELF, they never compile anything, so this does not violate
# the "never use the host compiler" rule.
#
# Prints:
#   - NEEDED entries (DT_NEEDED dynamic dependencies)
#   - exported dynamic symbols (globally bound entries in .dynsym)
#   - the highest GLIBC_x.y[.z] version referenced
#
# Exits non-zero if:
#   - NEEDED contains anything other than
#     libc/libm/libpthread/libdl/libgomp/ld-linux
#     (T04: libgomp.so.1 is a deliberate dynamic dependency -- gcc-toolset-14's
#     static libgomp.a cannot be linked into a shared object at all, a
#     binutils-enforced TLS-model restriction discovered while wiring up
#     decodeSync; see the long comment in CMakeLists.txt above the
#     `target_link_libraries(addon PRIVATE gomp)` line. libgomp.so.1 ships
#     with every GCC/glibc Linux install, same ubiquity argument as the
#     other four allowed libs.)
#   - NEEDED contains libjpeg or libz (T03: libjpeg-turbo and zlib must be
#     linked statically) -- already covered by the allowlist above but
#     checked and reported separately for a clearer failure message
#   - any exported dynamic symbol other than napi_register_module_v1 and
#     node_api_module_get_api_version_v1 exists
#   - the highest referenced GLIBC_ version is greater than 2.28
set -euo pipefail

FILE="${1:?usage: check-binary.sh <file>}"

if [ ! -f "$FILE" ]; then
  echo "check-binary: no such file: $FILE" >&2
  exit 1
fi

status=0

echo "== NEEDED (objdump -p | grep NEEDED) =="
NEEDED="$(objdump -p "$FILE" | awk '/NEEDED/ {print $2}')"
if [ -n "$NEEDED" ]; then
  echo "$NEEDED"
else
  echo "(none)"
fi

echo
echo "== exported dynamic symbols (nm -D --defined-only, global bind only) =="
EXPORTED="$(nm -D --defined-only "$FILE" | awk '$2 ~ /^[A-Z]$/ {print $3}')"
if [ -n "$EXPORTED" ]; then
  echo "$EXPORTED"
else
  echo "(none)"
fi

echo
echo "== max GLIBC_ version referenced (objdump -T | grep GLIBC_) =="
MAX_GLIBC="$(objdump -T "$FILE" \
  | grep -o 'GLIBC_[0-9]\+\.[0-9]\+\(\.[0-9]\+\)\?' \
  | sed 's/^GLIBC_//' \
  | sort -V \
  | tail -1 || true)"
if [ -n "$MAX_GLIBC" ]; then
  echo "GLIBC_${MAX_GLIBC}"
else
  echo "(none referenced)"
fi

echo

# --- Rule 1: NEEDED allowlist ---------------------------------------------
# libgomp is allowed dynamically (T04: see the CMakeLists.txt comment above
# `target_link_libraries(addon PRIVATE gomp)` -- static linking of
# gcc-toolset-14's libgomp.a into a shared object is not achievable, a
# binutils TLS-model restriction, not a choice). libjpeg/libz remain
# static-only, enforced separately by Rule 1b below.
ALLOWED_NEEDED_RE='^(libc\.so(\.[0-9]+)?|libm\.so(\.[0-9]+)?|libpthread\.so(\.[0-9]+)?|libdl\.so(\.[0-9]+)?|libgomp\.so(\.[0-9]+)?|ld-linux[a-zA-Z0-9_-]*\.so(\.[0-9]+)?)$'
BAD_NEEDED="$(printf '%s\n' "$NEEDED" | sed '/^$/d' | grep -vE "$ALLOWED_NEEDED_RE" || true)"
if [ -n "$BAD_NEEDED" ]; then
  echo "FAIL: unexpected NEEDED entries (only libc/libm/libpthread/libdl/libgomp/ld-linux allowed):" >&2
  printf '%s\n' "$BAD_NEEDED" >&2
  status=1
fi

# --- Rule 1b: static-link gate (T03) --------------------------------------
# LibRaw, libjpeg-turbo and zlib must be compiled into the addon statically;
# named explicitly (rather than relying only on the allowlist above) so a
# regression here reports exactly which vendored dependency leaked out as a
# dynamic dependency instead of a generic "unexpected NEEDED" message.
# libgomp is intentionally excluded from this gate as of T04 -- it is a
# deliberate dynamic dependency, not a regression; see Rule 1 above.
STATIC_ONLY_RE='(^|/)lib(jpeg|z)\.so(\.[0-9]+)?$'
BAD_STATIC="$(printf '%s\n' "$NEEDED" | sed '/^$/d' | grep -E "$STATIC_ONLY_RE" || true)"
if [ -n "$BAD_STATIC" ]; then
  echo "FAIL: libjpeg/libz must be linked statically, found in NEEDED:" >&2
  printf '%s\n' "$BAD_STATIC" >&2
  status=1
fi

# --- Rule 2: exported symbol allowlist ------------------------------------
ALLOWED_SYMS="napi_register_module_v1
node_api_module_get_api_version_v1"
BAD_SYMS="$(comm -23 \
  <(printf '%s\n' "$EXPORTED" | sed '/^$/d' | sort -u) \
  <(printf '%s\n' "$ALLOWED_SYMS" | sort -u))"
if [ -n "$BAD_SYMS" ]; then
  echo "FAIL: unexpected exported dynamic symbols (only the two napi entry points allowed):" >&2
  printf '%s\n' "$BAD_SYMS" >&2
  status=1
fi

# --- Rule 3: glibc floor ----------------------------------------------------
if [ -n "$MAX_GLIBC" ]; then
  HIGHEST="$(printf '%s\n%s\n' "$MAX_GLIBC" "2.28" | sort -V | tail -1)"
  if [ "$HIGHEST" != "2.28" ]; then
    echo "FAIL: max GLIBC_ version $MAX_GLIBC exceeds the 2.28 floor" >&2
    status=1
  fi
fi

if [ "$status" -eq 0 ]; then
  echo "check-binary: OK ($FILE)"
else
  echo "check-binary: FAILED ($FILE)" >&2
fi

exit "$status"
