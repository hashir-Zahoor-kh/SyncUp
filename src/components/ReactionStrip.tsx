import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { REACTION_EMOJIS, type ReactionEmoji } from '../schemas/reaction';
import type { Database } from '../types/database';

type ReactionRow = Database['public']['Tables']['reactions']['Row'];

interface ReactionStripProps {
  goalId: string;
  goalReactions: ReactionRow[];
  myReaction?: ReactionRow | undefined;
  onAddReaction: (goalId: string, emoji: ReactionEmoji) => Promise<void>;
  onRemoveReaction: (goalId: string) => Promise<void>;
}

export function ReactionStrip({
  goalId,
  goalReactions,
  myReaction,
  onAddReaction,
  onRemoveReaction,
}: ReactionStripProps): React.JSX.Element {
  const counts = REACTION_EMOJIS.reduce(
    (acc, emoji) => {
      acc[emoji] = goalReactions.filter((r) => r.emoji === emoji).length;
      return acc;
    },
    {} as Record<ReactionEmoji, number>,
  );

  const handleEmojiPress = async (emoji: ReactionEmoji): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (myReaction?.emoji === emoji) {
      await onRemoveReaction(goalId);
    } else {
      await onAddReaction(goalId, emoji);
    }
  };

  return (
    <View style={styles.strip}>
      {REACTION_EMOJIS.map((emoji) => {
        const isActive = myReaction?.emoji === emoji;
        const count = counts[emoji] ?? 0;
        return (
          <TouchableOpacity
            key={emoji}
            style={[styles.emojiButton, isActive && styles.emojiButtonActive]}
            onPress={() => void handleEmojiPress(emoji)}
            accessibilityLabel={`React with ${emoji}${count > 0 ? `, ${count}` : ''}`}
            accessibilityRole="button"
          >
            <Text style={styles.emojiText}>{emoji}</Text>
            {count > 0 && <Text style={styles.countText}>{count}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 6,
    gap: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#F0EBE3',
  },
  emojiButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#F7F4F0',
    minWidth: 40,
  },
  emojiButtonActive: {
    borderColor: '#D85A30',
    backgroundColor: '#FBEEE8',
    transform: [{ scale: 1.1 }],
  },
  emojiText: { fontSize: 16 },
  countText: {
    fontSize: 10,
    color: '#888',
    fontFamily: 'DMSans_400Regular',
    marginTop: 1,
  },
});
