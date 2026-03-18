import { cn } from '@/lib/utils'

interface NovarynLogoProps {
  className?: string
  showText?: boolean
}

export function NovarynLogo({ className, showText = false }: NovarynLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="8"
          className="fill-primary"
        />
        <path
          d="M12 28V12L20 24L28 12V28"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-primary-foreground"
        />
        <circle
          cx="20"
          cy="14"
          r="3"
          className="fill-primary-foreground"
        />
      </svg>
      {showText && (
        <span className="text-xl font-bold tracking-tight">Novaryn</span>
      )}
    </div>
  )
}
