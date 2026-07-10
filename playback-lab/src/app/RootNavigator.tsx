import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FeedScreen } from '../feed/FeedScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';

export type RootStackParamList = {
  Feed: undefined;
  Placeholder: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        <Stack.Screen
          name="Feed"
          component={FeedScreen}
          options={{ title: 'Playback Lab' }}
        />
        <Stack.Screen
          name="Placeholder"
          component={PlaceholderScreen}
          options={{ title: 'Lifecycle test' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
