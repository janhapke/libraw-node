// T06 introduced ThumbSync's LIBRAW_IMAGE_* -> string mapping inline in
// processor.cc; T07's ThumbWorker (src/async_workers.h) needs the exact same
// mapping, so it moved here to avoid duplicating (and risking drift between)
// two copies of the same switch.
#pragma once

namespace libraw_node {

// Maps a libraw_processed_image_t::type (LIBRAW_IMAGE_JPEG etc., see
// vendor/LibRaw/libraw/libraw_types.h) to the lowercase string used in
// thumbSync()/thumb()'s result `type` field.
const char* ImageFormatName(int type);

}  // namespace libraw_node
