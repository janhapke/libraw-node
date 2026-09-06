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

}  // namespace libraw_node
