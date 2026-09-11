// One small line-icon per concierge category, purely presentational (the
// Concierge Desk direction). Falls back to a generic mark for any category
// an admin adds later that isn't in this list yet — new categories aren't
// blocked on someone remembering to add an icon for them.
const PATHS: Record<string, string> = {
  Travel: "M2 12h20M13 4l7 8-7 8M9 4l-7 8 7 8",
  "Lifestyle services": "M6 8h12l-1 12H7L6 8Z M9 8V6a3 3 0 0 1 6 0v2",
  Wellness: "M12 21s-7-4.6-7-10a4.5 4.5 0 0 1 7-3.7A4.5 4.5 0 0 1 19 11c0 5.4-7 10-7 10Z",
  Restaurants: "M4 10h16M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M4 10v10h16V10",
  "Exclusive access": "m12 2 2.9 6.6L22 9.3l-5 5 1.3 7.2L12 18l-6.3 3.5L7 14.3l-5-5 7.1-.7L12 2Z",
  Education: "M22 10 12 5 2 10l10 5 10-5Z M6 12v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5",
  "Expert network": "M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1",
  "Private events": "M8 2v4M16 2v4M3 9h18M4 5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  "Art and culture": "M12 3c-4 0-8 1.5-8 4.5S9 12 9 15a3 3 0 0 0 6 0c0-3 5-4 5-7.5S16 3 12 3ZM9 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  Sport: "M12 21s-7-4.6-7-10a4.5 4.5 0 0 1 7-3.7A4.5 4.5 0 0 1 19 11c0 5.4-7 10-7 10Z",
};

const FALLBACK = "M12 2 2 22h20L12 2Z";

export function ConciergeIcon({ category, className }: { category: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[category] ?? FALLBACK} />
    </svg>
  );
}
