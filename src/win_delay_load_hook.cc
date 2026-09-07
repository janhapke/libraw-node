/*
 * When this file is linked to a DLL, it sets up a delay-load hook that
 * intervenes when the DLL is trying to load the host executable
 * dynamically. Instead of trying to locate the .exe file it'll just
 * return a handle to the process image.
 *
 * This allows compiled addons to work when the host executable is renamed.
 */

#ifdef _MSC_VER

#pragma managed(push, off)

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#include <windows.h>

#include <delayimp.h>
#include <string.h>

static FARPROC WINAPI load_exe_hook(unsigned int event, DelayLoadInfo* info) {
  HMODULE m;
  if (event != dliNotePreLoadLibrary)
    return NULL;

  if (_stricmp(info->szDll, HOST_BINARY) != 0)
    return NULL;

  // try for libnode.dll to compat node.js that using 'vcbuild.bat dll'
  m = GetModuleHandle(TEXT("libnode.dll"));
  if (m == NULL) m = GetModuleHandle(NULL);
  return (FARPROC) m;
}

decltype(__pfnDliNotifyHook2) __pfnDliNotifyHook2 = load_exe_hook;

// T24 Part A: fix for the "Open item from T22" concurrent first-load
// failure (docs/plan/tasks.md). T22 originally saw a silent job-step death
// (no PASS/FAIL line at all) when 3 worker_threads did their *first*
// require() of this addon concurrently under Electron. T24's own
// reproduction (test/electron-workers-cold-smoke.cjs, no warm-up, run
// under plain Node and under Electron 42/latest, 3 and 6 workers) instead
// caught: every worker decoded correctly and the script printed its own
// `PASS ...` line (process.exitCode explicitly set to 0), but the OS
// process then still exited with code 1 roughly 0.3s later, with zero
// further output -- and this reproduced identically under *plain Node*,
// not just Electron. That plain-Node reproduction rules out the
// Electron-vs-node.exe redirect itself as the cause, but is fully
// consistent with the underlying mechanism: this addon is always built as
// a delay-loaded import of node.exe (so one binary serves both Electron
// and plain Node), so the same lazy first-use thunk resolution runs on
// every Windows load regardless of host. The suspect, confirmed by
// Microsoft's own delay-load documentation ("Delay-load DLL restrictions":
// the delay-load helper functions "cannot be assumed to be thread-safe"),
// is the MSVC delay-load runtime (delayimp.lib) racing on the *first*
// resolution of a still-unpatched IAT thunk when multiple threads call
// into it concurrently -- exactly what happens when N worker_threads each
// make their first N-API call within milliseconds of each other. The
// lazy, per-thunk, first-use resolution path is where the race lives; the
// fix removes that path entirely by resolving *every* delay-loaded import
// from HOST_BINARY up front, synchronously, exactly once.
//
// DllMain's DLL_PROCESS_ATTACH is the right place: the Windows loader
// guarantees it runs exactly once per process (a second worker_thread's
// LoadLibrary of the same already-mapped .node file bumps the refcount
// and returns the cached base address without re-running DllMain) and
// while the process-wide loader lock is held, so no application thread
// can be executing any code from this DLL -- including a first N-API call
// -- while this runs. C++ static initializers already ran by this point
// (the CRT calls them before invoking a user-supplied DllMain), so this
// also covers any addon-side or LibRaw-side global/static state that
// might otherwise race on first touch.
//
// __HrLoadAllImportsForDll(HOST_BINARY) walks every import thunk for
// node.exe and resolves it immediately, driven through load_exe_hook
// above for the dliNotePreLoadLibrary event -- which never calls a real
// LoadLibrary for HOST_BINARY, only GetModuleHandle against a module
// that's already mapped (the running electron.exe/node.exe image itself,
// or libnode.dll) -- so this is safe to call from DllMain, unlike an
// arbitrary LoadLibrary would be. The __try/__except guards against the
// documented delay-load failure path (a structured exception raised by
// the default failure hook if some entry point were ever missing): on
// failure this simply leaves that one import to the normal lazy path
// -- exactly today's (racy but otherwise working) behaviour -- rather
// than aborting the whole DLL load over it.
// T24b (docs/plan/tasks.md, follow-up to the block above): the DllMain fix
// above did *not* resolve the "PASS, then exit code 1 (or, under the more
// verbose repro added for T24b, STATUS_ACCESS_VIOLATION / 0xC0000005) about
// 0.3s later" failure -- confirmed on `main` (run 34136306293) and
// reproduced far more precisely across three further CI rounds (runs
// 34137891164, 34138930368, 34139660303; the full variant table lives in
// test/helpers/run-variants.cjs and docs/plan/tasks.md's T24b section).
// Summary of what those rounds narrowed the cause down to: a cold
// worker_thread that is ever the *first* thread in the process to reach
// LibRaw's OpenMP-parallel demosaic code (dcraw_process, compiled with
// MSVC's classic /openmp) crashes -- reproduced with a single cold worker
// and no concurrency at all, and reproduced even by a deliberately
// inserted no-op `#pragma omp parallel` touch run from the addon's own
// per-Env constructor (on the calling worker thread, or on a dedicated
// std::thread -- identical results either way; *which* thread executes
// vcomp's first `_vcomp_fork` did not matter). Only two things were ever
// safe across every round: OMP_NUM_THREADS=1 (forces vcomp's lazy team
// creation down a no-team-needed fast path -- it never creates, and so
// never later has to tear down, a real worker-thread pool at all) and a
// main-thread warm-up require() before any worker spawns (T22's original
// workaround, kept as test/electron-workers-smoke.cjs but never a fix this
// addon can rely on, since a real consumer's workers may never warm up).
//
// Fix: set OMP_NUM_THREADS=1 in the process environment here, in
// DLL_PROCESS_ATTACH -- guaranteed to run exactly once, before any
// application thread (main or worker) can execute a single line of this
// addon's or LibRaw's code, and *without* calling into vcomp140.dll at all
// (unlike calling omp_set_num_threads() from application code would, which
// round 2/3's evidence above says is itself unsafe to do from a cold
// worker thread) -- vcomp only ever reads this variable lazily, on its own
// first `_vcomp_fork`, wherever and whenever that naturally happens. Only
// sets it if the user/environment hasn't already set one, so an explicit
// OMP_NUM_THREADS from outside this addon is never overridden. This trades
// away the multi-threaded demosaic speedup buildInfo.openmp=true implies
// on Windows for eliminating a real crash; see docs/plan/tasks.md's T28
// section for the follow-up to fix the actual root cause and restore it.
//
// Round 5 update: setting the variable here alone did not work (run
// 34140957966's variant table was byte-identical to round 1's completely
// unfixed baseline) -- see CMakeLists.txt's WIN32 branch, which now also
// delay-loads VCOMP140.DLL itself so this DllMain (node.napi.node's own,
// which always runs first) gets a chance to set the variable *before*
// VCOMP140.DLL's own DllMain ever runs and (theory) reads it.
BOOL WINAPI DllMain(HINSTANCE /*hinstDLL*/, DWORD fdwReason, LPVOID /*lpvReserved*/) {
  if (fdwReason == DLL_PROCESS_ATTACH) {
    __try {
      __HrLoadAllImportsForDll(HOST_BINARY);
    } __except (EXCEPTION_EXECUTE_HANDLER) {
      // Fall through: leave unresolved thunks (if any) to the normal
      // lazy delay-load path. Never fail the DLL load over this.
    }

    // len == 0 covers both "not set at all" (GetLastError() would be
    // ERROR_ENVIRONMENT_VARIABLE_NOT_FOUND, 203, but that constant needs a
    // header this file doesn't otherwise pull in) and "set to an empty
    // string" -- both cases where forcing "1" here is the right call.
    char existing[8];
    DWORD len = GetEnvironmentVariableA("OMP_NUM_THREADS", existing, sizeof(existing));
    if (len == 0) {
      SetEnvironmentVariableA("OMP_NUM_THREADS", "1");
    }
  }
  return TRUE;
}

#pragma managed(pop)

#endif
