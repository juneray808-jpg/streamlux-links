# ADR-003: Corridor Preload Strategy

## Status

Accepted

## Context

Unbounded preloading caused memory pressure; no preloading caused black frames on scroll. StreamLux micro play-ahead caused push-play hesitation.

## Decision

Bounded corridor: configurable forward/back decoder slots. Silent preload: assign source, warm to READY, pause + mute. Promote to owner without decoder recreation.

## Consequences

- Predictable memory via `PoolResourcePolicy`.
- Fast flick handled with corridor grace (single rAF), not timers.

## Alternatives considered

- Micro play-ahead with timeout (rejected: ADR-004 alignment).
- Unlimited FlashList window (rejected: decoder churn).
