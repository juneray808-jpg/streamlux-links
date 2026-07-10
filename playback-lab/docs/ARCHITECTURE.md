# StreamLux Playback Lab — Architecture Design Document (ADD v1.1)

**Status:** Approved and frozen  
**Scope:** Authoritative architecture contract for Playback Lab  
**Repo:** `juneray808-jpg/streamlux-links` → `playback-lab/`  
**Spec reference:** `docs/SPEC.md` (Engineering Specification v1.0)

---

## Engineering Philosophy

> *"This repository is an engineering laboratory, not an application. Its purpose is to prove a deterministic, measurable, production-grade playback architecture. Simplicity is preferred whenever it satisfies the same correctness, reliability, and performance requirements."*

---

## 1. Executive summary

Playback Lab is a **single-purpose React Native application** whose only job is to prove a **deterministic vertical HLS playback engine**. The engine is **not inside React**. React renders state; a singleton **PlaybackEngine** owns all playback decisions.

FlashList and ViewabilityBridge **propose** ownership candidates. **PlaybackEngine validates and commits** ownership. PlayerPool executes. NativePlayerAdapter translates. FeedCell displays.

**Core invariant:** Exactly one logical owner. Exactly one audible player. Ownership transfer is synchronous on commit.

---

## 2. Authoritative architecture diagram

```
FlashList → ViewabilityBridge → PlaybackEngine (validation) → PlayerPool → NativePlayerAdapter → FeedCell UI
```

Playback decisions must **never** be directly coupled to React rendering, FlashList timing, or component lifecycle.

| Direction | Allowed | Forbidden |
|-----------|---------|-----------|
| FlashList → ViewabilityBridge | Visibility tokens, scroll settle | Ownership commit |
| ViewabilityBridge → PlaybackEngine | `OWNERSHIP_CANDIDATE` | `play()` / `pause()` |
| PlaybackEngine → PlayerPool | Mount, roles, commands | React setState in cells |
| NativePlayerAdapter → PlaybackEngine | Native events | Ownership decisions |
| FeedCell → PlaybackEngine | Tap pause, adapter registration | Playback in `useEffect` |

---

## 3. Playback Correctness Invariants

| # | Invariant |
|---|-----------|
| I1 | Exactly one logical owner exists |
| I2 | Exactly one audible player exists |
| I3 | Playback ownership is deterministic |
| I4 | FeedCell components never make playback decisions |
| I5 | Posters removed only after first rendered frame |
| I6 | Spinner visibility derived entirely from playback state |
| I7 | Decoder lifecycle independent of React rendering |
| I8 | Every ownership transition is instrumented |
| I9 | No background timer influences playback behavior |
| I10 | Every recovery attempt has a defined retry budget |

**Correctness failures (target: zero):** `AUDIO_OVERLAP`, `BLACK_SCREEN`, `OWNERSHIP_VIOLATION`.

---

## 4. Layered architecture

| Layer | Responsibility |
|-------|----------------|
| FeedRepository | Supabase read-only fetch, eligibility filter |
| FeedScreen / FlashList | Layout, scroll physics — no ownership |
| ViewabilityBridge | Propose ownership candidates only |
| PlaybackEngine | Validate, commit, phases, policy |
| PlayerPool | Configurable resource limits, mount policy |
| NativePlayerAdapter | Engine semantics → react-native-video |
| FeedCell | Render derived UI state only |
| LifecycleCoordinator | App/nav/orientation → engine events |
| InstrumentationBus | Metrics, regression detection |

---

## 5. PlaybackEngine (final authority)

- Only component that may **commit** ownership
- Synchronous on commit: mute/pause previous owner before React re-render
- Poster: `!firstFrameRendered && phase !== ERROR` — no timers
- Spinner: owner + `!firstFrameRendered` + phase ∈ {LOADING, BUFFERING}
- Forbidden: global ref registry, stall `setInterval`, micro play-ahead

---

## 6. ViewabilityBridge

Proposes `OWNERSHIP_CANDIDATE { postId, index, visibilityPercent }`.  
Configurable `proposalThreshold` (0.50), `commitThreshold` (0.80, validated by engine).

---

## 7. NativePlayerAdapter

Sole translation layer between engine and `react-native-video`.  
Engine never imports platform player APIs.

---

## 8. Decoder lifecycle

```
CREATE → ASSIGN_SOURCE → WARM → SILENT_PRELOAD → OWNER_ACTIVATION → SILENT_PRELOAD → DESTROY
```

**Reuse** on corridor role change and ownership transfer. **Recreate** only on: new URL, error budget remount, corridor eviction, cold start.

---

## 9. PlayerPool resource limits (`PoolResourcePolicy`)

All configurable — not hardcoded:

- `maxMountedPlayers` (default 4)
- `maxWarmedDecoders` (default 3)
- `maxSimultaneousDecoderInit` (default 2)
- `maxCorridorSize` (default 4)
- `forwardSlots` / `backwardSlots` (default 2 / 1)
- `networkWarmAhead`, `memoryBudgetMb`, `corridorGraceFrames`

---

## 10. FeedRepository

Read-only. RPC `streamlux_feed_explore_ranked` + hydrate + eligibility filter.  
Port from StreamLux: fetch contract and HLS URL helpers only.

---

## 11. Instrumentation and performance objectives

See `docs/PERFORMANCE_TARGETS.md` (post-baseline). Methodology:

1. Baseline on representative Android + iOS devices
2. Export session JSON from InstrumentationBus
3. p50/p95/p99 per metric; correctness metrics must be zero
4. Regression: p95 > 15% without ADR → fail

**Metrics:** Ownership→First Frame, Source→Ready, Ready→First Frame, Poster Duration, Buffer duration, Ownership Transfer, Scroll FPS, Mounted/Decoder counts, Memory, Recovery/Errors, Audio Overlap, Black Screen, Ownership Violations.

---

## 12. Benchmark Mode (Dev Overlay)

Current owner, phase, corridor, mounted players, decoder count, memory estimate, first-frame latency, ownership latency, FPS, last buffering event, last 5 instrument events. Export session JSON.

---

## 13. LifecycleCoordinator

Background → pause/mute all. Foreground &lt; 30s → resume owner. Foreground &gt; 30s → cold resume (single path). Nav blur/focus → deterministic re-propose.

---

## 14. Failure recovery

Budgeted retries only. No stall watchdog timers. `blackScreenDetectionMs` emits event only — does not auto-remount.

---

## 15. Architecture Decision Records

See `docs/adr/`. ADR-001 through ADR-005 document singleton engine, no UI playback logic, corridor preload, no timer recovery, and invariants.

---

## 16. Phased implementation

| Phase | Deliverable |
|-------|-------------|
| 0 | Scaffold, FeedRepository, list without playback |
| 1 | PlaybackEngine + single owner |
| 2 | PlayerPool + corridor preload |
| 3 | Instrumentation + Benchmark overlay + baselines |
| 4 | Lifecycle + rotation + navigation |
| 5 | Failure recovery + offline |
| 6 | Benchmark harness + test matrix |

No phase N+1 until exit criteria pass on iOS and Android.

---

## 17. Explicit rejections (StreamLux)

Do not port: `NewVideoItem`, `feedCellPlaybackMachine`, `feedPostVideoRefRegistry`, micro play-ahead, stall watchdogs, dual scroll handlers, timer poster peel.

---

## 18. Architectural Integrity

This section establishes the approved ADD as the **authoritative contract** for Playback Lab.

### 18.1 Single source of truth

- The approved ADD (`docs/ARCHITECTURE.md`) is the **single source of truth** for Playback Lab architecture.
- Implementation must **conform** to the ADD, ADRs, and Playback Correctness Invariants (§3).
- Code reviews and phase gates are evaluated against this document.

### 18.2 Conformance requirement

- Every subsystem, module boundary, and data flow must match the ADD unless an approved revision exists.
- Convenience shortcuts that bypass ViewabilityBridge → Engine validation, UI-side playback control, or timer-driven behavior are **prohibited**.

### 18.3 Architecture change protocol

If implementation reveals the architecture must change:

1. **Pause implementation** on the affected phase.
2. **Update the ADD** with a new version number and changelog.
3. **Document rationale** in a new or revised ADR.
4. **Obtain explicit re-approval** of the revised ADD before resuming implementation.

Tuning `PoolResourcePolicy` defaults or performance thresholds post-baseline may update `benchmarks/policy.json` and `docs/PERFORMANCE_TARGETS.md` without ADD revision.

### 18.4 No temporary workarounds

- Temporary workarounds that bypass the architecture are **prohibited**.
- Feature flags that split playback behavior into incompatible code paths are **prohibited** unless introduced via ADR with a defined removal milestone.
- "Fix it in the UI" patches are **prohibited**.

### 18.5 Engineering discipline as a requirement

- Engineering discipline is a **functional requirement** of Playback Lab, not a process preference.
- Violations of invariants I1–I10 are **defects**, not technical debt to defer.
- Instrumentation and benchmark evidence are required to claim phase completion.

### 18.6 Freeze declaration

**ADD v1.1 is frozen** as of approval. Implementation proceeds by phased gates (§16). Any architectural change requires §18.3 before further code proceeds.

---

*End of Architecture Design Document v1.1*
