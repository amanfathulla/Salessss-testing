type IconProps = { size?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconDashboard({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="3.5" y="3.5" width="7.5" height="9" rx="1.8" />
      <rect x="13" y="3.5" width="7.5" height="5.5" rx="1.8" />
      <rect x="13" y="11.5" width="7.5" height="9" rx="1.8" />
      <rect x="3.5" y="15" width="7.5" height="5.5" rx="1.8" />
    </svg>
  );
}

export function IconBox({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4Z" />
      <path d="M3.5 7.5 12 11.5l8.5-4" />
      <path d="M12 11.5v9" />
    </svg>
  );
}

export function IconUsers({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.8 19c.6-3.2 2.9-5 5.2-5s4.6 1.8 5.2 5" />
      <circle cx="16.8" cy="7.8" r="2.5" />
      <path d="M15.2 11.5c1.9.3 3.6 1.9 4.1 4.6" />
    </svg>
  );
}

export function IconGear({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.8v2.1M12 18.1v2.1M20.2 12h-2.1M5.9 12H3.8M17.5 6.5l-1.5 1.5M8 16l-1.5 1.5M17.5 17.5 16 16M8 8 6.5 6.5" />
    </svg>
  );
}

export function IconLogout({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M9.5 20H6a1.8 1.8 0 0 1-1.8-1.8V5.8A1.8 1.8 0 0 1 6 4h3.5" />
      <path d="M15.5 16.2 20 12l-4.5-4.2" />
      <path d="M20 12H9.8" />
    </svg>
  );
}

export function IconChevron({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </svg>
  );
}

export function IconMenu({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

export function IconClose({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5" />
    </svg>
  );
}

export function IconNote({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M5 4.5h11l3.5 3.5V19a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z" />
      <path d="M15.5 4.5V8h3.5" />
      <path d="M8 11.5h8M8 14.5h8M8 17.5h5" />
    </svg>
  );
}
