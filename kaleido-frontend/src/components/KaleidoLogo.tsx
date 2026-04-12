import { cn } from "@/lib/cn";

interface KaleidoLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: "h-7 w-7", text: "text-lg" },
  md: { icon: "h-8 w-8", text: "text-xl" },
  lg: { icon: "h-9 w-9", text: "text-xl" },
};

function KaleidoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g transform="translate(64, 64)">
        <g transform="rotate(0)">
          <path
            d="M 0,-5 C -16,-20 -15,-50 0,-62 C 15,-50 16,-20 0,-5 Z"
            fill="#F59E0B"
            opacity="0.82"
          />
        </g>
        <g transform="rotate(72)">
          <path
            d="M 0,-5 C -16,-20 -15,-50 0,-62 C 15,-50 16,-20 0,-5 Z"
            fill="#F87171"
            opacity="0.78"
          />
        </g>
        <g transform="rotate(144)">
          <path
            d="M 0,-5 C -16,-20 -15,-50 0,-62 C 15,-50 16,-20 0,-5 Z"
            fill="#8B5CF6"
            opacity="0.78"
          />
        </g>
        <g transform="rotate(216)">
          <path
            d="M 0,-5 C -16,-20 -15,-50 0,-62 C 15,-50 16,-20 0,-5 Z"
            fill="#06B6D4"
            opacity="0.78"
          />
        </g>
        <g transform="rotate(288)">
          <path
            d="M 0,-5 C -16,-20 -15,-50 0,-62 C 15,-50 16,-20 0,-5 Z"
            fill="#22C55E"
            opacity="0.78"
          />
        </g>
        <circle cx="0" cy="0" r="8" fill="#0F172A" />
        <circle cx="0" cy="0" r="3.5" fill="#F59E0B" />
      </g>
    </svg>
  );
}

export default function KaleidoLogo({
  size = "md",
  showText = true,
  className,
}: KaleidoLogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <KaleidoIcon className={cn("shrink-0", s.icon)} />
      {showText && (
        <span className={cn("font-bold gradient-text", s.text)}>Kaleido</span>
      )}
    </div>
  );
}

export { KaleidoIcon };
