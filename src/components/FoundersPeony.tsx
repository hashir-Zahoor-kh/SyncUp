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
        d="M 218 128 C 226 148 213 164 217 180"
        stroke="#6B8F5E"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      {/* Branch from main stem to leaf 3 */}
      <Path
        d="M 106 142 C 122 139 138 138 152 138"
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

      {/* Leaf 2 — right of bud stem, base on stem at (219,150) */}
      <Path
        d="M 219 150 C 251 136 268 158 249 168 C 238 161 228 155 219 150 Z"
        fill="#B8D4A8"
        fillOpacity={0.5}
        stroke="#6B8F5E"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 219 150 C 235 154 247 160 249 168"
        stroke="#6B8F5E"
        strokeWidth={0.9}
        fill="none"
      />

      {/* Leaf 3 — base at end of branch from main stem at (152,138) */}
      <Path
        d="M 152 138 C 168 124 182 130 174 146 C 164 146 157 143 152 138 Z"
        fill="#B8D4A8"
        fillOpacity={0.5}
        stroke="#6B8F5E"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 152 138 C 162 137 170 141 174 146"
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

      {/* Bud outer petals — center (220, 110), 4 petals */}
      {([0, 90, 180, 270] as const).map((angle, i) => (
        <G key={`bp-${i}`} transform={`rotate(${angle}, 220, 110)`}>
          <Path
            d="M 220 110 C 213 106 211 95 218 89 C 220 86 223 86 226 90 C 231 97 229 108 220 110 Z"
            fill="#F2C4CE"
            fillOpacity={0.6}
            stroke="#D4849A"
            strokeWidth={1.5}
          />
        </G>
      ))}

      {/* Bud inner petals — 3 */}
      {([45, 165, 285] as const).map((angle, i) => (
        <G key={`bi-${i}`} transform={`rotate(${angle}, 220, 110)`}>
          <Path
            d="M 220 110 C 215 107 214 99 218 94 C 220 92 222 92 224 95 C 228 101 226 109 220 110 Z"
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
