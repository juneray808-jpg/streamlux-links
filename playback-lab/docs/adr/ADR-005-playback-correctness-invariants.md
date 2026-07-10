# ADR-005: Playback Correctness Invariants

## Status

Accepted

## Context

Playback Lab must not repeat StreamLux production playback bug classes. Subjective "feels smooth" is insufficient for a reference engine.

## Decision

Adopt invariants I1–I10 (see `ARCHITECTURE.md` §3) as non-negotiable engineering rules. `AUDIO_OVERLAP`, `BLACK_SCREEN`, and `OWNERSHIP_VIOLATION` are correctness failures with target zero per session.

## Consequences

- Phase gates require invariant checks.
- Benchmark sessions export violation counts.
- CI may fail on any violation.

## Alternatives considered

- Best-effort guidelines without enforcement (rejected).
