import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../app/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Placeholder'>;

/** Reserved for Phase 4 navigation lifecycle tests. */
export function PlaceholderScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Lifecycle test screen (Phase 4)</Text>
      <Text style={styles.link} onPress={() => navigation.goBack()}>
        Back to feed
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: { color: '#fff', fontSize: 16 },
  link: { color: '#6af', marginTop: 16, fontSize: 16 },
});
