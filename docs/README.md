# LibRaw Node binding — research docs

Research for a new, self-owned Node.js native binding to [LibRaw](https://www.libraw.org/), built for
Electron apps (Windows, macOS, Linux), with the full LibRaw option surface, real off-thread decoding, and a
Docker-driven, reproducible build. The immediate consumer is the `photoview` Electron app
(`/home/jan/dev/photoview`), which today uses `lightdrift-libraw@1.0.0-alpha.6`.

Written 2026-09-03. Facts were checked against the LibRaw 0.21.5 headers installed on this machine,
the LibRaw 0.22.2 release notes and docs, the `lightdrift-libraw` source on GitHub (alpha.6 as installed in
photoview, and 1.0.0 on `master`), the photoview source and benchmark CSVs, the `sharp-electron` build
scripts, and the knowledge base in `/home/jan/dev/_jdd/knowledge-base`. Sources are listed in
[reference/sources.md](reference/sources.md).

The docs follow [Diátaxis](https://diataxis.fr/): tutorials teach, how-to guides solve a task, reference
describes, explanation discusses.

## Start here

1. [Explanation: what LibRaw is](explanation/what-is-libraw.md)
2. [Explanation: the Node binding landscape (lightdrift and its forks)](explanation/node-binding-landscape.md)
3. [Explanation: how photoview uses LibRaw today](explanation/photoview-usage.md)
4. [Explanation: where photoview would gain options and speed](explanation/opportunities-for-photoview.md)
5. [Explanation: adoption comparison — alpha.6 vs lightdrift 1.0.0 vs self-built](explanation/adoption-comparison.md)
6. [Explanation: roadmap and effort estimates](explanation/roadmap-and-effort.md)

## Plan

- [Task breakdown for agent execution (T01–T28)](plan/tasks.md)

## Tutorials (learning by doing)

- [01 — Build the addon in Docker and decode your first RAW](tutorials/01-first-decode.md)
- [02 — Produce a fast preview with `half_size`](tutorials/02-fast-preview-with-half-size.md)

## How-to guides (task oriented)

- [Build LibRaw and the addon inside Docker](how-to/build-libraw-addon-in-docker.md)
- [Implement asynchronous decoding with cancellation (Napi::AsyncWorker)](how-to/implement-async-decode-with-cancellation.md)
- [Expose LibRaw options to JavaScript](how-to/expose-libraw-options.md)
- [Make the addon Electron-safe](how-to/make-the-addon-electron-safe.md)
- [Set up prebuilds and CI for Linux, macOS, Windows](how-to/set-up-prebuilds-and-ci.md)
- [Test the addon under Electron without a GUI](how-to/test-under-electron.md)
- [Integrate the new binding into photoview](how-to/integrate-into-photoview.md)

## Reference (facts, tables)

- [Output params reference (generated)](reference/params.md)
- [Raw-unpack params reference (generated)](reference/rawparams.md)
- [Metadata reference (generated)](reference/metadata.md)
- [Enums reference (generated)](reference/enums.md)
- [LibRaw processing methods (the C++ API surface)](reference/libraw-processing-methods.md)
- [LibRaw output parameters (`imgdata.params`)](reference/libraw-output-params.md)
- [LibRaw raw-unpack params, thumbnail list, capability and warning flags](reference/libraw-raw-params-thumbnails-flags.md)
- [lightdrift-libraw: alpha.6 vs 1.0.0, exact API facts](reference/lightdrift-libraw-versions.md)
- [photoview integration points](reference/photoview-integration-points.md)
- [Proposed API of the new binding](reference/proposed-binding-api.md)
- [Build matrix: platforms, toolchains, artifacts](reference/build-matrix.md)
- [Sources](reference/sources.md)

## Explanation (understanding)

- [What LibRaw is](explanation/what-is-libraw.md)
- [The LibRaw API surface and processing pipeline](explanation/libraw-api-surface.md)
- [The Node binding landscape](explanation/node-binding-landscape.md)
- [How photoview uses LibRaw](explanation/photoview-usage.md)
- [Opportunities for photoview: options and performance](explanation/opportunities-for-photoview.md)
- [Electron compatibility](explanation/electron-compatibility.md)
- [Build and distribution strategy (Docker, cross-platform, prebuilds)](explanation/build-and-distribution-strategy.md)
- [Licensing](explanation/licensing.md)
- [Adoption comparison](explanation/adoption-comparison.md)
- [Roadmap and effort](explanation/roadmap-and-effort.md)

## Decisions

Recorded in [explanation/roadmap-and-effort.md#decisions-jan-2026-09-03](explanation/roadmap-and-effort.md#decisions-jan-2026-09-03).
