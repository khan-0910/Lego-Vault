/* Original comic-style spot illustrations for empty states. Ink outlines, flat fills, offset shadows. */

const S = { stroke: "#2A1F45", strokeWidth: 3.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Brick({ x, y, w = 48, color = "#FF5C6C", studs = 2 }: { x: number; y: number; w?: number; color?: string; studs?: number }) {
  const gap = w / studs;
  return (
    <g>
      <g transform="translate(4 4)" fill="#2A1F45">
        {Array.from({ length: studs }, (_, i) => (
          <rect key={i} x={x + gap * i + gap / 2 - 7} y={y - 7} width="14" height="9" rx="3" />
        ))}
        <rect x={x} y={y} width={w} height="26" rx="4" />
      </g>
      <g fill={color} {...S}>
        {Array.from({ length: studs }, (_, i) => (
          <rect key={i} x={x + gap * i + gap / 2 - 7} y={y - 7} width="14" height="9" rx="3" />
        ))}
        <rect x={x} y={y} width={w} height="26" rx="4" />
      </g>
      <path d={`M${x + 7} ${y + 7}h10`} stroke="#FFFAF4" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

export function EmptyVaultArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 190" className={className} aria-hidden>
      <ellipse cx="130" cy="172" rx="108" ry="10" fill="#2A1F45" opacity=".12" />
      {/* baseplate */}
      <g transform="translate(5 5)" fill="#2A1F45">
        <path d="M24 128 L130 100 L236 128 L130 158 Z" />
      </g>
      <path d="M24 128 L130 100 L236 128 L130 158 Z" fill="#2FCB8A" {...S} />
      <path d="M24 128 L24 138 L130 168 L236 138 L236 128 L130 158 Z" fill="#1E8E5A" {...S} />
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => {
          const x = 130 + (c - r) * 19;
          const y = 106 + (c + r) * 5.2;
          return <ellipse key={`${r}-${c}`} cx={x} cy={y + 4} rx="6" ry="3" fill="#7BF1C8" stroke="#2A1F45" strokeWidth="2" />;
        }),
      )}
      <Brick x={104} y={66} w={52} color="#FF5C6C" />
      {/* speech bubble */}
      <g>
        <path d="M168 18 h70 a10 10 0 0 1 10 10 v28 a10 10 0 0 1 -10 10 h-38 l-14 14 l2 -14 h-20 a10 10 0 0 1 -10 -10 v-28 a10 10 0 0 1 10 -10 z" fill="#FFD447" {...S} />
        <text x="203" y="50" textAnchor="middle" fontFamily="var(--font-sfx)" fontSize="22" fill="#2A1F45">
          EMPTY!
        </text>
      </g>
      <path d="M40 40l6 12M30 54l12 2M52 32l-2 12" stroke="#2A1F45" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function NoResultsArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 170" className={className} aria-hidden>
      <ellipse cx="110" cy="156" rx="80" ry="8" fill="#2A1F45" opacity=".12" />
      <Brick x={40} y={104} w={64} color="#4062FF" studs={3} />
      <Brick x={112} y={110} w={44} color="#FFD447" />
      <g transform="rotate(-18 140 62)">
        <circle cx="134" cy="58" r="34" fill="#2A1F45" transform="translate(4 4)" />
        <circle cx="134" cy="58" r="34" fill="#FFFAF4" {...S} />
        <circle cx="134" cy="58" r="24" fill="#62D2FF" opacity=".35" />
        <rect x="128" y="94" width="14" height="44" rx="6" fill="#FF5C6C" {...S} />
        <text x="134" y="70" textAnchor="middle" fontFamily="var(--font-sfx)" fontSize="34" fill="#2A1F45">
          ?
        </text>
      </g>
    </svg>
  );
}

export function WishArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 180" className={className} aria-hidden>
      <ellipse cx="110" cy="166" rx="74" ry="8" fill="#2A1F45" opacity=".12" />
      <g transform="translate(5 5)" fill="#2A1F45">
        <rect x="52" y="78" width="116" height="80" rx="6" />
      </g>
      <rect x="52" y="78" width="116" height="80" rx="6" fill="#A77BFF" {...S} />
      <rect x="44" y="60" width="132" height="26" rx="6" fill="#FF9FD0" {...S} />
      <rect x="100" y="60" width="20" height="98" fill="#FFD447" {...S} />
      <path d="M110 60 C 86 30, 62 46, 84 60 Z M110 60 C 134 30, 158 46, 136 60 Z" fill="#FFD447" {...S} />
      <path d="M30 40l4-14 4 14 14 4-14 4-4 14-4-14-14-4z" fill="#FFD447" {...S} strokeWidth="2.6" />
      <path d="M186 96l3-10 3 10 10 3-10 3-3 10-3-10-10-3z" fill="#7BF1C8" {...S} strokeWidth="2.6" />
    </svg>
  );
}

export function PhotoArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden>
      <g transform="translate(5 5)" fill="#2A1F45">
        <rect x="30" y="40" width="140" height="90" rx="10" />
      </g>
      <rect x="62" y="24" width="44" height="22" rx="5" fill="#FFD447" {...S} />
      <rect x="30" y="40" width="140" height="90" rx="10" fill="#FF5C6C" {...S} />
      <circle cx="100" cy="85" r="30" fill="#2A1F45" />
      <circle cx="100" cy="85" r="22" fill="#62D2FF" {...S} />
      <circle cx="92" cy="77" r="6" fill="#FFFAF4" />
      <rect x="142" y="50" width="16" height="10" rx="3" fill="#FFFAF4" {...S} strokeWidth="2.5" />
    </svg>
  );
}

export function ChartArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 150" className={className} aria-hidden>
      <path d="M24 130 H200" {...S} />
      {[
        [40, 60, "#FF5C6C"],
        [80, 90, "#FFD447"],
        [120, 40, "#4062FF"],
        [160, 75, "#7BF1C8"],
      ].map(([x, h, c]) => (
        <g key={x as number}>
          <rect x={(x as number) + 4} y={134 - (h as number)} width="28" height={(h as number) - 4} fill="#2A1F45" />
          <rect x={x as number} y={130 - (h as number)} width="28" height={h as number} fill={c as string} {...S} strokeDasharray="6 5" />
        </g>
      ))}
      <path d="M150 22l4-12 4 12 12 4-12 4-4 12-4-12-12-4z" fill="#FFD447" {...S} strokeWidth="2.6" />
    </svg>
  );
}
