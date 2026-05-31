import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// Import after mocks
import ProfileScreen from '../../app/(app)/profile';

// Mock navigation
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
}));

// Mock Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Heavy: 'Heavy' },
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'Success' },
}));

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
}));

// Mock Linking
// Mock Supabase
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { signOut: jest.fn(), getSession: jest.fn() },
  },
}));

const mockProfile = {
  id: 'user-1',
  display_name: 'Alex',
  avatar_emoji: '🌟',
  avatar_color: null,
  avatar_url: null,
  is_pro: false,
  onboarded_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockPartnerProfile = {
  id: 'user-2',
  display_name: 'Jamie',
  avatar_emoji: '😎',
  avatar_color: null,
  avatar_url: null,
  is_pro: false,
  onboarded_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockConnection = {
  id: 'conn-1',
  user_a_id: 'user-1',
  user_b_id: 'user-2',
  relationship_type: 'Friends' as const,
  created_at: '2026-01-01T00:00:00Z',
};

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'alex@example.com' },
    signOut: jest.fn(),
    session: {},
    loading: false,
  }),
}));

jest.mock('../../src/contexts/ProfileContext', () => ({
  useProfile: () => ({
    profile: mockProfile,
    profileLoading: false,
    isOnboarded: true,
    refreshProfile: jest.fn(),
    updateProfile: jest.fn(),
  }),
}));

jest.mock('../../src/contexts/GoalContext', () => ({
  useGoals: () => ({
    connection: mockConnection,
    partnerProfile: mockPartnerProfile,
    goals: [],
    partnerGoals: [],
    loading: false,
    weekStart: '2026-05-26',
    addGoal: jest.fn(),
    completeGoal: jest.fn(),
    deleteGoal: jest.fn(),
    refresh: jest.fn(),
    realtimeStatus: 'connected',
  }),
}));

// Mock Avatar component
jest.mock('../../src/components/Avatar', () => ({
  Avatar: ({ profile }: { profile: { display_name: string } }) =>
    require('react').createElement(
      require('react-native').Text,
      { testID: `avatar-${profile.display_name}` },
      profile.display_name,
    ),
}));

describe('Profile / Settings Screen', () => {
  let alertSpy: jest.SpyInstance;
  let linkingSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    const { Alert, Linking } = require('react-native') as typeof import('react-native');
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    linkingSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
    linkingSpy.mockRestore();
  });

  it('Test 1 — renders all sections', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('profile-screen')).toBeTruthy();
    expect(screen.getAllByText('Alex').length).toBeGreaterThan(0);
    expect(screen.getByText('alex@example.com')).toBeTruthy();
    expect(screen.getAllByText('Jamie').length).toBeGreaterThan(0);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText(/support@trysyncup\.org/)).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
    expect(screen.getByText('Delete account')).toBeTruthy();
  });

  it('Test 2 — app version matches package.json', () => {
    render(<ProfileScreen />);
    // app.json version is 1.0.0
    expect(screen.getByText('1.0.0')).toBeTruthy();
  });

  it('Test 3 — sign out triggers alert', async () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('Sign out'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Sign out?', '', expect.any(Array));
    });
  });

  it('Test 4 — delete account button navigates to delete-account screen', async () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/(app)/delete-account');
    });
  });

  it('Test 5 — legal links open external URLs', async () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Privacy Policy'));
    await waitFor(() => {
      expect(linkingSpy).toHaveBeenCalledWith('https://trysyncup.org/privacy');
    });

    fireEvent.press(screen.getByText('Terms of Service'));
    await waitFor(() => {
      expect(linkingSpy).toHaveBeenCalledWith('https://trysyncup.org/terms');
    });
  });
});
