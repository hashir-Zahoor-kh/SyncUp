import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../src/lib/supabase';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { ActivityList, type ActivityEvent } from '../../app/(app)/activity';

// Mock supabase before any imports that pull it in
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'test-user-id' } })),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetToken = Notifications.getExpoPushTokenAsync as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as jest.Mock;

// Test wrapper that calls the hook and exposes `requestAndRegister` via a callback
function HookHarness({
  onReady,
}: {
  onReady: (fn: () => Promise<void>) => void;
}): React.JSX.Element {
  const { requestAndRegister } = usePushNotifications();
  React.useEffect(() => {
    onReady(requestAndRegister);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <></>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
});

describe('usePushNotifications', () => {
  it('Test 12a — granted status: registers token immediately', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[test-token]' });

    let trigger: (() => Promise<void>) | undefined;
    render(
      <HookHarness
        onReady={(fn) => {
          trigger = fn;
        }}
      />,
    );

    await waitFor(() => expect(trigger).toBeDefined());
    await trigger!();

    expect(mockGetToken).toHaveBeenCalled();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('Test 12b — undetermined status: requests permission then registers if granted', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[test-token]' });

    let trigger: (() => Promise<void>) | undefined;
    render(
      <HookHarness
        onReady={(fn) => {
          trigger = fn;
        }}
      />,
    );

    await waitFor(() => expect(trigger).toBeDefined());
    await trigger!();

    expect(mockRequestPermissions).toHaveBeenCalled();
    expect(mockGetToken).toHaveBeenCalled();
  });

  it('Test 12c — denied status: shows one-time nudge, never requests permission', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });

    let trigger: (() => Promise<void>) | undefined;
    render(
      <HookHarness
        onReady={(fn) => {
          trigger = fn;
        }}
      />,
    );

    await waitFor(() => expect(trigger).toBeDefined());
    await trigger!();

    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockGetToken).not.toHaveBeenCalled();
    // SecureStore should record that nudge was shown
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('push_nudge_shown', 'true');
  });

  it('Test 13 — registration calls supabase push_tokens upsert with correct args', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert: mockUpsert });

    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[abc123]' });

    let trigger: (() => Promise<void>) | undefined;
    render(
      <HookHarness
        onReady={(fn) => {
          trigger = fn;
        }}
      />,
    );

    await waitFor(() => expect(trigger).toBeDefined());
    await trigger!();

    expect(supabase.from as jest.Mock).toHaveBeenCalledWith('push_tokens');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'test-user-id', token: 'ExponentPushToken[abc123]' }),
      expect.objectContaining({ onConflict: 'user_id' }),
    );
  });
});

// ── Activity feed tests ───────────────────────────────────────────────────────

const MOCK_EVENTS: ActivityEvent[] = [
  {
    id: 'goal-1',
    type: 'goal_completed',
    partnerName: 'Sara',
    timestamp: new Date(Date.now() - 120000).toISOString(), // 2 min ago
    goalText: 'Walk 30 mins',
  },
  {
    id: 'reaction-1',
    type: 'reaction',
    partnerName: 'Sara',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // yesterday
    emoji: '💛',
    goalText: 'Read for 20 mins',
  },
];

const noopRefresh = async (): Promise<void> => {};

describe('ActivityList', () => {
  it('Test 14 — renders events correctly', () => {
    render(<ActivityList events={MOCK_EVENTS} onRefresh={noopRefresh} refreshing={false} />);
    expect(screen.getByText('Sara completed a goal')).toBeTruthy();
    expect(screen.getByText('"Walk 30 mins"')).toBeTruthy();
    expect(screen.getByText('Sara reacted to your goal')).toBeTruthy();
    expect(screen.getByText('"Read for 20 mins"')).toBeTruthy();
  });

  it('Test 15 — shows empty state when no events', () => {
    render(<ActivityList events={[]} onRefresh={noopRefresh} refreshing={false} />);
    expect(screen.getByText('Activity will show up here as you both make progress')).toBeTruthy();
    expect(screen.getByText('Nothing yet')).toBeTruthy();
  });
});
