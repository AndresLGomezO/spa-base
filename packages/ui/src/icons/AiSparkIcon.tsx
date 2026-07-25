import { cn } from "@repo/theme/utils";

import "../ai/ai-builder-loading.css";

export interface AiSparkIconProps {
  readonly size?: number;
  readonly className?: string;
  readonly animated?: boolean;
}

export function AiSparkIcon({
  size = 20,
  className,
  animated = false,
}: AiSparkIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(animated && "ai-spark-icon-animated", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="aiSparkGradient" x1="4" y1="4" x2="20" y2="20">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="aiSparkGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill="url(#aiSparkGlow)" opacity="0.35" />
      <path
        d="M12 3.5 13.4 9.2 19 10.6 13.4 12 12 17.7 10.6 12 5 10.6 10.6 9.2Z"
        fill="url(#aiSparkGradient)"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="0.6"
      />
      <circle
        cx="18.5"
        cy="6.5"
        r="1.1"
        fill="#fde68a"
        className="ai-spark-dot-1"
      />
      <circle
        cx="6"
        cy="17"
        r="0.9"
        fill="#67e8f9"
        className="ai-spark-dot-2"
      />
      <circle
        cx="17.5"
        cy="16"
        r="0.7"
        fill="#c4b5fd"
        className="ai-spark-dot-3"
      />
    </svg>
  );
}
