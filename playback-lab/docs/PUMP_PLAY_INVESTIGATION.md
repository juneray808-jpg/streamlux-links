# Pump Play / Force Play — Investigation Report

**Status:** Root causes identified in code (evidence below)  
**Phase:** 1A investigation — implementation fixes are minimal bug repairs only  
**Symptom:** Some videos appear to play with “pressure,” visually pushing or pumping the feed cell containers — like forced playback.

---

## Summary

Three mechanisms in the current Phase 1 build can produce pump/force-play behavior. They are **not** random HLS or Cloudflare failures — they are reproducible from how the engine and cell interact today.

| Rank | Cause | Evidence | Affects “some videos” because |
|------|-------|----------|-------------------------------|
| 1 | **Progress-driven re-render storm** | `handleNativeEvent` calls `bump()` on every `onProgress` (~4 Hz default) | Longer startup/buffering = more ticks before first frame; bursty buffer events add spikes |
| 2 | **Double source assignment on owner mount** | `FeedCell` passes `source` prop **and** `registerAdapter` calls `setSource` | Heavier HLS manifests show a larger reload “pump” when imperative `setSource` fires |
| 3 | **Android TextureView layout participation** | `useTextureView` on `Video` | Streams with different aspect ratios / rotation metadata resize the texture in-layout |

---

## 1. Progress-driven re-render storm (primary)

### Mechanism

`react-native-video` fires `onProgress` every **250 ms** by default on Android (`progressUpdateInterval` default in ExoPlayer view).

`PlaybackEngine.handleNativeEvent` **always** calls `bump()` at the end — even when `progress` does not change engine state:

```354:354:playback-lab/src/playback/PlaybackEngine.ts
    this.bump();
```

After first frame, the `progress` branch often executes:

```312:314:playback-lab/src/playback/PlaybackEngine.ts
        } else if (!this.owner.userPaused && !this.owner.buffering) {
          this.owner.phase = 'playing';
        }
```

`phase` is already `'playing'`, but `bump()` still runs → invalidates `useSyncExternalStore` snapshot → **every visible `FeedCell` re-renders** ~4 times per second while video plays.

### Why it looks like “pump / force play”

- Owner `Video` receives React reconciliation on every tick (`paused`, `muted`, parent layout).
- On Android `useTextureView`, the native surface can flicker or rescale during parent re-layout.
- Overlay text (`owner · playing`) and poster/spinner transitions amplify perceived jitter.

### Why only some videos

- Videos slow to reach `first_frame` accumulate **more progress ticks during loading** (spinner + poster + Video underneath).
- Videos that **rebuffer** add `native_buffer_*` events — each also ends in `bump()`.

### Fix (implementation-only)

Call `bump()` only when engine/UI state **actually changes** (dirty flag). Progress ticks while already `playing` + `firstFrameRendered` should not bump.

---

## 2. Double source assignment (force reload)

### Mechanism

When a cell becomes owner:

1. `FeedCell` mounts `<Video source={videoSource} … />` → native player starts loading HLS.
2. `useEffect` → `registerAdapter` → `assignSource(hlsUrl)` → imperative `setSource` on the same URI.

```72:75:playback-lab/src/feed/FeedCell.tsx
        <Video
          ref={videoRef}
          source={videoSource}
```

```40:49:playback-lab/src/playback/NativePlayerAdapter.ts
  assignSource(url: string): void {
    ...
    this.videoRef.current?.setSource?.(source as never);
```

Deduping by `assignedUrl` only prevents **repeated** calls — the **first** imperative `setSource` still runs after the prop already started load → **forced second load**.

### Why it looks like pump play

Abrupt decoder teardown/restart reads as a visual “push” or jerk at play start — worse on high-latency or high-bitrate HLS items.

### Why only some videos

Manifest size, keyframe distance, and CDN cold start vary per asset. Double-load penalty is uneven.

### Fix (implementation-only)

Single source path: engine assigns via adapter only (no `source` prop on `Video`), **or** skip imperative `setSource` when prop already matches.

---

## 3. Android TextureView + resize mode

### Mechanism

```76:83:playback-lab/src/feed/FeedCell.tsx
          resizeMode="contain"
          ...
          useTextureView
```

- `contain` letterboxes to fit — when intrinsic video size arrives, scale can **change** relative to poster (`contain` on both, but poster is a fixed Cloudflare thumbnail at `height=720` — aspect may not match stream).
- `useTextureView` places video in the layout tree; native dimension updates can interact with parent `Pressable` / FlashList row.

### Why only some videos

`FeedItem.width/height` vary; landscape, square, and odd crops diverge from the 720px-tall poster thumbnail.

### Recommendations (not implemented without review)

| Change | Benefit | Risk |
|--------|---------|------|
| `resizeMode="cover"` | TikTok-style full-bleed, less letterbox jump | Crops edges |
| `useTextureView={false}` on Android | SurfaceView ignores layout — cannot push siblings | Z-order / overlay quirks |
| Use `item.width/height` to pre-size media box | Stable layout before first frame | Requires layout math |

---

## 4. Ruled out (no code evidence)

| Hypothesis | Verdict |
|------------|---------|
| FlashList `snapToInterval` changing row height | Row height is fixed from `onLayout` once |
| Ownership logic re-committing same post | Guarded in `proposeOwnership` |
| `applyOwnerPlaybackIntent` loop | Called on register, not on every progress tick |
| Phase 1A instrumentation changing timing | Emits only — no playback delay added |

---

## Verification protocol

Fixes applied in `cursor/investigate-pump-play-7da3`:

1. **Dirty-only `bump()`** — progress while playing no longer re-renders the feed (~4 Hz eliminated).
2. **Single source path** — `Video` no longer receives `source` prop; adapter `assignSource` only (no double load).
3. **Android SurfaceView** — `useTextureView={false}` on Android to prevent layout participation.
4. **Slower progress interval** — `progressUpdateInterval={1000}` during steady play (first-frame detection still works).

After installing the build:

1. Enable Phase 1A overlay on device.
2. Play 10 videos that previously “pumped” + 10 that did not.
3. Confirm:
   - No visible container shift during steady playback.
   - `react-native-video` progress no longer causes overlay event spam (engine bumps only on state transitions).
   - Startup still logs full Phase 1A timeline.

---

## Optimization opportunities (post-investigation, not implemented)

| Item | Expected benefit | Architecture impact |
|------|------------------|---------------------|
| Dirty-only `bump()` | High — stops 4 Hz UI storm | None |
| Single source assignment | Medium–high — removes forced reload | None |
| `cover` + SurfaceView on Android | Medium — stabilizes layout | UI policy only |
| Memoized `FeedCell` with row-level `React.memo` | Low–medium — fewer child reconciles | None |

**Phase 2 items (preload, corridor, decoder warm) are not indicated by this evidence** and remain out of scope.
