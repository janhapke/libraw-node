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

// T08: the fused thumbnail() helper's `format` field is a *different* string
// set than ImageFormatName's `type` above -- 'jpeg' | 'bitmap' | 'bitmap16' |
// 'h265' | 'jxl' | 'unknown' (docs/plan/tasks.md T08's "Do" item 3) -- so it
// needs its own mapping: LIBRAW_IMAGE_BITMAP splits into 'bitmap'/'bitmap16'
// by `bits`, and LIBRAW_IMAGE_JPEGXL is spelled 'jxl' here, not 'jpegxl'.
// `type`/`bits` come from the same libraw_processed_image_t
// dcraw_make_mem_thumb() returns.
const char* ThumbnailResultFormatName(int type, int bits);

// T08: identify()'s `thumbs[]` entries report `thumbs_list[i].tformat`,
// which is `enum LibRaw_internal_thumbnail_formats` (libraw_const.h) -- a
// *third*, differently-numbered enum from both LIBRAW_IMAGE_* above and
// LIBRAW_THUMBNAIL_* (libraw_thumbnail_t::tformat, used internally by
// dcraw_make_mem_thumb but not exposed here). Reusing ImageFormatName() for
// this field, as an earlier draft of docs/plan/tasks.md's T08 text suggested
// ("tformat (string via image_format helper or 'unknown')"), silently
// mislabels every thumb whose internal format number happens to collide
// with a LIBRAW_IMAGE_* one -- e.g. LIBRAW_INTERNAL_THUMBNAIL_JPEG == 4 ==
// LIBRAW_IMAGE_H265, so a JPEG thumb would have been reported as "h265".
// This dedicated mapping avoids that; see the T08 task-doc correction note.
const char* InternalThumbnailFormatName(int tformat);

}  // namespace libraw_node
