import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppQueryProvider } from './AppQueryProvider';
import { RootNavigator } from './RootNavigator';

export function AppRoot() {
  return (
    <SafeAreaProvider>
      <AppQueryProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AppQueryProvider>
    </SafeAreaProvider>
  );
}
