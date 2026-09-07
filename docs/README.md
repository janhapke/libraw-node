# @janhapke/libraw docs

Documentation for the `@janhapke/libraw` Node.js binding to [LibRaw](https://www.libraw.org/), laid out per
[Diátaxis](https://diataxis.fr/): tutorials teach, how-to guides solve a task, reference describes,
explanation discusses. Start with the top-level [`README.md`](../README.md) (install, quick start, API
overview) — the docs below go deeper on specific tasks and background.

This directory began, on 2026-09-03, as **research written before any code existed** — a survey of LibRaw,
the prior `lightdrift-libraw` binding, and photoview's needs, used to plan the implementation (T00–T25 in
[`plan/tasks.md`](plan/tasks.md)). Once the package existed, T26 split that corpus in two: the pages below
under "User documentation" were rewritten or corrected against the shipped API and are kept accurate as the
code changes; the pages under "Design history" are left as they were written and are **not** maintained —
each carries a banner saying so. If a design-history page and a user-facing page disagree, the user-facing
page (and the code) wins.

## User documentation

### Tutorials (learning by doing)

- [01 — Decode your first RAW file](tutorials/01-first-decode.md)
- [02 — Fast previews: embedded thumbnails vs `half_size`](tutorials/02-fast-preview-with-half-size.md)

### How-to guides (task oriented)

- [Build from source (Linux Docker, macOS, Windows)](how-to/build-from-source.md)
- [Set processing options (`params`/`rawparams`, enums, flags)](how-to/set-processing-options.md)
- [Cancel a decode and track progress](how-to/cancel-and-track-progress.md)
- [Make the addon Electron-safe: what this package does and how to verify it](how-to/make-the-addon-electron-safe.md)
- [Test the addon under Electron without a GUI](how-to/test-under-electron.md)
- [Set up prebuilds and CI for Linux, macOS, Windows](how-to/set-up-prebuilds-and-ci.md)
- [Use with sharp and worker_threads](how-to/use-with-sharp-and-worker-threads.md)
- [Using this package from photoview](how-to/integrate-into-photoview.md)

### Reference (facts, tables)

- [Output params reference (generated)](reference/params.md)
- [Raw-unpack params reference (generated)](reference/rawparams.md)
- [Metadata reference (generated)](reference/metadata.md)
- [Enums reference (generated)](reference/enums.md)
- [LibRaw processing methods (the underlying C++ API)](reference/libraw-processing-methods.md)
- [LibRaw output parameters (`imgdata.params`)](reference/libraw-output-params.md)
- [LibRaw raw-unpack params, thumbnail list, capability and warning flags](reference/libraw-raw-params-thumbnails-flags.md)
- [Build matrix: platforms, toolchains, artifacts](reference/build-matrix.md)
- [Sources](reference/sources.md)

### Explanation (understanding)

- [What LibRaw is](explanation/what-is-libraw.md)
- [The LibRaw API surface and processing pipeline](explanation/libraw-api-surface.md)
- [Electron compatibility](explanation/electron-compatibility.md)
- [Build and distribution strategy (Docker, cross-platform, prebuilds)](explanation/build-and-distribution-strategy.md)
- [Licensing](explanation/licensing.md)

## Design history (research, 2026-09-03, not maintained)

Written to plan the implementation, before `@janhapke/libraw` had any code. Facts in these pages were
checked once, against the LibRaw 0.21.5 headers installed on this machine at the time, the LibRaw 0.22.2
release notes, the `lightdrift-libraw` source (both the alpha.6 photoview had installed and 1.0.0 on
`master`), the photoview source and benchmark CSVs, and the knowledge base in
`/home/jan/dev/_jdd/knowledge-base`. They record why decisions were made, not what the code does today —
see the "User documentation" section above and the top-level [`README.md`](../README.md) for that.

- [Task breakdown for agent execution (T00–T28)](plan/tasks.md)
- [Adoption comparison — alpha.6 vs lightdrift 1.0.0 vs self-built](explanation/adoption-comparison.md)
- [Roadmap and effort estimates](explanation/roadmap-and-effort.md)
- [How photoview used LibRaw before this package](explanation/photoview-usage.md)
- [Opportunities for photoview: options and performance](explanation/opportunities-for-photoview.md)
- [The Node binding landscape (lightdrift and its forks)](explanation/node-binding-landscape.md)
- [lightdrift-libraw: alpha.6 vs 1.0.0, exact API facts](reference/lightdrift-libraw-versions.md)
- [photoview integration points (pre-migration)](reference/photoview-integration-points.md)
- [Proposed API of the new binding (draft)](reference/proposed-binding-api.md)
- [How to migrate photoview from lightdrift-libraw alpha.6 to 1.0.0](how-to/migrate-photoview-to-lightdrift-1.0.0.md)
