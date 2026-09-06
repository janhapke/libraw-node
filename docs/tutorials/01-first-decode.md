# Tutorial 1 — Build the addon in Docker and decode your first RAW

You will end with a Linux `.node` file built entirely inside Docker, and a script that turns a DNG into a
PPM image. Nothing but Docker, Node, and npm is installed on your machine. Expect 30–60 minutes the first
time (LibRaw is ~250 k lines of C++; the first compile takes several minutes).

## 0. What you need

- Docker (any recent version), Node 22 or 24, npm.
- A RAW file. If you have none at hand, generate photoview's synthetic DNG:
  `cd /home/jan/dev/photoview && npm run fixtures:pm5544-dng` produces `tests/fixtures/pm5544-768x576.dng`.

## 1. Scaffold

```bash
mkdir libraw-node && cd libraw-node && git init
npm init -y
npm i node-addon-api node-api-headers node-gyp-build
npm i -D cmake-js
mkdir -p src scripts cmake vendor prebuilds test
git submodule add -b 0.22.2 https://github.com/LibRaw/LibRaw vendor/LibRaw        # or unpack the release tarball
git submodule add https://github.com/madler/zlib vendor/zlib
git submodule add https://github.com/libjpeg-turbo/libjpeg-turbo vendor/libjpeg-turbo
```

Pin the submodules to release tags (`git -C vendor/zlib checkout v1.3.1`, libjpeg-turbo `3.1.x`), and
commit.

## 2. Minimal addon

`src/addon.cc` — one synchronous function for now; async comes in tutorial 2 and the
[async how-to](../how-to/implement-async-decode-with-cancellation.md).

```cpp
#include <napi.h>
#include <libraw/libraw.h>
#include <memory>

static void Check(Napi::Env env, int rc, const char* stage) {
  if (rc != LIBRAW_SUCCESS)
    throw Napi::Error::New(env, std::string(stage) + ": " + LibRaw::strerror(rc));
}

// decodeSync(buffer, { half_size?: boolean }) -> { width, height, colors, bits, data }
static Napi::Value DecodeSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  auto input = info[0].As<Napi::Buffer<uint8_t>>();
  bool half = info.Length() > 1 && info[1].IsObject() &&
              info[1].As<Napi::Object>().Get("half_size").ToBoolean();

  auto raw = std::make_unique<LibRaw>();
  raw->imgdata.params.use_camera_wb = 1;
  raw->imgdata.params.half_size = half ? 1 : 0;
  Check(env, raw->open_buffer(input.Data(), input.Length()), "open_buffer");
  Check(env, raw->unpack(), "unpack");
  Check(env, raw->dcraw_process(), "dcraw_process");

  int w, h, c, bps;
  raw->get_mem_image_format(&w, &h, &c, &bps);
  size_t stride = size_t(w) * c * (bps / 8);
  auto out = Napi::Buffer<uint8_t>::New(env, stride * h);          // V8 memory: Electron-safe
  Check(env, raw->copy_mem_image(out.Data(), int(stride), 0), "copy_mem_image");

  auto result = Napi::Object::New(env);
  result.Set("width", w); result.Set("height", h); result.Set("colors", c); result.Set("bits", bps);
  result.Set("data", out);
  return result;
}

static Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("decodeSync", Napi::Function::New(env, DecodeSync));
  exports.Set("version", Napi::String::New(env, LibRaw::version()));
  exports.Set("capabilities", Napi::Number::New(env, LibRaw::capabilities()));
  return exports;
}
NODE_API_MODULE(libraw_node, Init)
```

`CMakeLists.txt`: use the sketch in [how-to: build in Docker](../how-to/build-libraw-addon-in-docker.md)
§3 (it compiles LibRaw's `src/**/*.cpp` plus zlib and libjpeg-turbo into the addon). For a first run you may
drop libjpeg-turbo and `USE_JPEG8` to shorten the build; add it back before decoding lossy DNGs.

`lib/index.js`:

```js
const path = require('path');
module.exports = require('node-gyp-build')(path.join(__dirname, '..'));
```

## 3. Build inside Docker

Create `scripts/linux-build.Dockerfile` and `scripts/build-linux.sh` from the how-to, then:

```bash
./scripts/build-linux.sh x64
ls -la prebuilds/linux-x64/node.napi.node
```

First build: several minutes. Subsequent builds reuse `build/linux-x64/` and take seconds.

## 4. Decode

`test/first.js`:

```js
const fs = require('fs');
const libraw = require('..');
console.log('LibRaw', libraw.version, 'caps', libraw.capabilities.toString(2));
const buf = fs.readFileSync(process.argv[2]);
console.time('decode');
const img = libraw.decodeSync(buf, { half_size: false });
console.timeEnd('decode');
console.log(img.width, 'x', img.height, img.colors, 'ch', img.bits, 'bit');
fs.writeFileSync('out.ppm', Buffer.concat([Buffer.from(`P6\n${img.width} ${img.height}\n255\n`), img.data]));
```

```bash
node test/first.js /home/jan/dev/photoview/tests/fixtures/pm5544-768x576.dng
# LibRaw 0.22.2-Release caps 1000000 (bit 6 = ZLIB; add JPEG → bit 7)
# decode: ~20ms
# 768 x 576 3 ch 8 bit
```

Open `out.ppm` (GIMP, ImageMagick `display`, or `magick out.ppm out.png`). You should see the PM5544 test
card. Then try a real file from `/home/jan/dev/photoview/.private/testimages/IMGP5127.DNG`; note the time
(expect roughly 0.8–1.0 s single-threaded on this machine, matching photoview's benchmark minus the sharp
step).

## 5. Check the binary is Electron-shaped

```bash
nm -D --defined-only prebuilds/linux-x64/node.napi.node      # only napi_register_module_v1 (+ node_api_module_get_api_version_v1)
objdump -p prebuilds/linux-x64/node.napi.node | grep NEEDED   # libstdc++ must NOT appear if -static-libstdc++ worked
npm i --no-save electron@42
ELECTRON_RUN_AS_NODE=1 npx electron test/first.js /home/jan/dev/photoview/tests/fixtures/pm5544-768x576.dng
```

If the last command prints the same output as Node, the addon is loading through Node-API inside
Electron's runtime with no rebuild. Continue with [tutorial 2](02-fast-preview-with-half-size.md).
