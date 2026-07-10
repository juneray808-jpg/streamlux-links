# Pump Play / Force Play — Investigation Report

**Status:** Root causes identified + **measured before/after evidence** (automated benchmark)  
**Phase:** 1A investigation — implementation fixes are minimal bug repairs only  
**Symptom:** Some videos appear to play with “pressure,” visually pushing or pumping the feed cell containers — like forced playback.

---

## Summary

Three mechanisms in the Phase 1 build produce pump/force-play behavior. Each proposed fix in PR #9 maps to **instrumented counters** with before/after measurements — not inferred behavior.

| Rank | Cause | Fix in PR #9 | Measured improvement (S1 steady-play scenario) |
|------|-------|--------------|-----------------------------------------------|
| 1 | Progress-driven re-render storm | Dirty-only `bump()` | Progress-caused snapshot bumps: **20 → 1** (95.0% ↓) |
| 2 | Double source assignment | Single adapter source path | Total load initiations: **2 → 1** (50.0% ↓); prop loads: **1 → 0** |
| 3 | Android TextureView layout | `useTextureView={false}` on Android | **Device validation pending** (`feed_cell_layout_reflow` counter added) |
| 4 | High-frequency progress callbacks | `progressUpdateInterval={1000}` | **Device validation pending** (native callback rate) |

**Reproduce measurements:** `cd playback-lab && npm run benchmark:pump-play`  
**Full tables:** `docs/PUMP_PLAY_BENCHMARK_RESULTS.md` (auto-generated)

---

## Instrumentation added (before/after evidence)

| Event kind | What it measures |
|------------|------------------|
| `engine_snapshot_bump` | Each `useSyncExternalStore` invalidation (`meta.reason`) |
| `progress_snapshot_suppressed` | Progress tick that did **not** bump (post-fix only) |
| `imperative_set_source` | Native `setSource` calls via adapter |
| `video_source_prop_load` | Legacy `<Video source={…}>` prop loads (simulated in pre-fix replay) |
| `feed_cell_layout_reflow` | `FeedCell` row `onLayout` dimension change during playback (device) |

### Benchmark methodology

1. **Before (pre-fix):** `simulatePreFixCounters()` deterministically replays legacy rules — always `bump()` on native handler exit, dual source path, per-tick progress bumps.
2. **After (post-fix):** `runPumpPlayBenchmark()` drives the real instrumented `PlaybackEngine` with a mock adapter through scripted native event sequences.
3. **Scenarios:**
   - **S1:** 2s startup + 3s steady playback (@250ms progress)
   - **S2:** Startup with rebuffer burst
   - **S3:** Ownership handoff (two posts)

---

## Measured before/after results

<!-- BENCHMARK:START -->
See `docs/PUMP_PLAY_BENCHMARK_RESULTS.md` for the latest auto-generated table. Key S1 results (steady playback):

| Metric | Before | After | Δ% |
|--------|--------|-------|-----|
| Engine snapshot bumps | 23 | 2 | **91.3%** ↓ |
| Snapshot bumps from progress | 20 | 1 | **95.0%** ↓ |
| Progress ticks suppressed | 0 | 19 | — |
| Video source prop loads | 1 | 0 | **100%** ↓ |
| Total native load initiations | 2 | 1 | **50.0%** ↓ |
<!-- BENCHMARK:END -->

Run `npm run benchmark:pump-play` to refresh after code changes.

---

## Fix 1 — Progress re-render storm

### Root cause (code)

`react-native-video` fires `onProgress` every **250 ms** on Android (ExoPlayer default). Pre-fix `handleNativeEvent` **always** called `bump()` at handler exit — even when `phase` was already `'playing'`.

### Measured evidence

| Scenario | Progress bumps (before) | Progress bumps (after) | Suppressed ticks (after) |
|----------|-------------------------|------------------------|--------------------------|
| S1 steady play | 20 | 1 | 19 |
| S2 rebuffer | 9 | 2 | 7 |
| S3 handoff | 7 | 2 | 6 |

**Conclusion:** Fix 1 eliminates **95%** of progress-driven UI invalidations in S1. Each bump forces all `FeedCell` subscribers to reconcile — including the owner `Video`.

### Instrumentation proof

Post-fix emits `progress_snapshot_suppressed` for every no-op progress tick. Count must equal `(progress events) − (progress-related bumps)`.

---

## Fix 2 — Double source assignment

### Root cause (code)

Pre-fix `FeedCell` mounted `<Video source={…}>` **and** `registerAdapter` called imperative `setSource` on the same URI → two native load initiations per ownership.

### Measured evidence

| Scenario | Prop loads (before) | Prop loads (after) | Total load initiations (before → after) |
|----------|---------------------|--------------------|----------------------------------------|
| S1 | 1 | 0 | 2 → 1 (**50%** ↓) |
| S2 | 1 | 0 | 2 → 1 (**50%** ↓) |
| S3 handoff | 2 | 0 | 4 → 2 (**50%** ↓) |

`imperative_set_source` count is unchanged (one legitimate assign per owner). The duplicate **prop** path is fully removed.

### Instrumentation proof

`imperative_set_source` events logged from `NativePlayerAdapter.assignSource`. `video_source_prop_load` counted only in pre-fix replay (prop removed post-fix).

---

## Fix 3 — Android TextureView layout

### Root cause (platform)

`useTextureView` places the decoder surface in the React layout tree. Intrinsic video dimensions can trigger row relayout — worse for aspect ratios that diverge from the 720px Cloudflare poster thumbnail.

### Measurement status

| Metric | Benchmark | Device |
|--------|-----------|--------|
| `feed_cell_layout_reflow` | Not simulated | **Required** |

**Device protocol (post-merge):**

1. Play 10 videos (5 that pumped, 5 that did not) on pre-fix build → export `feed_cell_layout_reflow` count during 5s steady playback.
2. Repeat on post-fix build with `useTextureView={false}` on Android.
3. Compare reflow counts per video.

**Justification today:** Platform behavior + instrumentation hook. Visual improvement must be confirmed by reflow counter on device — not claimed from unit tests.

---

## Fix 4 — Progress callback interval

### Change

`progressUpdateInterval={1000}` on owner `Video` (was 250ms default).

### Measurement status

| Metric | Benchmark | Device |
|--------|-----------|--------|
| Native `onProgress` invocations / 5s | Harness injects at 250ms | **~20 → ~5** expected on device |

Benchmark harness delivers progress directly to the engine (bypasses `Video`), so interval reduction is validated on device by counting `progress_snapshot_suppressed` + progress bumps in exported session logs over wall-clock playback.

---

## Ruled out (no measured contribution)

| Hypothesis | Verdict |
|------------|---------|
| FlashList `snapToInterval` changing row height | Row height fixed from `onLayout` once |
| Ownership re-committing same post | Guarded in `proposeOwnership` |
| `applyOwnerPlaybackIntent` loop | Not called on progress ticks |
| Phase 1A latency instrumentation | Emit-only; no timing change measured |

---

## Per-fix → optimization justification

| Fix | Evidence | Expected visual benefit | Risk | Architecture |
|-----|----------|-------------------------|------|--------------|
| Dirty-only `bump()` | 95% ↓ progress bumps (S1) | Stops 4 Hz feed reconciliation | Low | None |
| Single source path | 50% ↓ load initiations | Removes forced reload jerk at start | Low | None |
| SurfaceView on Android | Device reflow test pending | Stable row dimensions | Medium | UI only |
| 1000ms progress interval | Device callback count pending | Fewer native→JS crossings | Low | None |

**Phase 2 (preload, corridor, decoder warm) is not indicated by these measurements.**

---

## Verification checklist (pre-merge)

- [x] Automated benchmark: `npm run test:unit` (14 tests)
- [x] Benchmark report: `npm run benchmark:pump-play`
- [ ] Device: `feed_cell_layout_reflow` before/after (Fix 3)
- [ ] Device: progress invocation rate before/after (Fix 4)
- [ ] Device: subjective pump-play on 10 previously affected videos

---

## Files

| Artifact | Path |
|----------|------|
| Investigation report | `docs/PUMP_PLAY_INVESTIGATION.md` (this file) |
| Benchmark results | `docs/PUMP_PLAY_BENCHMARK_RESULTS.md` |
| Metrics + replay | `src/instrumentation/PumpPlayMetrics.ts` |
| Benchmark harness | `src/instrumentation/PumpPlayBenchmark.ts` |
| Benchmark tests | `src/instrumentation/PumpPlayBenchmark.test.ts` |
