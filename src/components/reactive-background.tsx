import { useEffect, useRef } from 'react'

/**
 * Live, reactive background: follows cursor/touch with a soft spotlight,
 * responds to taps/clicks with a ripple, and keeps floating orbs with parallax.
 * Uses rAF + CSS variables so movement stays at 60fps without React re-renders.
 */
export function ReactiveBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef({ x: 0.5, y: 0.5 })
  const smoothRef = useRef({ x: 0.5, y: 0.5 })
  const scrollRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const setPointer = (clientX: number, clientY: number) => {
      cursorRef.current = {
        x: clientX / window.innerWidth,
        y: clientY / window.innerHeight,
      }
    }

    const handleMove = (e: MouseEvent) => setPointer(e.clientX, e.clientY)
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        setPointer(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleScroll = () => {
      scrollRef.current = window.scrollY
    }

    const handleTap = (clientX: number, clientY: number) => {
      const ripple = document.createElement('div')
      ripple.setAttribute('aria-hidden', 'true')
      ripple.className = 'reactive-background-ripple'
      const x = (clientX / window.innerWidth) * 100
      const y = (clientY / window.innerHeight) * 100
      ripple.style.left = `${x}%`
      ripple.style.top = `${y}%`
      container.appendChild(ripple)
      requestAnimationFrame(() => ripple.classList.add('reactive-background-ripple--active'))
      setTimeout(() => ripple.remove(), 700)
    }

    const isInteractive = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      const role = el.getAttribute('role')
      const tag = el.tagName.toLowerCase()
      return el.closest('a, button, [role="button"], input, select, textarea, [contenteditable="true"]') != null || tag === 'a' || tag === 'button' || role === 'button'
    }

    const handleClick = (e: MouseEvent) => {
      if (!isInteractive(e.target)) handleTap(e.clientX, e.clientY)
    }
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0 && !isInteractive(e.target)) handleTap(e.touches[0].clientX, e.touches[0].clientY)
    }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const tick = () => {
      const cur = cursorRef.current
      const smooth = smoothRef.current
      const scroll = scrollRef.current

      smoothRef.current = {
        x: lerp(smooth.x, cur.x, 0.08),
        y: lerp(smooth.y, cur.y, 0.08),
      }

      const { x, y } = smoothRef.current
      const scrollFactor = Math.min(scroll / 800, 0.15)

      container.style.setProperty('--cursor-x', `${x}`)
      container.style.setProperty('--cursor-y', `${y}`)
      container.style.setProperty('--scroll-y', `${scrollFactor}`)

      rafRef.current = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    window.addEventListener('touchmove', handleTouch, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('click', handleClick, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchmove', handleTouch)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('touchstart', handleTouchStart)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="reactive-background pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        ['--cursor-x' as string]: '0.5',
        ['--cursor-y' as string]: '0.5',
        ['--scroll-y' as string]: '0',
      }}
      aria-hidden
    >
      {/* Base */}
      <div className="absolute inset-0 bg-[var(--background)]" />

      {/* Cursor/touch spotlight – follows pointer smoothly */}
      <div
        className="reactive-background-spotlight absolute inset-0 opacity-[0.5] dark:opacity-[0.35]"
        style={{
          background: `
            radial-gradient(
              ellipse 80vmax 60vmax at calc(var(--cursor-x) * 100%) calc(var(--cursor-y) * 100%),
              var(--primary) 0%,
              transparent 50%
            )
          `,
        }}
      />

      {/* Secondary softer glow that lags a bit more */}
      <div
        className="absolute inset-0 opacity-[0.25] dark:opacity-[0.15]"
        style={{
          background: `
            radial-gradient(
              ellipse 120vmax 80vmax at calc(var(--cursor-x) * 100%) calc(var(--cursor-y) * 100%),
              var(--accent) 0%,
              transparent 55%
            )
          `,
        }}
      />

      {/* Static gradient mesh for depth */}
      <div
        className="absolute inset-0 opacity-[0.3] dark:opacity-[0.2]"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 20%, var(--primary) 0%, transparent 50%),
            radial-gradient(ellipse 100% 100% at 80% 80%, var(--primary) 0%, transparent 45%),
            radial-gradient(ellipse 80% 120% at 50% 50%, var(--muted) 0%, transparent 50%)
          `,
        }}
      />

      {/* Floating orbs – parallax with cursor + scroll */}
      <div
        className="reactive-background-orb absolute -left-[20%] top-[10%] h-[55vmax] w-[55vmax] rounded-full opacity-[0.14] blur-3xl dark:opacity-[0.09]"
        style={{
          background: 'var(--primary)',
          transform: `
            translate(
              calc(-20% + (var(--cursor-x) - 0.5) * 12% + var(--scroll-y) * 20%),
              calc(-10% + (var(--cursor-y) - 0.5) * 10%)
            )
            scale(1)
          `,
          animation: 'float-1 22s ease-in-out infinite',
        }}
      />
      <div
        className="reactive-background-orb absolute -right-[15%] bottom-[5%] h-[45vmax] w-[45vmax] rounded-full opacity-[0.12] blur-3xl dark:opacity-[0.07]"
        style={{
          background: 'var(--primary)',
          transform: `
            translate(
              calc(15% - (var(--cursor-x) - 0.5) * 10% - var(--scroll-y) * 15%),
              calc(10% - (var(--cursor-y) - 0.5) * 12%)
            )
          `,
          animation: 'float-2 26s ease-in-out infinite',
        }}
      />
      <div
        className="reactive-background-orb absolute left-1/2 top-1/2 h-[35vmax] w-[35vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.1] blur-3xl dark:opacity-[0.06]"
        style={{
          background: 'var(--accent)',
          transform: `
            translate(
              calc(-50% + (var(--cursor-x) - 0.5) * 6%),
              calc(-50% + (var(--cursor-y) - 0.5) * 6%)
            )
            scale(1)
          `,
          animation: 'float-3 18s ease-in-out infinite',
        }}
      />

      {/* Tap/click ripple – rendered by JS, styled in CSS */}
      {/* Ripples are inserted in handleTap */}

      {/* Subtle grid */}
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
