# Playback Lab — GitHub Actions

Workflows live in the repo root: `.github/workflows/playback-lab-*.yml`

View runs: **GitHub → Actions** tab on `streamlux-links`.

---

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **Playback Lab CI** | Push/PR to `main` (playback-lab paths), manual | `npm run typecheck` + `npm run test:unit` |
| **Playback Lab — Build Android APK** | Push/PR to `main`, manual | Standalone release APK (install & test, no Metro) |
| **Playback Lab — EAS Build** | Manual only | Optional cloud build via Expo (needs `EXPO_TOKEN`) |

---

## Repo secrets (required for working feed in APK)

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://uiazspwzwfcetnnsxybd.supabase.co` (or your project URL) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (Dashboard → API) |

Optional for EAS workflow only:

| Secret | Value |
|--------|--------|
| `EXPO_TOKEN` | Expo access token from https://expo.dev/accounts/[user]/settings/access-tokens |

---

## Download APK from GitHub Actions

1. Open **Actions** → **Playback Lab — Build Android APK**
2. Run **Run workflow** (manual) or wait for a `main` push
3. Open the completed run → **Artifacts** → **Playback-Lab-APK**
4. Unzip / install `Playback-Lab.apk` on your Android device

This builds a **standalone** APK (JS bundled). No `expo start` required.

---

## Local Dev Client (live reload)

For development with Metro hot reload, build locally:

```bash
cd playback-lab
npx expo run:android
# or: eas build --profile development --platform android
```

Then `npx expo start --dev-client`.

---

## Phase 1 testing

After installing the GitHub Actions APK, follow `docs/PHASE1_VALIDATION.md`.
