import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '../../src/contexts/AuthContext';
import { useProfile } from '../../src/contexts/ProfileContext';
import { GoalProvider } from '../../src/contexts/GoalContext';
import { ReactionProvider } from '../../src/contexts/ReactionContext';

function BoardIcon({ focused }: { focused: boolean }): React.JSX.Element {
  const color = focused ? '#D85A30' : '#888780';
  return (
    <Svg width={28} height={16} viewBox="0 0 28 16">
      <Circle cx={8} cy={8} r={6} stroke={color} strokeWidth={1.5} fill="none" />
      <Circle cx={20} cy={8} r={6} stroke={color} strokeWidth={1.5} fill={color} />
    </Svg>
  );
}

export default function AppLayout(): React.JSX.Element {
  const { session, loading } = useAuth();
  const { isOnboarded, profileLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!session) {
      router.replace('/(auth)/sign-in');
    } else if (!isOnboarded) {
      router.replace('/(onboarding)/setup');
    }
  }, [session, loading, isOnboarded, profileLoading, router]);

  return (
    <GoalProvider>
      <ReactionProvider>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: '#D85A30',
            tabBarInactiveTintColor: '#888780',
            tabBarLabelStyle: styles.tabLabel,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Board',
              tabBarIcon: ({ focused }) => <BoardIcon focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="activity"
            options={{
              title: 'Activity',
              tabBarIcon: ({ focused }) => (
                <Feather name="bell" size={22} color={focused ? '#D85A30' : '#888780'} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ focused }) => (
                <Feather name="user" size={22} color={focused ? '#D85A30' : '#888780'} />
              ),
            }}
          />
          {/* Modal screens — hidden from tab bar */}
          <Tabs.Screen name="invite" options={{ href: null }} />
          <Tabs.Screen name="accept-invite" options={{ href: null }} />
          <Tabs.Screen name="connected" options={{ href: null }} />
        </Tabs>
      </ReactionProvider>
    </GoalProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FBF7F2',
    borderTopColor: '#E8E0D8',
    borderTopWidth: 0.5,
    height: 84,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
});
