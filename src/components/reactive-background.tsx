import { useEffect, useState } from 'react'

/**
 * Abstract reactive background using theme CSS variables.
 * Renders floating gradient orbs that drift slowly and shift subtly with mouse movement.
 */
export function ReactiveBackground() {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMouse((m) => ({
        x: 0.85 * m.x + 0.15 * (e.clientX / window.innerWidth),
        y: 0.85 * m.y + 0.15 * (e.clientY / window.innerHeight),
      }))
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Base + gradient mesh */}
      <div
        className="absolute inset-0"
        style={{ background: 'var(--background)' }}
      />
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
        style={{
          background: `
            radial-gradient(
              ellipse 120% 80% at 20% 20%,
              var(--primary) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 100% 100% at 80% 80%,
              var(--primary) 0%,
              transparent 45%
            ),
            radial-gradient(
              ellipse 80% 120% at 50% 50%,
              var(--muted) 0%,
              transparent 50%
            )
          `,
        }}
      />

      {/* Floating orbs – theme colors, slow drift, subtle mouse parallax */}
      <div
        className="absolute -left-[20%] top-[10%] h-[60vmax] w-[60vmax] rounded-full opacity-[0.12] blur-3xl dark:opacity-[0.08]"
        style={{
          background: 'var(--primary)',
          ['--f1-x' as string]: '-20%',
          ['--f1-y' as string]: '-10%',
          ['--f1-s' as string]: '1',
          transform: `translate(
            calc(var(--f1-x) + ${(mouse.x - 0.5) * 8}%),
            calc(var(--f1-y) + ${(mouse.y - 0.5) * 6}%)
          ) scale(var(--f1-s))`,
          animation: 'float-1 22s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -right-[15%] bottom-[5%] h-[50vmax] w-[50vmax] rounded-full opacity-[0.1] blur-3xl dark:opacity-[0.06]"
        style={{
          background: 'var(--primary)',
          ['--f2-x' as string]: '15%',
          ['--f2-y' as string]: '10%',
          transform: `translate(
            calc(var(--f2-x) - ${(mouse.x - 0.5) * 6}%),
            calc(var(--f2-y) - ${(mouse.y - 0.5) * 8}%)
          )`,
          animation: 'float-2 26s ease-in-out infinite',
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[40vmax] w-[40vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08] blur-3xl dark:opacity-[0.05]"
        style={{
          background: 'var(--accent)',
          ['--f3-s' as string]: '1',
          transform: `translate(
            calc(-50% + ${(mouse.x - 0.5) * 4}%),
            calc(-50% + ${(mouse.y - 0.5) * 4}%)
          ) scale(var(--f3-s))`,
          animation: 'float-3 18s ease-in-out infinite',
        }}
      />

      {/* Very subtle grid for depth */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(var(--foreground) 1px, transparent 1px),
            linear-gradient(90deg, var(--foreground) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  )
}
