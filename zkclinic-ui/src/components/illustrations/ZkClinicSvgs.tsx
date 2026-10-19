/** Inline SVG accents for app shell and cards (no external assets). */

export function SparkGridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="18" r="3" fill="currentColor" opacity="0.35" />
      <circle cx="36" cy="18" r="3" fill="currentColor" opacity="0.2" />
      <circle cx="60" cy="18" r="3" fill="currentColor" opacity="0.45" />
      <circle cx="84" cy="18" r="3" fill="currentColor" opacity="0.25" />
      <circle cx="108" cy="18" r="3" fill="currentColor" opacity="0.15" />
      <circle cx="24" cy="42" r="3" fill="currentColor" opacity="0.28" />
      <circle cx="48" cy="42" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="72" cy="42" r="3" fill="currentColor" opacity="0.22" />
      <circle cx="96" cy="42" r="3" fill="currentColor" opacity="0.38" />
      <circle cx="12" cy="66" r="3" fill="currentColor" opacity="0.18" />
      <circle cx="36" cy="66" r="3" fill="currentColor" opacity="0.42" />
      <circle cx="60" cy="66" r="3" fill="currentColor" opacity="0.3" />
      <circle cx="84" cy="66" r="3" fill="currentColor" opacity="0.12" />
      <circle cx="108" cy="66" r="3" fill="currentColor" opacity="0.35" />
      <circle cx="24" cy="90" r="3" fill="currentColor" opacity="0.24" />
      <circle cx="48" cy="90" r="3" fill="currentColor" opacity="0.4" />
      <circle cx="72" cy="90" r="3" fill="currentColor" opacity="0.16" />
      <circle cx="96" cy="90" r="3" fill="currentColor" opacity="0.32" />
    </svg>
  );
}

export function ShieldLeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden width={64} height={64}>
      <path
        d="M32 4 8 14v18c0 14 10.5 24 24 28 13.5-4 24-14 24-28V14L32 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path
        d="M24 32c4-8 12-12 16-18 2 6-2 14-8 20-4 4-8 6-12 6-2-4-2-6 4-8Z"
        fill="currentColor"
        opacity="0.25"
      />
    </svg>
  );
}

export function ContactlessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M8 24c6-10 26-10 32 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M14 18c4-6 16-6 20 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path d="M20 12c2-3 6-3 8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

export function CardChipSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="1" y="1" width="42" height="32" rx="5" fill="url(#chip-gold)" stroke="rgba(80,60,20,0.45)" />
      <path d="M8 9h28v3H8V9Zm0 6h28v3H8v-3Zm0 6h16v3H8v-3Z" fill="rgba(40,32,10,0.35)" />
      <defs>
        <linearGradient id="chip-gold" x1="6" y1="4" x2="38" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0d78c" />
          <stop offset="0.45" stopColor="#c9a227" />
          <stop offset="1" stopColor="#8a6a1c" />
        </linearGradient>
      </defs>
    </svg>
  );
}
