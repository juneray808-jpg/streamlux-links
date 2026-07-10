# ADR-001: Singleton PlaybackEngine

## Status

Accepted

## Context

StreamLux production feed suffered from competing playback controllers (UI effects, global ref registry, playback machine behind feature flags). Multiple components could influence play/pause, causing audio leaks and ownership races.

## Decision

One `PlaybackEngine` singleton is the **only** authority that validates and commits ownership. FlashList and ViewabilityBridge propose candidates; the engine decides.

## Consequences

- All playback commands flow Engine → PlayerPool → NativePlayerAdapter.
- Easier to test state transitions in isolation.
- Single subscription surface for instrumentation.

## Alternatives considered

- Per-cell playback hooks (rejected: duplicates authority).
- Redux/Zustand as playback owner (rejected: React lifecycle coupling).
