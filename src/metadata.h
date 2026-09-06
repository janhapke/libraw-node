// T14a: hand-written declaration for the generated metadata mirror
// (src/generated/metadata.gen.cc, built by scripts/gen-metadata-cc.js from
// api/metadata.json). See docs/explanation/libraw-api-surface.md's "The
// metadata you get after open_*" and docs/how-to/expose-libraw-options.md
// §3 for the design.
//
// Mirrors six read-only groups of `imgdata` -- idata, sizes (incl.
// `sizes.oriented`, a width/height-swapped convenience for flip 5/6),
// other (incl. parsed GPS), lens (incl. nikon/dng/makernotes sub-structs),
// color (matrices, cam_mul/pre_mul, black/maximum, a compacted WB_Coeffs/
// WBCT_Coeffs, the embedded ICC profile as a Buffer), and
// makernotes.common -- as `{ idata, sizes, other, lens, color, makernotes:
// { common } }`. Per-vendor makernotes (canon, nikon, sony, ...) are T14b,
// not this file.
//
// Used by both src/fused.cc's identify() (as its `metadata` result field,
// with the top-level `sizes`/`idata` shortcut fields now sourced from the
// same call rather than hand-assembled separately -- see that file's
// IdentifyWorker::OnOK) and Processor::Metadata (src/processor.h/.cc, a
// getter that throws LIBRAW_OUT_OF_ORDER_CALL before the Processor is
// opened).
#pragma once

#include <napi.h>

#include <libraw/libraw.h>

namespace libraw_node {

Napi::Object MetadataToObject(Napi::Env env, const libraw_data_t& d);

}  // namespace libraw_node
