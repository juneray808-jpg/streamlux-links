# Performance Targets

**Status:** Pending baseline (Phase 3)

Targets are established **after** baseline measurements on representative Android and iOS devices documented in `BENCHMARK_DEVICES.md`.

## Methodology

1. Run scripted protocol: 20 cold starts, 100 swipes, 5 background cycles.
2. Export `InstrumentationBus` session JSON.
3. Record p50/p95/p99 in `benchmarks/baseline-<date>-<platform>.json`.
4. Regression policy: see `benchmarks/policy.json`.

## Correctness (non-negotiable)

| Metric | Target |
|--------|--------|
| Audio overlap events | 0 |
| Black screen events | 0 |
| Ownership violations | 0 |

## Latency (to be filled post-baseline)

| Metric | p50 | p95 |
|--------|-----|-----|
| Ownership → First Frame | TBD | TBD |
| Source Assign → Native Ready | TBD | TBD |
| Native Ready → First Frame | TBD | TBD |
| Ownership Transfer Time | TBD | TBD |
