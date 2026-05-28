import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import FoundersNote from '../../app/(founders)/note';

type ViewLike = React.ComponentType<{
  children?: React.ReactNode;
  style?: unknown;
}>;

// Manual mock — react-native-reanimated/mock triggers native worklets init.
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native') as { View: ViewLike };
  const noop = () => 0;
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (toValue: number) => toValue,
    Easing: { out: () => noop, quad: noop },
    createAnimatedComponent: (C: React.ComponentType) => C,
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('../../src/components/FoundersPeony', () => ({
  FoundersPeony: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native') as { View: ViewLike };
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Founders Note screen', () => {
  it('shows note on first launch', () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    render(<FoundersNote />);
    expect(screen.getByText('To whoever is reading this,')).toBeTruthy();
  });

  it('marks as seen on Continue', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    render(<FoundersNote />);
    fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => {
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('founders_note_seen', 'true');
    });
  });
});
