import React from 'react';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  percentage: number;
  color: string;
  size?: number | undefined;
  strokeWidth?: number | undefined;
}

export function ProgressRing({
  percentage,
  color,
  size = 32,
  strokeWidth = 3,
}: ProgressRingProps): React.JSX.Element {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const offset = circumference - (clampedPct / 100) * circumference;
  const center = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke="#E8E0D8"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation={-90}
        origin={`${center}, ${center}`}
      />
    </Svg>
  );
}
