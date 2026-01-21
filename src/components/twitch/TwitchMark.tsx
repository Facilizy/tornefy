export function TwitchMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {/* Twitch "Glitch" mark (24x24) */}
      <path d="M4.265 0 2.046 5.688v16.93h5.82V24h3.11l3.11-3.11h4.575L24 16.575V0H4.265Zm17.51 15.535-3.11 3.11h-4.576l-3.11 3.11v-3.11H6.404V2.08h15.37v13.455ZM17.51 5.688h-2.219v6.647h2.219V5.688Zm-6.093 0H9.198v6.647h2.219V5.688Z" />
    </svg>
  );
}
