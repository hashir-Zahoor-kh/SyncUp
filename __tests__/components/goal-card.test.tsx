import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { GoalCard } from '../../src/components/GoalCard';
import type { Database } from '../../src/types/database';

type GoalRow = Database['public']['Tables']['goals']['Row'];

const BASE_GOAL: GoalRow = {
  id: 'g1',
  user_id: 'u1',
  connection_id: 'c1',
  text: 'Walk 30 mins',
  tag: 'Health',
  completed_at: null,
  week_start: '2026-05-19',
  created_at: new Date().toISOString(),
};

describe('GoalCard', () => {
  it('renders correctly in uncompleted state', () => {
    render(<GoalCard goal={BASE_GOAL} isOwn />);
    expect(screen.getByText('Walk 30 mins')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByRole('checkbox', { checked: false })).toBeTruthy();
  });

  it('renders correctly in completed state', () => {
    const completedGoal: GoalRow = { ...BASE_GOAL, completed_at: new Date().toISOString() };
    render(<GoalCard goal={completedGoal} isOwn />);
    expect(screen.getByText('Walk 30 mins')).toBeTruthy();
    expect(screen.getByRole('checkbox', { checked: true })).toBeTruthy();
  });

  it('renders all four tag variants without error', () => {
    const tags = ['Health', 'Focus', 'Life', 'Custom'] as const;
    for (const tag of tags) {
      const { unmount } = render(<GoalCard goal={{ ...BASE_GOAL, tag }} isOwn />);
      expect(screen.getByText(tag)).toBeTruthy();
      unmount();
    }
  });
});
