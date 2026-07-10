# Phase 1A — Startup Latency Investigation Protocol

**Status:** Instrumentation deployed — device data collection required  
**Phase:** 1A (investigation only — no optimizations)  
**Architecture:** Frozen (ADR-001 through ADR-005 unchanged)

---

## Objective

Identify the **exact source** of push-play hesitation / flicker before first frame — using measured evidence only. No speculation. No playback behavior changes.

---

## Instrumented events

Every ownership session records these events (minimum):

| Event kind | Source |
|------------|--------|
| `ownership_candidate` | PlaybackEngine.proposeOwnership |
| `ownership_validated` | PlaybackEngine.proposeOwnership |
| `ownership_committed` | PlaybackEngine.commitOwnership (commit anchor) |
| `previous_owner_muted` | PlaybackEngine.silenceAdapter (handoff) |
| `previous_owner_paused` | PlaybackEngine.silenceAdapter (handoff) |
| `react_cell_becomes_owner` | FeedCell useEffect (owner mount) |
| `source_assign` | PlaybackEngine registerAdapter / activateOwnerIfReady |
| `native_load_start` | react-native-video → engine |
| `native_ready` | react-native-video → engine |
| `native_buffer_start` | react-native-video → engine |
| `native_buffer_end` | react-native-video → engine |
| `first_frame` | engine progress threshold |
| `poster_hidden` | engine first frame |
| `audio_enabled` | engine applyOwnerPlaybackIntent |

### Per-event fields

- `ts` — monotonic (`performance.now()`)
- `deltaMs` — since previous event in session
- `deltaFromCommitMs` — since `ownership_committed`
- `postId`, `ownerGeneration`, `adapterId`, `sessionId`

---

## Device collection protocol

### Build

1. Merge Phase 1A branch.
2. For **release APK** testing, set `EXPO_PUBLIC_LATENCY_INVESTIGATION=1` in GitHub Actions secrets or `.env` to enable the Phase 1A overlay on device.
3. Build APK via `playback-lab-build-apk.yml`.

### On device

1. Uninstall previous Playback Lab APK.
2. Install instrumented build.
3. Confirm **Phase 1A · startup latency** overlay is visible.
4. Perform **20 ownership transitions**:
   - 10 cold-start scrolls (app relaunch between sets of 5)
   - 10 handoff scrolls (slow vertical snap, wait for first frame each time)
5. Tap **Copy sessions + report** (Share sheet) after each batch; save to files.
6. Optionally run `npm run report:latency -- export.json` locally to regenerate markdown.

### Minimum sample size

| Metric | Minimum sessions |
|--------|------------------|
| Per-stage stats | 10 completed sessions |
| P95 reliability | 20 completed sessions |

---

## Stage definitions

Stages are computed automatically by `StartupLatencyAnalyzer`:

- Candidate proposed → validated
- Validated → committed
- Committed → previous owner muted *(handoff only)*
- Previous owner muted → paused *(handoff only)*
- Previous paused → React owner *(handoff)* OR Committed → React owner *(cold start)*
- React owner → source assignment
- Source assignment → native LOAD_START
- LOAD_START → native READY
- READY → first frame
- Committed → first frame *(total startup)*
- Committed → audio enabled

---

## Automated validation

```bash
cd playback-lab
npm run typecheck
npm run test:unit
```

Unit tests include a **synthetic session** that validates stage math and report generation. Synthetic data proves the pipeline; **device data is required** for production conclusions.

---

## Deliverables

| Artifact | Path |
|----------|------|
| Investigation protocol | `docs/PHASE1A_STARTUP_LATENCY_PROTOCOL.md` (this file) |
| Investigation report | `docs/PHASE1A_STARTUP_LATENCY_REPORT.md` |
| Report generator | `npm run report:latency` |
| On-device overlay | `Phase1AStartupOverlay` |

---

## Constraints (repeated)

- ❌ No preload / corridor / PlayerPool
- ❌ No buffering optimizations
- ❌ No ownership logic changes
- ❌ No playback timing changes
- ✅ Instrumentation only

Implementation changes require report review and explicit approval.
