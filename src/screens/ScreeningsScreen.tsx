import { StyleSheet, Text, View } from 'react-native';
import type { ScreeningsScreenProps } from '../types/navigation';

export default function ScreeningsScreen({ route }: ScreeningsScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Séances pour {route.params.movieTitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131313',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#e5e2e1',
    fontSize: 18,
  },
});
