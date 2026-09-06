# What LibRaw is

LibRaw is a C++ library that reads camera RAW files (the sensor data a camera saves before it produces a
JPEG) and turns them into pixels you can display. It descends from Dave Coffin's `dcraw` program and is
maintained by LibRaw LLC (Alex Tutubalin and Iliah Borg). It is what darktable, RawTherapee, digiKam,
Shotwell, ImageMagick, and libvips (since 8.18) use for RAW input.

## Current versions

| Branch | Latest | Date | Notes |
|---|---|---|---|
| 0.22 | 0.22.2 | 2026-07-16 | Current stable. 0.22.0 (2026-01-13) added ~1284 cameras, DNG 1.7 / JPEG-XL (with Adobe DNG SDK), Canon CRN, Nikon NEFX pixel-shift merge, Sony YCC pseudo-RAW, 64-bit file offsets everywhere, dropped old cinema-camera decoders. |
| 0.21 | 0.21.5 | 2025-12-24 | "Last release in 0.21 branch." This is what Ubuntu's `libraw-dev` on this machine provides (`/usr/include/libraw/libraw_version.h` says 0.21.5). |

`lightdrift-libraw` alpha.6 links whatever system LibRaw is installed (0.21.5 here); `lightdrift-libraw`
1.0.0 vendors 0.22.2. A new binding should vendor 0.22.x.

## What it does, in stages

LibRaw is a staged pipeline over one `LibRaw` object (see
[libraw-api-surface.md](libraw-api-surface.md) for the method-level view):

1. **Open** (`open_file` / `open_buffer`): parse the container (TIFF/EXIF/MakerNotes, CR3 boxes, RAF, ...),
   fill `imgdata.idata` (make/model), `imgdata.sizes`, `imgdata.other` (ISO, shutter, aperture, GPS),
   `imgdata.lens`, `imgdata.color` (matrices, white balance, black/white levels), `imgdata.makernotes`,
   and `imgdata.thumbs_list` (all embedded previews). No pixel data is decoded. This is cheap (a few ms).
2. **Unpack** (`unpack`): run the format-specific decoder (lossless JPEG, Canon CR3 CRX, Fuji compressed,
   Sony ARW, Panasonic, Nikon, DNG deflate/JPEG/JPEG-XL, ...) into `imgdata.rawdata` — a 16-bit (or float)
   mosaic. This is the first expensive step; it is CPU-bound and single-threaded.
3. **Unpack thumbnail** (`unpack_thumb` / `unpack_thumb_ex(i)`): extract an embedded preview (usually a
   JPEG the camera already produced). Cheap, independent of step 2.
4. **Postprocess** (`dcraw_process`): black subtraction, white balance, demosaic (interpolate the Bayer or
   X-Trans mosaic into RGB), highlight recovery, denoise, colour-space conversion, gamma, brightness, flip.
   Controlled entirely by `imgdata.params` ([reference](../reference/libraw-output-params.md)). This is the
   second expensive step. Some demosaic methods (PPG, AHD, DHT/AAHD) contain OpenMP pragmas and run in
   parallel if the library was compiled with OpenMP.
5. **Output** (`dcraw_make_mem_image`, `copy_mem_image`, `dcraw_ppm_tiff_writer`): 8- or 16-bit RGB in memory
   or to PPM/TIFF. There is no JPEG encoder in LibRaw; a binding pairs it with something like `sharp`.

## What it is not

- Not a JPEG/PNG/TIFF reader. `open_buffer()` on a plain JPEG fails (see knowledge base `exif.md`).
- Not a colour-managed renderer like darktable. It is a "dcraw-quality" default renderer with many knobs.
- Not a lens-database. Lens names come from standard EXIF tags or literal MakerNote strings; there is no
  lens-ID lookup table (knowledge base `libraw.md`, corrected section).
- Not a tile/region decoder. It decodes the whole frame; `cropbox` crops only during postprocessing, after
  the full unpack. `half_size` is the only decode-time size reduction (2x2 binning, no interpolation).

## Optional dependencies (compile-time)

| Dependency | Define | Gives you | Needed for photoview? |
|---|---|---|---|
| zlib | `USE_ZLIB` | Deflate-compressed DNG (common for float/HDR DNG) | Yes (cheap, vendor it) |
| libjpeg 8+ / libjpeg-turbo | `USE_JPEG8` / `USE_JPEG` | Lossy-JPEG-compressed DNG, some JPEG previews | Recommended; lossy DNG is common from phones and Lightroom "lossy DNG" |
| LCMS2 | `USE_LCMS2` | `output_profile` / `camera_profile` ICC handling | Optional |
| RawSpeed | `USE_RAWSPEED` | Alternative faster decoders for some formats (LGPL, big) | No for v1 |
| Adobe DNG SDK | `USE_DNGSDK` | DNG 1.7 / JPEG-XL DNG, full DNG opcode support | No for v1 (heavy, Adobe licence) |
| Jasper | `USE_JASPER` | RED cine (dropped in 0.22) | No |
| OpenMP | `-fopenmp` | Parallel PPG/AHD/DHT/AAHD demosaic | Yes for parity: Ubuntu's `libraw_r.so` that photoview links today already has it (`libgomp`), as well as libjpeg and LCMS2 but **not** zlib (checked 2026-09-03 via `ldd` and `getCapabilities()`) |

## Threading model

From the LibRaw API notes: "Thread safety is ensured if a LibRaw object is created and used within one
thread." Unix builds produce `libraw.a` (compiled with `-DLIBRAW_NOTHREADS`, uses statics, slightly faster)
and `libraw_r.a` (reentrant). A Node addon that is loaded in several `worker_threads` or used from
`Napi::AsyncWorker`s must be built **without** `LIBRAW_NOTHREADS` and must give each concurrent decode
its own `LibRaw` instance. Each instance costs ~1 MB of stack/heap plus the image buffers, so allocate
instances on the heap (`std::unique_ptr<LibRaw>`), which lightdrift already does.

## Licence

Dual-licensed: LGPL 2.1 **or** CDDL 1.0, at your choice. See [licensing.md](licensing.md) for why CDDL is
the friendlier choice for a statically linked addon shipped inside a desktop app.
