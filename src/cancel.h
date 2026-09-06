// T09: cancellation primitives shared by the fused workers (src/fused.cc)
// and Processor's async stage workers (src/async_workers.h). See
// docs/how-to/implement-async-decode-with-cancellation.md §3 and
// docs/plan/tasks.md's T09 section.
//
// What we learned reading vendor/LibRaw/src/utils/utils_libraw.cpp,
// vendor/LibRaw/src/decoders/unpack.cpp and
// vendor/LibRaw/src/postprocessing/*.cpp (0.22.2) about *where* LibRaw
// actually polls for cancellation -- this drives the two-mechanism design
// below:
//
//   - `checkCancel()` (LibRaw internal; polls/clears LibRaw's own
//     `_exitflag`, flipped by the public `setCancelFlag()`/`clearCancelFlag()`
//     pair) is called from inside the per-row/per-tile decode loops of most
//     raw decoders (src/decoders/decoders_libraw.cpp,
//     src/decoders/decoders_dcraw.cpp, src/decoders/dng.cpp,
//     src/decoders/kodak_decoders.cpp, src/decoders/canon_600.cpp,
//     src/decoders/olympus14.cpp, src/decoders/generic.cpp,
//     src/decoders/load_mfbacks.cpp, src/utils/phaseone_processing.cpp) --
//     i.e. it is the *only* thing that interrupts unpack() mid-decode
//     (LibRaw's own progress callback, RUN_CALLBACK, fires just once at the
//     very start and once at the very end of unpack() -- LIBRAW_PROGRESS_
//     LOAD_RAW 0/2 and 1/2 -- never in between). setCancelFlag() is called
//     directly from the JS-thread `cancel()` closure below for this reason:
//     it must land *before* checkCancel() is next polled, and the progress
//     callback alone cannot deliver that in time.
//   - LibRaw's progress callback (RUN_CALLBACK macro, checked between named
//     substages: CONVERT_RGB, SCALE_COLORS, HIGHLIGHTS, MEDIAN_FILTER,
//     FUJI_ROTATE, STRETCH, REMOVE_ZEROES, BAD_PIXELS, DARK_FRAME, IDENTIFY)
//     is the *only* mechanism dcraw_process()/identify() check at all --
//     `checkCancel()`/`_exitflag` is never polled anywhere in
//     src/postprocessing/, src/preprocessing/ or src/metadata/identify.cpp.
//     One exception: ahd_demosaic() (src/demosaic/ahd_demosaic.cpp) polls
//     the progress callback itself once per tile-row inside its own
//     (possibly OpenMP-parallel) loop, so AHD is interrupted promptly; other
//     demosaic algorithms (VNG/PPG/DHT/AAHD/xtrans variants) are only
//     interrupted at the RUN_CALLBACK checkpoints around the whole
//     interpolate stage, i.e. coarsely.
//   - open_buffer()/open_file() call identify() internally
//     (src/utils/open.cpp's open_datastream), which itself only checks the
//     progress callback once, near the very end of parsing
//     (RUN_CALLBACK(LIBRAW_PROGRESS_IDENTIFY, 1, 2)) -- for practical
//     purposes open()/identify() are not interruptible mid-parse by either
//     mechanism. This only matters for latency, not correctness: open/parse
//     of a single raw file's header is on the order of single-digit
//     milliseconds, not something a caller needs fine-grained cancellation
//     for.
#pragma once

#include <napi.h>

#include <libraw/libraw.h>

#include <atomic>
#include <memory>

namespace libraw_node {

// One job's cancellation state, shared between:
//  - the LibRaw progress callback installed on that job's LibRaw instance
//    (polls `flag`, running on Execute()'s own threadpool thread),
//  - the `cancel()` Napi::Function handed back to JS alongside the job's
//    promise (sets `flag` and calls LibRaw's own setCancelFlag(), running on
//    the JS thread), and
//  - the worker's OnOK()/OnError() (sets `active` to false once the job has
//    settled, so a `cancel()` call that arrives afterwards -- e.g. a signal
//    whose 'abort' listener JS failed to remove, or one the caller still
//    holds a reference to -- is a harmless no-op instead of touching a
//    LibRaw instance that may since be reused by a later, unrelated job on
//    the same Processor).
struct JobCancelState {
  std::shared_ptr<std::atomic<bool>> flag = std::make_shared<std::atomic<bool>>(false);
  std::shared_ptr<std::atomic<bool>> active = std::make_shared<std::atomic<bool>>(true);
};

// LibRaw progress_callback-compatible function (libraw_types.h's
// `progress_callback`): `data` must point to a `JobCancelState`. Called
// synchronously by LibRaw's own code on Execute()'s thread (RUN_CALLBACK /
// ahd_demosaic's own per-tile check) -- never call into JS from here. See
// the class comment above for exactly which stages actually invoke this.
int CancelAwareProgressCallback(void* data, enum LibRaw_progress stage, int iteration, int expected);

// Builds the `{ promise, cancel }` result object returned to JS in place of
// a bare Promise (the shape docs/plan/tasks.md's T09 section calls for);
// `lib/fused.cjs`/`lib/processor.cjs` unwrap it and never expose `cancel`
// itself to package callers -- they wire it to the caller's AbortSignal
// internally and always return a plain Promise from the public API.
Napi::Object WrapPromiseWithCancel(Napi::Env env, Napi::Promise promise, Napi::Function cancel);

// A `cancel` function that does nothing when called -- used for the
// pre-aborted-signal and synchronous-precondition-failure paths, where the
// promise is already settled and there is nothing left to cancel.
Napi::Function NoopCancel(Napi::Env env);

// Builds the `cancel` Napi::Function for a fused worker (src/fused.cc): each
// of those constructs its own exclusive `LibRaw` instance up front, on the
// JS thread (before Queue()), specifically so this closure can hold a
// `shared_ptr` copy of it -- that keeps the LibRaw instance alive for as
// long as *this* closure exists even if the worker that queued the job has
// already self-deleted (Napi::AsyncWorker's default behaviour after
// OnOK/OnError), and `state->active` (set false in that same OnOK/OnError)
// stops a stale call from touching it pointlessly once the job has settled.
Napi::Function MakeLibRawCancelFunction(Napi::Env env, std::shared_ptr<JobCancelState> state,
                                         std::shared_ptr<LibRaw> raw);

}  // namespace libraw_node
