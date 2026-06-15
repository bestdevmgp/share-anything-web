interface PauseBarsIconProps {
  className?: string;
}

// Pause icon drawn as two filled bars so bar thickness and the gap between
// them can be tuned independently (Heroicons' stroked PauseIcon couples them).
export default function PauseBarsIcon({ className }: PauseBarsIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5.75" y="3" width="4" height="18" rx="2" />
      <rect x="14.25" y="3" width="4" height="18" rx="2" />
    </svg>
  );
}
