#include "image_format.h"

#include <libraw/libraw.h>

namespace libraw_node {

const char* ImageFormatName(int type) {
  switch (type) {
    case LIBRAW_IMAGE_JPEG:
      return "jpeg";
    case LIBRAW_IMAGE_BITMAP:
      return "bitmap";
    case LIBRAW_IMAGE_JPEGXL:
      return "jpegxl";
    case LIBRAW_IMAGE_H265:
      return "h265";
    default:
      return "unknown";
  }
}

const char* ThumbnailResultFormatName(int type, int bits) {
  switch (type) {
    case LIBRAW_IMAGE_JPEG:
      return "jpeg";
    case LIBRAW_IMAGE_BITMAP:
      return bits >= 16 ? "bitmap16" : "bitmap";
    case LIBRAW_IMAGE_JPEGXL:
      return "jxl";
    case LIBRAW_IMAGE_H265:
      return "h265";
    default:
      return "unknown";
  }
}

const char* InternalThumbnailFormatName(int tformat) {
  switch (tformat) {
    case LIBRAW_INTERNAL_THUMBNAIL_KODAK_THUMB:
      return "kodak_thumb";
    case LIBRAW_INTERNAL_THUMBNAIL_KODAK_YCBCR:
      return "kodak_ycbcr";
    case LIBRAW_INTERNAL_THUMBNAIL_KODAK_RGB:
      return "kodak_rgb";
    case LIBRAW_INTERNAL_THUMBNAIL_JPEG:
      return "jpeg";
    case LIBRAW_INTERNAL_THUMBNAIL_LAYER:
      return "layer";
    case LIBRAW_INTERNAL_THUMBNAIL_ROLLEI:
      return "rollei";
    case LIBRAW_INTERNAL_THUMBNAIL_PPM:
      return "ppm";
    case LIBRAW_INTERNAL_THUMBNAIL_PPM16:
      return "ppm16";
    case LIBRAW_INTERNAL_THUMBNAIL_X3F:
      return "x3f";
    case LIBRAW_INTERNAL_THUMBNAIL_DNG_YCBCR:
      return "dng_ycbcr";
    case LIBRAW_INTERNAL_THUMBNAIL_JPEGXL:
      return "jpegxl";
    default:
      return "unknown";  // includes LIBRAW_INTERNAL_THUMBNAIL_UNKNOWN == 0
  }
}

}  // namespace libraw_node
