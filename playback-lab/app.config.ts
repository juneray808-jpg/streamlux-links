import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  const expo = { ...config } as ExpoConfig;

  const standalone = process.env.PLAYBACK_LAB_STANDALONE_BUILD === '1';

  let plugins = [
    'expo-dev-client',
    [
      'expo-build-properties',
      {
        android: { minSdkVersion: 24 },
        ios: { deploymentTarget: '16.4' },
      },
    ],
    'react-native-video',
  ] as ExpoConfig['plugins'];

  // CI release APK: bundle JS in the APK (no Metro). Local dev keeps expo-dev-client.
  if (standalone) {
    plugins = (plugins ?? []).filter((p) => {
      const name = typeof p === 'string' ? p : p?.[0];
      return name !== 'expo-dev-client';
    });
  }

  return {
    ...expo,
    name: 'StreamLux Playback Lab',
    slug: 'streamlux-playback-lab',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    scheme: 'streamlux-playback-lab',
    ios: {
      ...expo.ios,
      bundleIdentifier: 'io.streamlux.playbacklab',
      supportsTablet: false,
    },
    android: {
      ...expo.android,
      package: 'io.streamlux.playbacklab',
    },
    plugins,
    extra: {
      ...(expo.extra ?? {}),
      supabaseUrl,
      supabaseAnonKey,
    },
  };
};
