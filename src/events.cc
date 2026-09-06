#include "events.h"

#include "cancel.h"

namespace libraw_node {

void RecordDataErrorEvent(void* data, const char* file, INT64 offset) {
  auto* state = static_cast<JobCancelState*>(data);
  state->events->PushDataError(static_cast<int64_t>(offset), file);
}

void RecordExifTagEvent(void* context, int tag, int type, int len, unsigned int ord, void* /*ifp*/,
                         INT64 /*base*/) {
  auto* state = static_cast<JobCancelState*>(context);
  state->events->PushExifTag(tag, type, len, ord);
}

Napi::Array EventsToArray(Napi::Env env, const std::vector<JobEvent>& events) {
  Napi::Array arr = Napi::Array::New(env, events.size());
  for (size_t i = 0; i < events.size(); i++) {
    const JobEvent& e = events[i];
    Napi::Object o = Napi::Object::New(env);
    switch (e.kind) {
      case JobEvent::Kind::kProgress:
        o.Set("kind", "progress");
        o.Set("stage", e.stage);
        o.Set("iteration", e.iteration);
        o.Set("expected", e.expected);
        break;
      case JobEvent::Kind::kDataError:
        o.Set("kind", "dataError");
        o.Set("offset", static_cast<double>(e.offset));
        o.Set("message", e.message);
        break;
      case JobEvent::Kind::kExifTag:
        o.Set("kind", "exifTag");
        o.Set("tag", e.tag);
        o.Set("type", e.type);
        o.Set("len", e.len);
        o.Set("ordering", e.ordering);
        break;
    }
    arr[static_cast<uint32_t>(i)] = o;
  }
  return arr;
}

}  // namespace libraw_node
