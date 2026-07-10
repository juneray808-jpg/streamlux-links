## Measured before/after (automated benchmark)

**Generated:** 2026-07-10T10:06:52.698Z
**Method:** `simulatePreFixCounters()` replays legacy engine rules; `runPumpPlayBenchmark()` measures instrumented post-fix engine with mock adapter. Run via `npm run benchmark:pump-play`.

| Scenario | Metric | Before (pre-fix replay) | After (measured) | Δ | Δ% |
|----------|--------|-------------------------|------------------|---|-----|
| S1 | Engine snapshot bumps (UI re-render triggers) | 23 | 2 | -21 | 91.3% |
| S1 | Snapshot bumps caused by progress | 20 | 1 | -19 | 95.0% |
| S1 | Progress ticks suppressed (no bump) | 0 | 19 | 19 | — |
| S1 | Imperative setSource calls | 1 | 1 | 0 | 0.0% |
| S1 | Video source prop loads | 1 | 0 | -1 | 100.0% |
| S1 | Native LOAD_START events | 1 | 1 | 0 | 0.0% |
| S1 | audio_enabled instrumentation events | 1 | 1 | 0 | 0.0% |
| S1 | source_assign events | 1 | 1 | 0 | 0.0% |
| S1 | Total native load initiations (prop + imperative) | 2 | 1 | -1 | 50.0% |
| S2 | Engine snapshot bumps (UI re-render triggers) | 14 | 5 | -9 | 64.3% |
| S2 | Snapshot bumps caused by progress | 9 | 2 | -7 | 77.8% |
| S2 | Progress ticks suppressed (no bump) | 0 | 7 | 7 | — |
| S2 | Imperative setSource calls | 1 | 1 | 0 | 0.0% |
| S2 | Video source prop loads | 1 | 0 | -1 | 100.0% |
| S2 | Native LOAD_START events | 1 | 1 | 0 | 0.0% |
| S2 | audio_enabled instrumentation events | 1 | 1 | 0 | 0.0% |
| S2 | source_assign events | 1 | 1 | 0 | 0.0% |
| S2 | Total native load initiations (prop + imperative) | 2 | 1 | -1 | 50.0% |
| S3 | Engine snapshot bumps (UI re-render triggers) | 11 | 4 | -7 | 63.6% |
| S3 | Snapshot bumps caused by progress | 7 | 2 | -5 | 71.4% |
| S3 | Progress ticks suppressed (no bump) | 0 | 6 | 6 | — |
| S3 | Imperative setSource calls | 2 | 2 | 0 | 0.0% |
| S3 | Video source prop loads | 2 | 0 | -2 | 100.0% |
| S3 | Native LOAD_START events | 1 | 1 | 0 | 0.0% |
| S3 | audio_enabled instrumentation events | 2 | 2 | 0 | 0.0% |
| S3 | source_assign events | 2 | 2 | 0 | 0.0% |
| S3 | Total native load initiations (prop + imperative) | 4 | 2 | -2 | 50.0% |

### Per-fix evidence mapping

#### S1: 2s startup + 3s steady playback (@250ms progress)

- Engine snapshot bumps (UI re-render triggers): **23 → 2** (91.3% reduction)
- Snapshot bumps caused by progress: **20 → 1** (95.0% reduction)
- Progress ticks suppressed (no bump): **0 → 19**
- Imperative setSource calls: **1 → 1** (0.0% reduction)
- Video source prop loads: **1 → 0** (100.0% reduction)
- Native LOAD_START events: **1 → 1** (0.0% reduction)
- audio_enabled instrumentation events: **1 → 1** (0.0% reduction)
- source_assign events: **1 → 1** (0.0% reduction)
- Total native load initiations (prop + imperative): **2 → 1** (50.0% reduction)

#### S2: Startup with rebuffer burst (8 progress + buffer cycle)

- Engine snapshot bumps (UI re-render triggers): **14 → 5** (64.3% reduction)
- Snapshot bumps caused by progress: **9 → 2** (77.8% reduction)
- Progress ticks suppressed (no bump): **0 → 7**
- Imperative setSource calls: **1 → 1** (0.0% reduction)
- Video source prop loads: **1 → 0** (100.0% reduction)
- Native LOAD_START events: **1 → 1** (0.0% reduction)
- audio_enabled instrumentation events: **1 → 1** (0.0% reduction)
- source_assign events: **1 → 1** (0.0% reduction)
- Total native load initiations (prop + imperative): **2 → 1** (50.0% reduction)

#### S3: Handoff: second post inherits adapter register only

- Engine snapshot bumps (UI re-render triggers): **11 → 4** (63.6% reduction)
- Snapshot bumps caused by progress: **7 → 2** (71.4% reduction)
- Progress ticks suppressed (no bump): **0 → 6**
- Imperative setSource calls: **2 → 2** (0.0% reduction)
- Video source prop loads: **2 → 0** (100.0% reduction)
- Native LOAD_START events: **1 → 1** (0.0% reduction)
- audio_enabled instrumentation events: **2 → 2** (0.0% reduction)
- source_assign events: **2 → 2** (0.0% reduction)
- Total native load initiations (prop + imperative): **4 → 2** (50.0% reduction)
