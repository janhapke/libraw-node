#include "enums.h"

#include <libraw/libraw.h>

#include <cstddef>

namespace libraw_node {

namespace {

struct NameEntry {
  unsigned int value;
  const char* name;
};

// X-macro two-pass trick: src/generated/libraw_enums.inc (scripts/
// gen-enums.js) lists LIBRAW_NODE_WARN_ENTRY(...) and
// LIBRAW_NODE_CAPS_ENTRY(...) invocations interleaved, in header order. Each
// pass below defines the macro it wants expanded and the other macro to
// expand to nothing, then includes the same file to build just its own
// table -- see src/generated/libraw_enums.inc's header comment.
#define LIBRAW_NODE_WARN_ENTRY(name, shortName) {name, shortName},
#define LIBRAW_NODE_CAPS_ENTRY(name, shortName)
const NameEntry kWarnTable[] = {
#include "generated/libraw_enums.inc"
};
#undef LIBRAW_NODE_WARN_ENTRY
#undef LIBRAW_NODE_CAPS_ENTRY

#define LIBRAW_NODE_WARN_ENTRY(name, shortName)
#define LIBRAW_NODE_CAPS_ENTRY(name, shortName) {name, shortName},
const NameEntry kCapsTable[] = {
#include "generated/libraw_enums.inc"
};
#undef LIBRAW_NODE_WARN_ENTRY
#undef LIBRAW_NODE_CAPS_ENTRY

constexpr size_t kWarnTableSize = sizeof(kWarnTable) / sizeof(kWarnTable[0]);
constexpr size_t kCapsTableSize = sizeof(kCapsTable) / sizeof(kCapsTable[0]);

Napi::Array NamesForMask(Napi::Env env, unsigned int mask, const NameEntry* table, size_t tableSize) {
  Napi::Array arr = Napi::Array::New(env);
  uint32_t idx = 0;
  // kWarnTable/kCapsTable are already in ascending-bit-value order (the
  // generator emits enumerators in header declaration order, and both
  // LibRaw_warnings and LibRaw_runtime_capabilities declare their bits in
  // ascending order) -- no sort needed here.
  for (size_t i = 0; i < tableSize; i++) {
    if (mask & table[i].value) {
      arr.Set(idx++, Napi::String::New(env, table[i].name));
    }
  }
  return arr;
}

}  // namespace

Napi::Array WarningsToArray(Napi::Env env, unsigned int warnings) {
  return NamesForMask(env, warnings, kWarnTable, kWarnTableSize);
}

Napi::Array CapabilityNamesArray(Napi::Env env, unsigned int caps) {
  return NamesForMask(env, caps, kCapsTable, kCapsTableSize);
}

}  // namespace libraw_node
