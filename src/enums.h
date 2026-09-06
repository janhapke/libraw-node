// T13: LIBRAW_WARN_* / LIBRAW_CAPS_* -> short-name lookup, generated from
// vendor/LibRaw/libraw/libraw_const.h by scripts/gen-enums.js (mirrors
// src/errors.h/.cc's LibRawErrorName for `enum LibRaw_errors` and
// src/progress_stage.h/.cc's ProgressStageName for `enum LibRaw_progress`).
// Replaces src/fused.cc's previous hand-written `kWarnings` table (T08) --
// see that file's history -- with the generated one, and backs the new
// capability-name helper.
#pragma once

#include <napi.h>

namespace libraw_node {

// Turns `warnings` (imgdata.process_warnings, a bitmask of LIBRAW_WARN_*,
// enum LibRaw_warnings) into an array of short names (e.g.
// LIBRAW_WARN_FALLBACK_TO_AHD -> "FALLBACK_TO_AHD"), in ascending bit order.
// Used by decode()/identify()'s `warnings` result field (src/fused.cc).
Napi::Array WarningsToArray(Napi::Env env, unsigned int warnings);

// Turns `caps` (LibRaw::capabilities(), a bitmask of LIBRAW_CAPS_*, enum
// LibRaw_runtime_capabilities) into an array of short names (e.g.
// LIBRAW_CAPS_ZLIB -> "ZLIB"), in ascending bit order.
Napi::Array CapabilityNamesArray(Napi::Env env, unsigned int caps);

}  // namespace libraw_node
