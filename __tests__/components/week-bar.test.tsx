import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { WeekBar } from '../../src/components/WeekBar';

describe('WeekBar', () => {
  it('renders all 7 day labels', () => {
    render(<WeekBar />);
    // Two T labels exist (Tuesday + Thursday) — findAll counts both
    expect(screen.getAllByText('M').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('T').length).toBe(2);
    expect(screen.getAllByText('W').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('F').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('S').length).toBe(2);
  });
});
