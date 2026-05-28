import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

export function FoundersPeony(): React.JSX.Element {
  return (
    <Svg viewBox="0 0 320 180" width="100%" height={180}>
      {/* Stems */}
      <Path
        d="M 103 100 C 98 122 112 146 107 180"
        stroke="#6B8F5E"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 168 128 C 176 148 163 164 167 180"
        stroke="#6B8F5E"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      {/* Leaf 1 — left of main stem, base on stem at (103,124) */}
      <Path
        d="M 103 124 C 72 110 59 132 81 142 C 91 137 99 130 103 124 Z"
        fill="#B8D4A8"
        fillOpacity={0.5}
        stroke="#6B8F5E"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M 103 124 C 87 128 77 135 81 142" stroke="#6B8F5E" strokeWidth={0.9} fill="none" />

      {/* Leaf 2 — right of bud stem, half-sized, base on stem at (219,150) */}
      <Path
        d="M 169 150 C 185 143 194 154 184 159 C 179 156 174 153 169 150 Z"
        fill="#B8D4A8"
        fillOpacity={0.5}
        stroke="#6B8F5E"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 169 150 C 177 152 183 155 184 159"
        stroke="#6B8F5E"
        strokeWidth={0.9}
        fill="none"
      />

      {/* Main bloom outer petals — 9 petals rotated around (100, 80) */}
      {([0, 40, 80, 120, 160, 200, 240, 280, 320] as const).map((angle, i) => (
        <G key={`op-${i}`} transform={`rotate(${angle}, 100, 80)`}>
          <Path
            d="M 100 80 C 86 71 82 55 93 45 C 97 41 105 41 111 48 C 120 59 114 74 100 80 Z"
            fill="#F2C4CE"
            fillOpacity={0.6}
            stroke="#D4849A"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </G>
      ))}

      {/* Main bloom inner petals — 5 petals */}
      {([20, 92, 164, 236, 308] as const).map((angle, i) => (
        <G key={`ip-${i}`} transform={`rotate(${angle}, 100, 80)`}>
          <Path
            d="M 100 80 C 91 74 89 63 96 56 C 98 53 103 53 107 57 C 114 65 111 77 100 80 Z"
            fill="#E8A4B0"
            fillOpacity={0.8}
            stroke="#D4849A"
            strokeWidth={1.2}
          />
        </G>
      ))}

      {/* Bloom center dots */}
      <Circle cx={97} cy={78} r={2.5} fill="#C47A8A" />
      <Circle cx={104} cy={76} r={2} fill="#C47A8A" />
      <Circle cx={100} cy={80} r={3} fill="#C47A8A" />
      <Circle cx={96} cy={83} r={2} fill="#C47A8A" />
      <Circle cx={104} cy={83} r={2.5} fill="#C47A8A" />
      <Circle cx={100} cy={73} r={2} fill="#C47A8A" />

      {/* Bud outer petals — center (170, 110), 4 petals */}
      {([0, 90, 180, 270] as const).map((angle, i) => (
        <G key={`bp-${i}`} transform={`rotate(${angle}, 170, 110)`}>
          <Path
            d="M 170 110 C 163 106 161 95 168 89 C 170 86 173 86 176 90 C 181 97 179 108 170 110 Z"
            fill="#F2C4CE"
            fillOpacity={0.6}
            stroke="#D4849A"
            strokeWidth={1.5}
          />
        </G>
      ))}

      {/* Bud inner petals — 3 */}
      {([45, 165, 285] as const).map((angle, i) => (
        <G key={`bi-${i}`} transform={`rotate(${angle}, 170, 110)`}>
          <Path
            d="M 170 110 C 165 107 164 99 168 94 C 170 92 172 92 174 95 C 178 101 176 109 170 110 Z"
            fill="#E8A4B0"
            fillOpacity={0.8}
            stroke="#D4849A"
            strokeWidth={1.2}
          />
        </G>
      ))}

      {/* Fallen petals */}
      <Path
        d="M 80 159 C 75 153 87 150 95 157 C 99 161 90 164 80 159 Z"
        fill="#F2C4CE"
        fillOpacity={0.4}
      />
      <Path
        d="M 114 166 C 109 160 123 157 131 163 C 135 168 124 171 114 166 Z"
        fill="#F2C4CE"
        fillOpacity={0.4}
      />
      <Path
        d="M 148 158 C 143 152 156 149 163 156 C 167 160 157 163 148 158 Z"
        fill="#F2C4CE"
        fillOpacity={0.4}
      />
      <Path
        d="M 66 171 C 62 165 73 163 80 169 C 83 173 74 175 66 171 Z"
        fill="#F2C4CE"
        fillOpacity={0.35}
      />
    </Svg>
  );
}
