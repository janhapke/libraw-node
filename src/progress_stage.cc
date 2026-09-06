#include "progress_stage.h"

#include <libraw/libraw.h>

#include <cstddef>

namespace libraw_node {

namespace {

struct ProgressStageEntry {
  int value;
  const char* shortName;
};

#define LIBRAW_NODE_PROGRESS_ENTRY(name, shortName) {name, shortName},
const ProgressStageEntry kProgressStageTable[] = {
#include "generated/libraw_progress_stages.inc"
};
#undef LIBRAW_NODE_PROGRESS_ENTRY

constexpr size_t kProgressStageTableSize = sizeof(kProgressStageTable) / sizeof(kProgressStageTable[0]);

}  // namespace

const char* ProgressStageName(int stage) {
  for (size_t i = 0; i < kProgressStageTableSize; i++) {
    if (kProgressStageTable[i].value == stage) {
      return kProgressStageTable[i].shortName;
    }
  }
  return "UNKNOWN";
}

}  // namespace libraw_node
