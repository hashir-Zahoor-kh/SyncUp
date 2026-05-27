import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ReactionStrip } from '../../src/components/ReactionStrip';
import { GoalCard } from '../../src/components/GoalCard';
import { REACTION_EMOJIS } from '../../src/schemas/reaction';
import type { Database } from '../../src/types/database';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type ReactionRow = Database['public']['Tables']['reactions']['Row'];

const BASE_GOAL: GoalRow = {
  id: 'g1',
  user_id: 'u1',
  connection_id: 'c1',
  text: 'Walk 30 mins',
  tag: 'Health',
  completed_at: null,
  week_start: '2026-05-26',
  created_at: new Date().toISOString(),
};

const mockAddReaction = jest.fn<Promise<void>, [string, string]>().mockResolvedValue(undefined);
const mockRemoveReaction = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

const defaultStripProps = {
  goalId: 'g1',
  goalReactions: [] as ReactionRow[],
  myReaction: undefined as ReactionRow | undefined,
  onAddReaction: mockAddReaction,
  onRemoveReaction: mockRemoveReaction,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ReactionStrip', () => {
  it('Test 1 — renders all 6 emoji buttons', () => {
    render(<ReactionStrip {...defaultStripProps} />);
    for (const emoji of REACTION_EMOJIS) {
      expect(screen.getByText(emoji)).toBeTruthy();
    }
    expect(REACTION_EMOJIS).toHaveLength(6);
  });

  it('Test 2 — GoalCard does not render ReactionStrip when isOwn=true', () => {
    render(
      <GoalCard
        goal={BASE_GOAL}
        isOwn
        goalReactions={[]}
        onAddReaction={mockAddReaction}
        onRemoveReaction={mockRemoveReaction}
      />,
    );
    // None of the 6 reaction emojis should be visible
    for (const emoji of REACTION_EMOJIS) {
      expect(screen.queryByText(emoji)).toBeNull();
    }
  });

  it('Test 3 — tapping an emoji calls addReaction with correct goalId and emoji', async () => {
    render(<ReactionStrip {...defaultStripProps} />);
    const fireButton = screen.getByText('🔥');
    fireEvent.press(fireButton);
    await waitFor(() => {
      expect(mockAddReaction).toHaveBeenCalledWith('g1', '🔥');
      expect(mockRemoveReaction).not.toHaveBeenCalled();
    });
  });

  it('Test 4 — tapping the already-active reaction calls removeReaction', async () => {
    const myReaction: ReactionRow = {
      id: 'r1',
      goal_id: 'g1',
      from_user_id: 'u2',
      emoji: '🔥',
      created_at: new Date().toISOString(),
    };
    render(<ReactionStrip {...defaultStripProps} myReaction={myReaction} />);
    const fireButton = screen.getByText('🔥');
    fireEvent.press(fireButton);
    await waitFor(() => {
      expect(mockRemoveReaction).toHaveBeenCalledWith('g1');
      expect(mockAddReaction).not.toHaveBeenCalled();
    });
  });
});
