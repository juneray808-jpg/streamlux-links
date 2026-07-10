import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return {
    ...config,
    name: 'StreamLux Playback Lab',
    slug: 'streamlux-playback-lab',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    scheme: 'streamlux-playback-lab',
    ios: {
      ...config.ios,
      bundleIdentifier: 'io.streamlux.playbacklab',
      supportsTablet: false,
    },
    android: {
      ...config.android,
      package: 'io.streamlux.playbacklab',
    },
    plugins: [
      'expo-dev-client',
      [
        'expo-build-properties',
        {
          android: { minSdkVersion: 24 },
          ios: { deploymentTarget: '15.1' },
        },
      ],
      'react-native-video',
    ],
    extra: {
      supabaseUrl,
      supabaseAnonKey,
    },
  };
};
