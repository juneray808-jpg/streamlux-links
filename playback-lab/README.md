# StreamLux Playback Lab

Engineering laboratory for deterministic vertical HLS playback (React Native).  
**Not a social app.** See `docs/ARCHITECTURE.md` (ADD v1.1, frozen).

## Phase 0 (current)

- Expo Dev Client scaffold (iOS + Android)
- Read-only Supabase explore feed (`streamlux_feed_explore_ranked`)
- Vertical FlashList with poster rows — **no video playback yet**

## Setup

```bash
cd playback-lab
cp .env.example .env
# Edit .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo start --dev-client
```

### EAS Dev Client build

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
