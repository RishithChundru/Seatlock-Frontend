/**
 * Isometric (3D-style) arena for the sign-in panel: a stage and screen, rows of seats, your two marigold seats,
 * and a floating ticket. Pure SVG, drawn back to front; colours are fixed because the panel is always navy.
 */
const S = 26;
const OX = 250, OY = 92;
type Face = { top: string; left: string; right: string };

const P = (x: number, y: number, z: number) => `${(OX + (x - y) * S).toFixed(1)},${(OY + ((x + y) * S) / 2 - z * S).toFixed(1)}`;

function box(key: string, x: number, y: number, z: number, w: number, d: number, h: number, c: Face) {
  return (
    <g key={key}>
      <polygon points={[P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)].join(" ")} fill={c.left} />
      <polygon points={[P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)].join(" ")} fill={c.right} />
      <polygon points={[P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)].join(" ")} fill={c.top} />
    </g>
  );
}

const FLOOR: Face = { top: "#1b2d66", left: "#13214d", right: "#0f1a3f" };
const STAGE: Face = { top: "#2c4595", left: "#1f3577", right: "#182b63" };
const SCREEN: Face = { top: "#c7d4f2", left: "#e8eefc", right: "#b9c8ec" };
const OPEN: Face = { top: "#4767c4", left: "#2f4ea6", right: "#253f8c" };
const MINE: Face = { top: "#fcd34d", left: "#f59e0b", right: "#d97706" };
const TAKEN: Face = { top: "#64748b", left: "#4b5563", right: "#3d4654" };

const ROWS = 5, COLS = 8;
const taken = new Set(["0-1", "0-6", "1-2", "2-6", "2-7", "3-0", "4-3", "4-4"]);
const mine = new Set(["2-3", "2-4"]);

export default function AuthArt({ className = "" }: { className?: string }) {
  const seats = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${r}-${c}`;
      const color = mine.has(key) ? MINE : taken.has(key) ? TAKEN : OPEN;
      const x = 0.5 + c * 1.05, y = 0.4 + r * 1.2;
      seats.push(box(`s${key}`, x, y, 0, 0.8, 0.62, 0.3, color));           // seat cushion
      seats.push(box(`b${key}`, x, y + 0.6, 0, 0.8, 0.2, 0.78, color));      // backrest
    }
  }
  return (
    <svg viewBox="0 0 520 400" className={className} role="img" aria-label="An arena seat map with two of your seats highlighted in gold and a floating ticket">
      {/* soft glow behind the scene */}
      <ellipse cx="250" cy="230" rx="230" ry="120" fill="#1e3a8a" opacity="0.35" />
      {box("floor", -0.6, -3.1, -0.45, 10.2, 10.2, 0.45, FLOOR)}
      {box("screen", 0.2, -3.0, 0, 8.4, 0.25, 2.3, SCREEN)}
      {box("stage", 0.2, -2.6, 0, 8.4, 1.8, 0.45, STAGE)}
      <polygon points={[P(0.2, -0.8, 0.46), P(8.6, -0.8, 0.46), P(8.6, -0.7, 0.46), P(0.2, -0.7, 0.46)].join(" ")} fill="#fbbf24" opacity="0.9" />
      {seats}

      {/* floating ticket */}
      <g transform="translate(318 34) rotate(-9)">
        <rect x="6" y="10" width="178" height="84" rx="12" fill="#000" opacity="0.25" />
        <rect width="178" height="84" rx="12" fill="#ffffff" />
        <rect width="50" height="84" rx="12" fill="#fbbf24" />
        <rect x="38" width="12" height="84" fill="#fbbf24" />
        <circle cx="50" cy="0" r="7" fill="#0f1b3d" />
        <circle cx="50" cy="84" r="7" fill="#0f1b3d" />
        <line x1="50" y1="10" x2="50" y2="74" stroke="#d97706" strokeWidth="2" strokeDasharray="4 4" />
        <text x="25" y="47" textAnchor="middle" fontSize="15" fontWeight="800" fill="#111827" transform="rotate(-90 25 42)">ADMIT</text>
        <text x="62" y="28" fontSize="13" fontWeight="800" fill="#111827">NEON NIGHTS</text>
        <text x="62" y="46" fontSize="11" fill="#5b6472">Row C · 4, 5</text>
        <text x="62" y="64" fontSize="11" fontWeight="700" fill="#1e3a8a">Sat · 7:30 PM</text>
        <g transform="translate(140 46)" fill="#111827">
          {[[0, 0], [8, 0], [16, 0], [0, 8], [16, 8], [0, 16], [8, 16], [16, 16], [8, 8]].map(([qx, qy], i) =>
            <rect key={i} x={qx} y={qy} width="6" height="6" rx="1" opacity={i === 8 ? 0.35 : 1} />)}
        </g>
      </g>
      {/* lock badge */}
      <g transform="translate(494 122)">
        <circle r="22" fill="#fbbf24" />
        <circle r="22" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="6" />
        <rect x="-8" y="-2" width="16" height="12" rx="3" fill="#111827" />
        <path d="M-5 -2v-4a5 5 0 0 1 10 0v4" fill="none" stroke="#111827" strokeWidth="2.6" />
      </g>
      {/* dotted line from your seats up to the ticket */}
      <path d={`M ${P(4.2, 2.8, 0.9).replace(",", " ")} C 320 170, 340 140, 352 122`} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
    </svg>
  );
}
