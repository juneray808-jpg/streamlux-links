# ADR-002: No UI Playback Logic

## Status

Accepted

## Context

`NewVideoItem.tsx` mixed rendering with play/pause effects, stall recovery, and poster policy — causing non-deterministic behavior under fast scroll.

## Decision

`FeedCell` renders derived UI state only. No `play()`/`pause()` in `useEffect`. User tap emits an engine event.

## Consequences

- Cells are memoizable and simple.
- Playback bugs localize to engine + adapter.
- Invariant I4 is enforceable by lint/review.

## Alternatives considered

- Smart cells with `isActive` prop driving `useEffect` play (rejected: race with ownership transfer).
