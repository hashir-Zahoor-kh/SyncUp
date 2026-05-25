import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ActivityScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>Reactions and updates — coming in Phase 6.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF7F2' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  title: {
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C2C2A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
  },
});
