# LibRaw output params reference (`decode({ params })` / `Processor#setParams()`/`#getParams()`)

> Generated file -- do not edit by hand. Regenerate with `npm run gen:docs` (scripts/gen-docs.js).
> Source: libraw_output_params_t (imgdata.params), api/params.json.

| Field | Type | Default | Range / Enum / Flags | Description |
| --- | --- | --- | --- | --- |
| `greybox` | number[4] | `[0,0,4294967295,4294967295]` | — | Area (x, y, w, h), in raw pixels, averaged for use_auto_wb. -A in dcraw. Default is {0,0,UINT_MAX,UINT_MAX} (the whole image), not all-zero -- verified in LibRaw::LibRaw(). |
| `cropbox` | number[4] | `[0,0,4294967295,4294967295]` | — | Crop rectangle (x, y, w, h), in raw pixels, applied in raw2image before rotation. Default is {0,0,UINT_MAX,UINT_MAX} (no crop), not all-zero -- verified in LibRaw::LibRaw(). |
| `aber` | number[4] | `[1,1,1,1]` | — | Chromatic aberration correction multipliers. Only aber[0] (red) and aber[2] (blue) are used; can affect raw data reading since it changes output size. -C in dcraw. |
| `gamm` | number[6] | `[0.45,4.5,0,0,0,0]` | — | Output gamma curve: gamm[0] = 1/power, gamm[1] = toe slope (0 for a pure power curve); gamm[2..5] are filled in by LibRaw. -g power toe_slope in dcraw. Default is rec. BT.709 (power 2.222, i.e. gamm[0]=1/2.222=0.45, toe slope 4.5), not sRGB -- verified in LibRaw::LibRaw(). For an sRGB curve set gamm[0]=1/2.4, gamm[1]=12.92; for linear, set both to 1.0. |
| `user_mul` | number[4] | `[0,0,0,0]` | — | Manual white-balance multipliers (R, G, B, G2); non-zero values enable manual WB. -r mul0 mul1 mul2 mul3 in dcraw. |
| `bright` | number (float) | `1` | — | Brightness multiplier applied in scale_colors/auto-bright. -b in dcraw. |
| `threshold` | number (float) | `0` | >= 0 | Wavelet denoise threshold; 0 disables, typical useful range 100-1000. -n in dcraw. |
| `half_size` | boolean | `false` | — | 2x2 binning, no demosaic; output is half size. Can affect raw data reading for some formats. -h in dcraw. |
| `four_color_rgb` | boolean | `false` | — | Interpolate the two green channels of a Bayer image separately instead of averaging them. -f in dcraw. |
| `highlight` | number (int) | `0` | >= 0, <= 9 | Highlight recovery mode: 0 clip, 1 unclip (leave), 2 blend, 3-9 rebuild (higher = more aggressive reconstruction). -H in dcraw. |
| `use_auto_wb` | boolean | `false` | — | Use white balance averaged over the whole image (or the greybox area). -a in dcraw. |
| `use_camera_wb` | boolean | `false` | — | Use the as-shot white balance from the camera (cam_mul) if available. Falls back to auto-WB, or to daylight WB if LIBRAW_RAWOPTIONS_CAMERAWB_FALLBACK_TO_DAYLIGHT is set in rawparams.options. -w in dcraw. The vendored reference doc's row for this field previously said "check default" as a placeholder; the constructor never sets it, so it is 0/false like every other field zeroed by ZERO(imgdata). |
| `use_camera_matrix` | enum (number) | `1` | 0=NEVER, 1=IF_CAMERA_WB, 3=ALWAYS | Use the embedded camera color matrix. 1 (default): use for DNG files always, for other files only when use_camera_wb is set. 3: use regardless of white-balance setting. +M/-M in dcraw. |
| `output_color` | enum (number) | `1` | 0=RAW, 1=SRGB, 2=ADOBE, 3=WIDE, 4=PROPHOTO, 5=XYZ, 6=ACES, 7=DCI_P3, 8=REC2020 | Output color space: 0 raw, 1 sRGB, 2 Adobe RGB, 3 Wide Gamut RGB, 4 ProPhoto RGB, 5 XYZ, 6 ACES, 7 DCI-P3, 8 Rec. 2020. -o in dcraw. |
| `output_profile` | string \| null | null | — | Path to an ICC output profile file. Only used when LibRaw was built with LCMS2 support. -o filename in dcraw. |
| `camera_profile` | string \| null | null | — | Path to an ICC input (camera) profile file, or the literal string "embed" to use the file's embedded profile. Only used when LibRaw was built with LCMS2 support. -p file in dcraw. |
| `bad_pixels` | string \| null | null | — | Path to a dcraw-format bad-pixel map file. -P file in dcraw. |
| `dark_frame` | string \| null | null | — | Path to a 16-bit PGM dark-frame file. -K file in dcraw. |
| `output_bps` | enum (number) | `8` | 8=8, 16=16 | Output bits per sample. -4 in dcraw selects 16. |
| `output_tiff` | boolean | `false` | — | Write TIFF instead of PPM/PGM from dcraw_ppm_tiff_writer. -T in dcraw. |
| `output_flags` | flags (`number \| name[]`) | `0` | LIBRAW_OUTPUT_FLAGS_NONE=0, LIBRAW_OUTPUT_FLAGS_PPMMETA=1 | Bitfield of output-file options. PPMMETA writes additional metadata into PPM/PGM output files. |
| `user_flip` | number (int) | `-1` | >= -1, <= 7 | Flip/rotate the output image. -1 uses the value from the raw file (the default); 0 none, 3 180 degrees, 5 90 degrees CCW, 6 90 degrees CW; the full 0-7 range is accepted (dcraw-style flip/rotate bit combinations). Can affect raw data reading for some formats (e.g. Kodak thumbnail unpacking). -t in dcraw. |
| `user_qual` | enum (number) | `-1` | 0=LINEAR, 1=VNG, 2=PPG, 3=AHD, 4=DCB, 5=MODIFIED_AHD_GPL2, 6=AFD_GPL2, 7=VCD_GPL2, 8=VCD_MODIFIED_AHD_GPL2, 9=LMMSE_GPL2, 10=AMAZE_GPL3, 11=DHT, 12=AAHD | Demosaic algorithm: 0 linear, 1 VNG, 2 PPG, 3 AHD, 4 DCB, 5-10 GPL2/GPL3 demosaic-pack algorithms (unavailable, fall back to AHD), 11 DHT, 12 modified AHD (AAHD). -q in dcraw. Default -1 selects AHD (3) at process time. 5-10 name the LibRaw-demosaic-pack-GPL2/GPL3 algorithms (5 modified AHD, 6 AFD, 7 VCD, 8 mixed VCD/modified AHD, 9 LMMSE, 10 AMaZE -- vendor/LibRaw/Changelog.txt's 2010-11-15 entry and vendor/LibRaw/README.demosaic-packs). Those packs were never merged into this vendored LibRaw source (README.demosaic-packs: "LibRaw-demosaic-pack-GPLn are abandoned"), so 5-10 are unreachable in any build of this package -- verified against vendor/LibRaw/src/postprocessing/dcraw_process.cpp, whose quality dispatch handles 0, 1, 2, 3, 4, 11, 12 explicitly and falls back to ahd_interpolate() with LIBRAW_WARN_FALLBACK_TO_AHD set for every other value, 5-10 included. |
| `user_black` | number (int) | `-1` | — | Override black level for all channels; -1 uses the value LibRaw determined from the raw file. -k in dcraw. |
| `user_cblack` | number[4] | `[-1000001,-1000001,-1000001,-1000001]` | — | Per-channel correction to user_black/the detected black level. Default is {-1000001,-1000001,-1000001,-1000001} (LibRaw treats any value <= -1000000 as unset), not 0 -- verified in LibRaw::LibRaw() and utils_libraw.cpp's `if (O.user_cblack[i] > -1000000)` check. |
| `user_sat` | number (int) | `-1` | — | Override saturation (white) level; -1 uses the value LibRaw determined from the raw file. -S in dcraw. |
| `med_passes` | number (int) | `0` | >= 0 | Number of 3x3 median filter passes applied after demosaic. -m in dcraw. |
| `auto_bright_thr` | number (float) | `0.01` | >= 0 | Fraction of pixels allowed to clip when no_auto_bright is off. 0.01 (1%) matches dcraw. For modern low-noise multi-megapixel cameras, values in the 0.00003-0.001 range are often more appropriate. |
| `adjust_maximum_thr` | number (float) | `0.75` | >= 0, <= 1 | Auto-adjusts the maximum data value from real channel_maximum[] data if the calculated maximum is at least this fraction of the nominal maximum; 0 disables the adjustment. |
| `no_auto_bright` | boolean | `false` | — | Disable automatic brightness increase by histogram. -W in dcraw. |
| `use_fuji_rotate` | boolean | `true` | — | Rotate Fuji Super-CCD / X-Trans images back to their natural 45-degree orientation. -j in dcraw. The vendored reference doc previously listed the default as -1 (matching only one of two contradictory statements in LibRaw's own API-datastruct.html); the constructor sets it to 1, and every use site (mem_image.cpp, dcraw_process.cpp, utils_libraw.cpp) only tests truthiness, so any non-zero value behaves the same as 1. Modeled here as bool; 0 disables rotation. |
| `use_p1_correction` | boolean | `true` | — | Apply Phase One compressed-file corrections (linearization etc.) when non-zero (the default). |
| `green_matching` | boolean | `false` | — | Fix a green-channel imbalance between the two green subpixels as an extra postprocessing pass. Requires additional memory. |
| `dcb_iterations` | number (int) | `0` | — | Number of DCB demosaic correction passes; only meaningful with user_qual=4 (DCB). LibRaw's own API-datastruct.html says the default is -1 ("no correction"), but LibRaw::LibRaw() never sets this field, so it is 0 like every other field zeroed by ZERO(imgdata) -- verified in init_close_utils.cpp and postprocessing/dcraw_process.cpp's `if (O.dcb_iterations >= 0) iterations = O.dcb_iterations;` (0 overrides the DCB routine's own internal -1 default). |
| `dcb_enhance_fl` | boolean | `false` | — | Enhance interpolated colors during DCB demosaic (user_qual=4). |
| `fbdd_noiserd` | number (int) | `0` | >= 0 | FBDD noise reduction applied before demosaic: 0 off, 1 light, 2 (and higher) full. |
| `exp_correc` | boolean | `false` | — | Enable exposure correction (exp_shift/exp_preser) before demosaic. |
| `exp_shift` | number (float) | `1` | >= 0.25, <= 8 | Exposure correction multiplier, linear scale. Usable range 0.25 (2-stop darken) to 8.0 (3-stop lighten). Only applied when exp_correc is set. |
| `exp_preser` | number (float) | `0` | >= 0, <= 1 | Highlight preservation when lightening via exp_shift > 1. 0.0 no preservation, 1.0 full preservation. Only applied when exp_correc is set. |
| `no_auto_scale` | boolean | `false` | — | Skip scale_colors() in dcraw_process() (no white balance, no black/white normalization). White balance is applied in scale_colors(), so skipping it yields an unbalanced image; intended for use with no_interpolation or a custom interpolation callback. |
| `no_interpolation` | boolean | `false` | — | Skip the demosaic step in dcraw_process(); output stays as a 4-channel mosaic. |

