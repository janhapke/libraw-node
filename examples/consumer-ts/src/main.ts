// T15 acceptance fixture -- exercises the public types from
// @janhapke/libraw's types/index.d.ts (resolved here via the "@janhapke/
// libraw": "file:../.." dependency in this example's package.json, exactly
// as a real npm-installed consumer would). Never executed (no display, no
// real RAW file needed): `npm run typecheck` (== `tsc --noEmit`) is the
// whole point -- see this repo's docs/plan/tasks.md T15 acceptance.
import {
  decode,
  identify,
  thumbnail,
  Processor,
  LibRawError,
  enums,
  buildInfo,
  version,
  type DecodeResult,
  type IdentifyResult,
  type OutputParams,
  type ProgressEvent,
} from '@janhapke/libraw';

async function main(): Promise<void> {
  console.log('LibRaw', version(), 'openmp:', buildInfo.openmp, 'flags:', buildInfo.flags);

  // A real caller would `readFileSync` a RAW file here; an empty buffer is
  // enough to exercise the types without needing a fixture on disk.
  const buffer: Buffer = Buffer.alloc(0);

  // --- fused decode()/identify()/thumbnail(), and LibRawError narrowing ---
  try {
    const params: OutputParams = { half_size: true, user_qual: 3, output_bps: 8 };
    const result: DecodeResult = await decode(buffer, {
      params,
      output: { layout: 'rgb' },
      onProgress: (event: ProgressEvent) => {
        console.log('decode progress', event.stage, event.iteration, event.expected);
      },
    });
    console.log('decoded', result.width, result.height, result.colors, result.warnings.join(','));

    const info: IdentifyResult = await identify(buffer, { rawparams: { shot_select: 0 } });
    console.log('camera', info.idata.make, info.idata.model, 'lens mount', info.metadata.lens.makernotes.LensMount);

    const thumb = await thumbnail(buffer, { index: 0 });
    console.log('thumb', thumb.format, thumb.width, thumb.height);
  } catch (err) {
    if (err instanceof LibRawError) {
      // `code`/`stage` only exist on LibRawError -- this branch proves the
      // narrowing actually happens at the type level, not just at runtime.
      console.error('LibRaw error', err.code, err.name, err.stage, err.aborted ?? false);
    } else {
      throw err;
    }
  }

  // --- Processor: events, and setParams with a typed enum literal ---
  const processor = new Processor({ exifTags: true });

  processor.on('progress', (event) => {
    // `event` is inferred as ProgressEvent from the 'progress' overload.
    console.log('processor progress', event.stage);
  });
  processor.on('dataError', (event) => {
    console.warn('processor data error', event.offset, event.message);
  });
  processor.on('exifTag', (event) => {
    console.log('exif tag', event.tag & 0xffff, event.type, event.len);
  });

  // `use_camera_matrix` is typed as the union `0 | 1 | 3` (ParamsUseCameraMatrix,
  // generated from api/params.json's enum map) -- 3 (ALWAYS) is a valid literal.
  processor.setParams({ use_camera_matrix: 3, output_color: 1 });

  // @ts-expect-error -- 2 is not a member of ParamsUseCameraMatrix (0 | 1 | 3);
  // proves setParams() actually rejects an out-of-enum literal at compile time.
  processor.setParams({ use_camera_matrix: 2 });

  await processor.openBuffer(buffer);
  await processor.unpack();
  await processor.process();
  const img = await processor.image({ bgr: false });
  console.log('processor image', img.width, img.height, img.data.length);

  const decoderInfo = processor.decoderInfo();
  console.log('decoder', decoderInfo.decoder_name, decoderInfo.decoder_flags);

  processor.close();

  console.log('capabilities', enums.CAPS.NAME_TO_VALUE.ZLIB, enums.WARN.NAME_TO_VALUE.FALLBACK_TO_AHD);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
