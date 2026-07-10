# StreamLux Playback Lab — Engineering Specification v1.0

This document is the product specification. **Architecture is defined in `ARCHITECTURE.md` (ADD v1.1, frozen).**

## Mission

Build the smoothest, most reliable, production-grade vertical HLS video playback engine possible for React Native. This is a playback laboratory — not a social application.

## Stack

- React Native (Expo Dev Client / EAS toolchain)
- TypeScript strict
- FlashList, react-native-video (only playback engine — no expo-av / expo-video)
- Cloudflare Stream HLS, Supabase read-only
- React Navigation, React Query

## Out of scope

Likes, comments, messaging, livestream, upload, auth UI, realtime, payments, social features.

## Success criteria

Instant ownership transfer, no black screens, no audio leaks, smooth scrolling, stable memory, deterministic playback, clean instrumentation — on iOS and Android.

See `ARCHITECTURE.md` for invariants, phases, and integrity policy.
