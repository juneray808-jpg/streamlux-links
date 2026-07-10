# ADR-004: No Timer-Driven Recovery

## Status

Accepted

## Context

StreamLux used `setInterval` stall watchdogs and timer-based poster peel — causing replay loops and stuck posters.

## Decision

No `setTimeout`/`setInterval` for poster, ownership, or stall recovery. Recovery only via explicit errors + retry budget or user tap. Black-screen detection emits events only.

## Consequences

- Deterministic behavior auditable via event log.
- Invariant I9 satisfied.

## Alternatives considered

- Stall watchdog with remount (rejected: decoder churn, spinner loops).
