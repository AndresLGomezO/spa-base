import { cn } from "@repo/theme/utils";

export interface LogoProps {
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
}

const sizeMap = {
  sm: 40,
  md: 56,
  lg: 72,
} as const;

export function Logo({ size = "md", className }: LogoProps) {
  const dimension = sizeMap[size];

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="8" y1="8" x2="48" y2="48">
          <stop stopColor="var(--color-primary-400)" />
          <stop offset="1" stopColor="var(--color-primary-700)" />
        </linearGradient>
      </defs>
      <rect width="56" height="56" rx="14" fill="url(#logo-gradient)" />
      <path
        d="M18 36V20h8.5c4.2 0 6.8 2.4 6.8 6.1 0 3.7-2.6 6.2-6.8 6.2H24v3.7H18zm6-7.2h2.1c1.8 0 2.8-0.9 2.8-2.3s-1-2.2-2.8-2.2H24v4.5zM34.5 36l5.5-16h5.8L40 36h-5.5z"
        fill="white"
      />
    </svg>
  );
}
