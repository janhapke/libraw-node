# LibRaw output parameters (`imgdata.params`, `libraw_output_params_t`)

Postprocessing knobs read by `dcraw_process()` (and `raw2image*` for `half_size`/crop). Names are the C
field names; a binding should keep them verbatim (snake_case) so LibRaw's docs apply. Defaults are LibRaw's
own (set in `LibRaw::LibRaw()`); verify against the vendored version's `libraw_cxx.cpp` when generating
docs — in particular `use_camera_wb` (set it explicitly in the binding's defaults).

| Field | Type | Meaning | Values / default |
|---|---|---|---|
| `greybox[4]` | unsigned | Area (x, y, w, h) used for `use_auto_wb` | 0 = whole image |
| `cropbox[4]` | unsigned | Crop (x, y, w, h) applied in `raw2image`, before rotation | 0 = none |
| `aber[4]` | double | Chromatic aberration: `aber[0]` red scale, `aber[2]` blue scale | 1.0 |
| `gamm[6]` | double | Gamma curve: `gamm[0]` = 1/γ, `gamm[1]` = toe slope (0 → pure power) | sRGB: 1/2.4, 12.92 |
| `user_mul[4]` | float | Manual WB multipliers (R, G, B, G2); non-zero enables | 0 |
| `bright` | float | Brightness multiplier | 1.0 |
| `threshold` | float | Wavelet denoise threshold (dcraw `-n`), 100–1000 typical | 0 = off |
| `half_size` | int | 2×2 binning, no demosaic, output ½ × ½ | 0 |
| `four_color_rgb` | int | Interpolate the two greens separately | 0 |
| `highlight` | int | 0 clip, 1 unclip (leave), 2 blend, 3–9 rebuild with level | 0 |
| `use_auto_wb` | int | Average-the-image WB | 0 |
| `use_camera_wb` | int | As-shot WB from `cam_mul` (falls back to daylight if absent; see `LIBRAW_RAWOPTIONS_CAMERAWB_FALLBACK_TO_DAYLIGHT`) | check default |
| `use_camera_matrix` | int | 0 never, 1 use camera colour matrix if `use_camera_wb` (default), 3 always | 1 |
| `output_color` | int | 0 raw, 1 sRGB, 2 Adobe RGB, 3 Wide Gamut, 4 ProPhoto, 5 XYZ, 6 ACES, 7 DCI-P3, 8 Rec2020 | 1 |
| `output_profile` | char* | ICC output profile path (needs LCMS2) | NULL |
| `camera_profile` | char* | ICC input profile path or `"embed"` (needs LCMS2) | NULL |
| `bad_pixels` | char* | dcraw bad-pixel map file | NULL |
| `dark_frame` | char* | 16-bit PGM dark frame | NULL |
| `output_bps` | int | 8 or 16 bits per sample | 8 |
| `output_tiff` | int | `dcraw_ppm_tiff_writer` writes TIFF instead of PPM | 0 |
| `output_flags` | int | `LIBRAW_OUTPUT_FLAGS_PPMMETA` (metadata comment in PPM) | 0 |
| `user_flip` | int | -1 use file's orientation, 0 none, 3 = 180°, 5 = 90° CCW, 6 = 90° CW | -1 |
| `user_qual` | int | Demosaic: 0 linear, 1 VNG, 2 PPG, 3 AHD, 4 DCB, 11 DHT, 12 modified AHD (AAHD); 5–10 need GPL packs, fall back to AHD with `LIBRAW_WARN_FALLBACK_TO_AHD` | -1 (→ AHD) |
| `user_black` | int | Override black level | -1 |
| `user_cblack[4]` | int | Per-channel black adjustment | 0 |
| `user_sat` | int | Override saturation (white) level | -1 |
| `med_passes` | int | 3×3 median filter passes after demosaic | 0 |
| `auto_bright_thr` | float | Fraction of pixels allowed to clip in auto-brightness | 0.01 |
| `adjust_maximum_thr` | float | Auto-adjust maximum if data max < this × maximum; 0 disables | 0.75 |
| `no_auto_bright` | int | Disable auto-brightness (dcraw `-W`) | 0 |
| `use_fuji_rotate` | int | Rotate 45° X-Trans/SuperCCD: -1 default, 0 off, 1 on | -1 |
| `green_matching` | int | Fix green channel imbalance | 0 |
| `dcb_iterations` | int | DCB correction passes; -1 off | -1 |
| `dcb_enhance_fl` | int | DCB colour enhance | 0 |
| `fbdd_noiserd` | int | FBDD noise reduction before demosaic: 0 off, 1 light, 2 full | 0 |
| `exp_correc` | int | Enable exposure correction | 0 |
| `exp_shift` | float | Exposure multiplier 0.25–8.0 | 1.0 |
| `exp_preser` | float | Highlight preservation 0–1 when `exp_shift` > 1 | 0.0 |
| `no_auto_scale` | int | Skip `scale_colors` (no WB, no normalisation) | 0 |
| `no_interpolation` | int | Skip demosaic; output stays 4-channel mosaic | 0 |
| `use_rawspeed`, `use_dngsdk` | int | Moved to `rawparams` in 0.21; present here only in ≤ 0.20 | — |
| `use_p1_correction` | int | Phase One corrections (0.21+) | 1 |

## Recommended presets for a viewer

| Tier | Settings |
|---|---|
| preview (no usable embedded JPEG) | `half_size=1`, `use_camera_wb=1`, `output_bps=8`, `user_flip=-1`, `no_auto_bright=0` |
| full at screen size | `user_qual=0` or `2`, `use_camera_wb=1`, `highlight=0`, `fbdd_noiserd=0` |
| full at 100 % zoom | `user_qual=3` (AHD) or `11` (DHT, better on fine detail), `highlight=2`, optional `med_passes=1` |
| colour-critical | `output_color=1`, `output_bps=16`, `no_auto_bright=1`, `camera_profile="embed"` (LCMS2) |
