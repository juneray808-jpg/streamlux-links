# StreamLux Playback Lab

Engineering laboratory for deterministic vertical HLS playback (React Native).  
**Not a social app.** See `docs/ARCHITECTURE.md` (ADD v1.1, frozen).

## Phase 1 (current)

- Singleton `PlaybackEngine` — ownership validation and commit only
- `ViewabilityBridge` — proposes candidates (FlashList never commits)
- `NativePlayerAdapter` — imperative react-native-video control
- `FeedCell` — owner-only Video mount (single decoder)
- Tap pause/play, ownership instrumentation, Phase 1 dev overlay
- **No preload, corridor, lifecycle, or error recovery** (later phases)

Validation: `docs/PHASE1_VALIDATION.md`

## Setup

```bash
cd playback-lab
cp .env.example .env
# Edit .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo start --dev-client
```

### GitHub Actions (APK download)

See **`docs/GITHUB_ACTIONS.md`**.

1. Add repo secrets: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. **Actions** → **Playback Lab — Build Android APK** → **Run workflow**
3. Download artifact **Playback-Lab-APK** (standalone install, no Metro)

### EAS Dev Client build (live Metro)

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android
eas build --profile development --platform ios
```

Set `EXPO_PUBLIC_SUPABASE_*` in EAS secrets or `eas.json` env for builds.

## Docs

| Path | Purpose |
|------|---------|
| `docs/ARCHITECTURE.md` | Frozen ADD v1.1 + Architectural Integrity |
| `docs/SPEC.md` | Product specification |
| `docs/adr/` | Architecture Decision Records |
| `benchmarks/policy.json` | Regression policy |

## Stack

- Expo 57 (Dev Client / EAS)
- React Navigation, FlashList, React Query
- `react-native-video` only (no expo-av / expo-video) — wired in Phase 1+

## Parent repo

The `streamlux.io` marketing site and deep links remain at the repository root. Playback Lab lives in `playback-lab/` only.
