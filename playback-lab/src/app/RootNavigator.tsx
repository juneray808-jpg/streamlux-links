import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FeedScreen } from '../feed/FeedScreen';

export type RootStackParamList = {
  Feed: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Phase 1: feed only. Placeholder screen returns in Phase 4. */
export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Feed" component={FeedScreen} />
    </Stack.Navigator>
  );
}
