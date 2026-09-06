// T10: events -- progress, data errors, EXIF tag callback
// (docs/plan/tasks.md's T10 section).
//
// Design: LibRaw's callbacks (progress_callback, data_callback,
// exif_parser_callback -- vendor/LibRaw/libraw/libraw_types.h) all run
// synchronously on whichever thread is currently inside a LibRaw call --
// the libuv threadpool thread for every async worker (src/async_workers.h,
// src/fused.cc), or the JS thread itself for a *Sync method. Node-API calls
// are only safe from the JS thread (docs/how-to/implement-async-decode-with-
// cancellation.md §2's "Never touch Napi::* in Execute()" applies here too),
// so these callbacks must never construct a Napi::Value or call into JS --
// they only ever push a plain-data JobEvent into a mutex-protected buffer.
// The JS-thread side (a worker's OnOK()/OnError(), always after Execute()
// has returned) drains that buffer and converts it to JS values only then.
//
// This is the "extend that callback rather than installing a second one"
// design from docs/plan/tasks.md's T10 "Do" list: LibRaw only has one
// progress_callback slot (set_progress_handler), so the cancellation-only
// callback from T09 (src/cancel.h's CancelAwareProgressCallback) is extended
// in-place, below, to also record a progress event -- not replaced or
// chained with a second registration. data_callback and exif_parser_callback
// are genuinely different callback slots (different C function pointer
// types, set via set_dataerror_handler/set_exifparser_handler), so those get
// their own new callback functions, both below.
#pragma once

#include <napi.h>

#include <libraw/libraw.h>

#include <cstdint>
#include <mutex>
#include <string>
#include <vector>

namespace libraw_node {

// One recorded event, plain data only (see the file comment for why). The
// `kind` selects which of the per-kind fields below are meaningful; unused
// fields are left at their default.
struct JobEvent {
  enum class Kind { kProgress, kDataError, kExifTag };

  Kind kind;

  // kProgress: short stage name (src/progress_stage.h's ProgressStageName,
  // already resolved here so the JS side never needs the numeric table).
  std::string stage;
  int iteration = 0;
  int expected = 0;

  // kDataError: `offset` is the data_callback's own INT64 offset argument
  // (-1 for an EOF condition -- see vendor/LibRaw/src/utils/utils_libraw.cpp's
  // derror()); `message` is the file name LibRaw passes (its `file`
  // argument), or "data error" if LibRaw passed a null/empty one (see
  // docs/plan/tasks.md T10's payload note).
  int64_t offset = 0;
  std::string message;

  // kExifTag: exif_parser_callback's own tag/type/len/ord arguments,
  // unmodified. Note `tag` is *not* a bare EXIF/TIFF tag number in general --
  // vendor/LibRaw/src/metadata/tiff.cpp's parse_tiff_ifd (the call site that
  // fires for ordinary TIFF/DNG IFDs, which is what this binding's synthetic
  // test fixture exercises) ORs the real tag into the low bits with
  // `(ifd + 1) << 20` in the high bits to disambiguate which IFD it came
  // from (other call sites OR in different high-bit markers, e.g. GPS tags
  // get `| 0x40000` -- see src/metadata/exif_gps.cpp); since a plain TIFF tag
  // is always < 0x10000 (16 bits), `tag & 0xffff` recovers the original
  // EXIF/TIFF tag number regardless of call site. This binding does not
  // decode that further (see the task's "do not read from the datastream
  // argument in this task") -- callers wanting the bare tag number mask it
  // themselves.
  int tag = 0;
  int type = 0;
  int len = 0;
  unsigned int ordering = 0;
};

// Mutex-protected event buffer for one job. Push* methods are called from
// LibRaw's callbacks (worker thread during an async job, or the JS thread
// itself during a *Sync call); Drain() is called once, from the JS thread,
// after the job has fully settled (a worker's OnOK()/OnError(), or -- for a
// *Sync method -- immediately after the underlying LibRaw call returns).
// There is no actual concurrent access in either case (Napi::AsyncWorker
// guarantees Execute() has returned before OnOK()/OnError() runs; a *Sync
// call's callback and its drain both run on the same, single JS thread) --
// the mutex exists to document that ownership handoff and cost nothing.
class JobEventBuffer {
 public:
  void PushProgress(const char* stage, int iteration, int expected) {
    std::lock_guard<std::mutex> lock(mutex_);
    JobEvent e;
    e.kind = JobEvent::Kind::kProgress;
    e.stage = stage;
    e.iteration = iteration;
    e.expected = expected;
    events_.push_back(std::move(e));
  }

  void PushDataError(int64_t offset, const char* file) {
    std::lock_guard<std::mutex> lock(mutex_);
    JobEvent e;
    e.kind = JobEvent::Kind::kDataError;
    e.offset = offset;
    e.message = (file != nullptr && file[0] != '\0') ? file : "data error";
    events_.push_back(std::move(e));
  }

  void PushExifTag(int tag, int type, int len, unsigned int ordering) {
    std::lock_guard<std::mutex> lock(mutex_);
    JobEvent e;
    e.kind = JobEvent::Kind::kExifTag;
    e.tag = tag;
    e.type = type;
    e.len = len;
    e.ordering = ordering;
    events_.push_back(std::move(e));
  }

  // Moves every buffered event out and clears the buffer -- called exactly
  // once per job, from the JS thread, once the job has settled.
  std::vector<JobEvent> Drain() {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<JobEvent> drained = std::move(events_);
    events_.clear();
    return drained;
  }

 private:
  std::mutex mutex_;
  std::vector<JobEvent> events_;
};

// LibRaw's progress_callback slot is already used by src/cancel.h's
// CancelAwareProgressCallback (T09, cancellation) -- rather than install a
// second progress callback here (LibRaw only has one slot; the second
// registration would just overwrite the first), that function is extended
// in place (src/cancel.cc) to also call JobCancelState::events->PushProgress
// once it has resolved the stage's short name (via src/progress_stage.h's
// ProgressStageName). Nothing to declare here for progress.

// Converts a drained event list (JobEventBuffer::Drain()'s return value) to
// a JS array of plain objects, one per event, in original order. Each object
// has a `kind` string ("progress" | "dataError" | "exifTag") plus that
// kind's own fields (see JobEvent's field comments above) -- e.g. a progress
// event becomes `{ kind: "progress", stage, iteration, expected }`. Must run
// on the JS thread (constructs Napi::Value); callers are src/async_workers.h
// (Processor's `_drainEvents()`) and src/fused.cc (attached as an `events`
// property on the resolved result / rejected error, stripped again by
// lib/processor.cjs / lib/fused.cjs after they finish emitting from it).
Napi::Array EventsToArray(Napi::Env env, const std::vector<JobEvent>& events);

// data_callback-compatible (libraw_types.h) -- `data` must point at a
// JobCancelState (src/cancel.h -- the type that owns the JobEventBuffer
// these callbacks push into; src/events.cc includes cancel.h to reach it,
// keeping this header itself free of that dependency). Records a
// `dataError` event.
void RecordDataErrorEvent(void* data, const char* file, INT64 offset);

// exif_parser_callback-compatible (libraw_types.h) -- `context` must point
// at a JobCancelState, same as above. Records an `exifTag` event. Never
// reads through `ifp` (the datastream) or uses `base` -- per the task's "do
// not read from the datastream argument in this task".
void RecordExifTagEvent(void* context, int tag, int type, int len, unsigned int ord, void* ifp, INT64 base);

}  // namespace libraw_node
