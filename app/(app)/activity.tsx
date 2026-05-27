import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGoals } from '../../src/contexts/GoalContext';
import { useReactions } from '../../src/contexts/ReactionContext';

export type GoalCompletedEvent = {
  id: string;
  type: 'goal_completed';
  partnerName: string;
  timestamp: string;
  goalText: string;
};

export type ReactionEvent = {
  id: string;
  type: 'reaction';
  partnerName: string;
  timestamp: string;
  emoji: string;
  goalText: string;
};

export type ActivityEvent = GoalCompletedEvent | ReactionEvent;

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

interface ActivityListProps {
  events: ActivityEvent[];
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

export function ActivityList({
  events,
  onRefresh,
  refreshing,
}: ActivityListProps): React.JSX.Element {
  const handleRefresh = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🌱</Text>
        <Text style={styles.emptyTitle}>Nothing yet</Text>
        <Text style={styles.emptySubtitle}>
          Activity will show up here as you both make progress
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D85A30" />
      }
      renderItem={({ item }) => (
        <View style={styles.eventCard}>
          <View style={styles.eventIconWell}>
            <Text style={styles.eventIcon}>
              {item.type === 'goal_completed' ? '✅' : item.emoji}
            </Text>
          </View>
          <View style={styles.eventBody}>
            <Text style={styles.eventTitle}>
              {item.type === 'goal_completed'
                ? `${item.partnerName} completed a goal`
                : `${item.partnerName} reacted to your goal`}
            </Text>
            <Text style={styles.eventGoalText} numberOfLines={1}>
              {`"${item.goalText}"`}
            </Text>
            <Text style={styles.eventTime}>{relativeTime(item.timestamp)}</Text>
          </View>
        </View>
      )}
    />
  );
}

export default function ActivityScreen(): React.JSX.Element {
  const { goals, partnerGoals, partnerProfile, refresh } = useGoals();
  const { reactions } = useReactions();
  const [refreshing, setRefreshing] = useState(false);

  const partnerName = partnerProfile?.display_name ?? 'Partner';
  const partnerId = partnerProfile?.id;

  const events = useMemo((): ActivityEvent[] => {
    const result: ActivityEvent[] = [];

    // Partner completed goals
    for (const g of partnerGoals) {
      if (g.completed_at) {
        result.push({
          id: `goal-${g.id}`,
          type: 'goal_completed',
          partnerName,
          timestamp: g.completed_at,
          goalText: g.text,
        });
      }
    }

    // Partner reacted to my goals
    if (partnerId) {
      for (const r of reactions) {
        if (r.from_user_id === partnerId) {
          const myGoal = goals.find((g) => g.id === r.goal_id);
          if (myGoal) {
            result.push({
              id: `reaction-${r.id}`,
              type: 'reaction',
              partnerName,
              timestamp: r.created_at,
              emoji: r.emoji,
              goalText: myGoal.text,
            });
          }
        }
      }
    }

    // Most recent first
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [goals, partnerGoals, reactions, partnerName, partnerId]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
      </View>
      <ActivityList events={events} onRefresh={handleRefresh} refreshing={refreshing} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF7F2' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontSize: 22, fontFamily: 'Fraunces_700Bold', color: '#2C2C2A' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 20, fontFamily: 'Fraunces_700Bold', color: '#2C2C2A' },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    lineHeight: 20,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E8E0D8',
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  eventIconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FBEEE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIcon: { fontSize: 20 },
  eventBody: { flex: 1, gap: 2 },
  eventTitle: { fontSize: 14, fontFamily: 'DMSans_700Bold', color: '#2C2C2A' },
  eventGoalText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#666',
  },
  eventTime: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: '#AAA', marginTop: 2 },
});
