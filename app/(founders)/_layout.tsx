import React from 'react';
import { Stack } from 'expo-router';

export default function FoundersLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="note" />
    </Stack>
  );
}
