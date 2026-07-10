# Phase 1 Validation — Deterministic Ownership

**Phase:** 1  
**Objective:** Prove deterministic playback ownership (not a full playback engine).  
**Status:** Pending device verification

Phase 1 is **not complete** until every exit criterion below is demonstrated via instrumentation and manual testing.

---

## Scope boundaries (must NOT be tested in Phase 1)

- Preloading / corridor / decoder warm
- Lifecycle (background, foreground, nav recovery)
- Rotation
- Advanced error recovery
- Performance optimization / FPS benchmarks

---

## Automated checks

```bash
cd playback-lab
npm run typecheck
npm run test:unit
```

| Check | Command | Required |
|-------|---------|----------|
| TypeScript strict | `npm run typecheck` | pass |
| Ownership unit tests | `npm run test:unit` | pass |
| Audio overlap count | dev overlay / exported log | **0** |
| Ownership violations | dev overlay / exported log | **0** |

---

## Manual protocol (iOS + Android)

Perform on a **Dev Client** build with `.env` configured.

### A. Cold start ownership

1. Launch app → feed loads.
2. First visible row becomes owner (overlay shows `owner · loading/playing`).
3. **Pass:** exactly one row shows `owner` phase; audio from one video only.

### B. Slow vertical scroll (5–10 swipes)

1. Scroll slowly one row at a time; wait for snap settle between swipes.
2. **Pass:** ownership transfers each snap; overlay `ownership_gained` / `ownership_released` events appear.
3. **Pass:** no overlapping audio; previous row silent after transfer.
4. **Pass:** `audio_overlap: 0` on overlay.

### C. Tap pause / play

1. Tap owner cell → `user_pause` event; video pauses; audio stops.
2. Tap again → `user_resume`; playback resumes.
3. **Pass:** only owner responds to tap.

### D. Poster / spinner (owner only)

1. On ownership gain, poster visible until `first_frame` / `poster_hidden` in event log.
2. Spinner only before first frame while loading/buffering.
3. **Pass:** no timer-based peel (events drive UI).

### E. Instrumentation completeness

1. Every ownership transfer logs `ownership_gained` + `ownership_released`.
2. `ownership_transfer_ms` meta present on commit.
3. **Pass:** overlay shows last 5 events updating live.

---

## Exit criteria sign-off

| # | Criterion | iOS | Android |
|---|-----------|-----|---------|
| 1 | Exactly one logical owner | ☐ | ☐ |
| 2 | Exactly one audible player | ☐ | ☐ |
| 3 | Deterministic ownership on slow scroll | ☐ | ☐ |
| 4 | Tap pause / play | ☐ | ☐ |
| 5 | Ownership instrumentation complete | ☐ | ☐ |
| 6 | `audio_overlap` = 0 | ☐ | ☐ |
| 7 | Unit tests pass | ☐ | ☐ |

**Phase 1 complete when all rows checked on both platforms.**

---

## Known Phase 1 limitations (expected)

- Video decoder mounts/unmounts on owner change (no preload — Phase 2).
- No background/foreground handling (Phase 4).
- No navigation recovery (Phase 4).

These are not defects for Phase 1.
