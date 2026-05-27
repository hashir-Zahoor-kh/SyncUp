import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Database } from '../types/database';
import { ReactionStrip } from './ReactionStrip';
import type { ReactionEmoji } from '../schemas/reaction';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type ReactionRow = Database['public']['Tables']['reactions']['Row'];
type GoalTag = GoalRow['tag'];

const TAG_COLORS: Record<GoalTag, { bg: string; text: string }> = {
  Health: { bg: '#D4F0E4', text: '#1D6E52' },
  Focus: { bg: '#EDE8FB', text: '#5B48C8' },
  Life: { bg: '#FDF3D4', text: '#8A6C00' },
  Custom: { bg: '#F0EFEE', text: '#666' },
};

interface GoalCardProps {
  goal: GoalRow;
  isOwn: boolean;
  onComplete?: ((goalId: string) => Promise<void>) | undefined;
  onDelete?: ((goalId: string) => Promise<void>) | undefined;
  goalReactions?: ReactionRow[] | undefined;
  myReaction?: ReactionRow | undefined;
  onAddReaction?: ((goalId: string, emoji: ReactionEmoji) => Promise<void>) | undefined;
  onRemoveReaction?: ((goalId: string) => Promise<void>) | undefined;
}

export function GoalCard({
  goal,
  isOwn,
  onComplete,
  onDelete,
  goalReactions,
  myReaction,
  onAddReaction,
  onRemoveReaction,
}: GoalCardProps): React.JSX.Element {
  const isCompleted = goal.completed_at != null;
  const tagStyle = TAG_COLORS[goal.tag];

  const handlePress = async (): Promise<void> => {
    if (!isOwn || isCompleted || !onComplete) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onComplete(goal.id);
  };

  const handleLongPress = (): void => {
    if (!isOwn || !onDelete) return;
    Alert.alert('Delete goal?', `"${goal.text}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void onDelete(goal.id),
      },
    ]);
  };

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <TouchableOpacity
        style={styles.goalRow}
        onPress={() => void handlePress()}
        onLongPress={isOwn ? handleLongPress : undefined}
        activeOpacity={isOwn ? 0.7 : 1}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isCompleted }}
        accessibilityLabel={`${goal.text}, ${isCompleted ? 'completed' : 'not completed'}`}
      >
        <View style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}>
          {isCompleted && <Text style={styles.checkmark}>✓</Text>}
        </View>

        <Text style={[styles.text, isCompleted && styles.textCompleted]} numberOfLines={2}>
          {goal.text}
        </Text>

        <View style={[styles.tag, { backgroundColor: tagStyle.bg }]}>
          <Text style={[styles.tagText, { color: tagStyle.text }]}>{goal.tag}</Text>
        </View>
      </TouchableOpacity>

      {!isOwn && onAddReaction !== undefined && onRemoveReaction !== undefined && (
        <ReactionStrip
          goalId={goal.id}
          goalReactions={goalReactions ?? []}
          myReaction={myReaction}
          onAddReaction={onAddReaction}
          onRemoveReaction={onRemoveReaction}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E8E0D8',
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardCompleted: { backgroundColor: '#F0FAF5' },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#1D9E75',
    borderColor: '#1D9E75',
  },
  checkmark: { fontSize: 12, color: '#FFF', fontFamily: 'DMSans_700Bold' },
  text: {
    flex: 1,
    fontSize: 14,
    color: '#2C2C2A',
    fontFamily: 'DMSans_400Regular',
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: { fontSize: 11, fontFamily: 'DMSans_700Bold' },
});
