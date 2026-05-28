import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FoundersPeony } from '../../src/components/FoundersPeony';

const LINES = Array.from({ length: 55 }, (_, i): number => i);

function RuledBackground(): React.JSX.Element {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.marginLine} />
      {LINES.map((i) => (
        <View key={i} style={[styles.ruledLine, { top: i * 32 }]} />
      ))}
    </View>
  );
}

export default function FoundersNote(): React.JSX.Element {
  const router = useRouter();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleContinue = async (): Promise<void> => {
    await SecureStore.setItemAsync('founders_note_seen', 'true');
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={styles.container}>
      <RuledBackground />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.inner, animatedStyle]}>
          <View style={styles.textArea}>
            <Text style={styles.date}>May 2025</Text>

            <View style={styles.gap32} />

            <Text style={styles.greeting}>To whoever is reading this,</Text>

            <View style={styles.gap24} />

            <Text style={styles.body}>{'I made this for someone who lives far away.'}</Text>

            <View style={styles.gap24} />

            <Text style={styles.body}>
              {
                'Honestly, I just wanted a way to stay close to her that didn’t feel like an obligation. Not texts you have to respond to. Not check-ins that feel like homework. Something quieter.'
              }
            </Text>

            <View style={styles.gap24} />

            <Text style={styles.body}>
              {
                'SyncUp is what I came up with. I hope it works for you the way I hope it works for me.'
              }
            </Text>

            <View style={styles.gap24} />

            <Text style={styles.signature}>{'— Hashir'}</Text>

            <View style={styles.spacer} />
          </View>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => void handleContinue()}
              activeOpacity={0.7}
            >
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
            <View style={styles.gap16} />
            <FoundersPeony />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  safeArea: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  textArea: {
    flex: 1,
    paddingTop: 32,
    paddingLeft: 56,
    paddingRight: 32,
  },
  date: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 16,
    color: '#A89070',
    textAlign: 'right',
    marginRight: -24,
  },
  greeting: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 22,
    color: '#2C2C2A',
  },
  body: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 20,
    color: '#3C3830',
    lineHeight: 30,
  },
  signature: {
    fontFamily: 'Caveat_700Bold',
    fontSize: 24,
    color: '#2C2C2A',
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 0,
  },
  continueButton: {
    borderWidth: 1.5,
    borderColor: '#C4A882',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 48,
    backgroundColor: 'transparent',
  },
  continueText: {
    fontFamily: 'Caveat_700Bold',
    fontSize: 20,
    color: '#8B6F47',
  },
  marginLine: {
    position: 'absolute',
    left: 48,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#E8C4A0',
    opacity: 0.3,
  },
  ruledLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E8DDD0',
    opacity: 0.4,
  },
  gap16: {
    height: 16,
  },
  gap24: {
    height: 24,
  },
  gap32: {
    height: 32,
  },
});
