import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { FeedScreen } from '../feed/FeedScreen';

enableScreens();

export type RootStackParamList = {
  Feed: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Phase 1: feed only. Placeholder screen returns in Phase 4. */
export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Feed" component={FeedScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
