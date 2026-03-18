import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Bot, Minus, X, GripVertical } from 'lucide-react'
import { NovaChatErrorBoundary } from './nova-chat-error-boundary'
import { cn } from '@/lib/utils'

const NovaChatPanel = lazy(() =>
  import('./nova-chat-panel').then((m) => ({ default: m.NovaChatPanel }))
)

const BUBBLE_SIZE = 56
const POPUP_WIDTH = 380
const POPUP_HEIGHT = 420
const GAP = 16

interface NovaChatBubbleProps {
  userId: string
}

export function NovaChatBubble({ userId }: NovaChatBubbleProps) {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [position, setPosition] = useState({ left: GAP, bottom: GAP })
  const dragRef = useRef<{ clientX: number; clientY: number; left: number; bottom: number } | null>(null)
  const clickSuppressRef = useRef(false)

  const getContainerSize = () => {
    if (!open || minimized) return { w: BUBBLE_SIZE, h: BUBBLE_SIZE }
    return { w: POPUP_WIDTH, h: POPUP_HEIGHT + GAP + BUBBLE_SIZE }
  }

  const clampPosition = useCallback((left: number, bottom: number) => {
    if (typeof window === 'undefined') return { left, bottom }
    const { w, h } = getContainerSize()
    return {
      left: Math.max(0, Math.min(left, window.innerWidth - w)),
      bottom: Math.max(0, Math.min(bottom, window.innerHeight - h)),
    }
  }, [open, minimized])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      dragRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        left: position.left,
        bottom: position.bottom,
      }
      clickSuppressRef.current = false

      const onMove = (evt: PointerEvent) => {
        if (!dragRef.current) return
        clickSuppressRef.current = true
        const newLeft = dragRef.current.left + (evt.clientX - dragRef.current.clientX)
        const newBottom = dragRef.current.bottom + (dragRef.current.clientY - evt.clientY)
        setPosition(clampPosition(newLeft, newBottom))
      }

      const onUp = () => {
        dragRef.current = null
        setTimeout(() => {
          clickSuppressRef.current = false
        }, 0)
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.removeEventListener('pointercancel', onUp)
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.addEventListener('pointercancel', onUp)

      const el = e.target as HTMLElement
      if (typeof el.setPointerCapture === 'function') {
        el.setPointerCapture(e.pointerId)
      }
    },
    [position, clampPosition]
  )

  const handleBubbleClick = useCallback(() => {
    if (clickSuppressRef.current) return
    setOpen((o) => !o)
  }, [])

  useEffect(() => {
    setPosition((p) => clampPosition(p.left, p.bottom))
  }, [open, minimized, clampPosition])

  const size = getContainerSize()

  return (
    <div
      className="fixed z-50 flex flex-col items-start justify-end gap-3"
      style={{
        left: position.left,
        bottom: position.bottom,
        width: size.w,
        height: size.h,
      }}
    >
      {/* Popup panel (when open) - only the header bar is draggable so the form can receive clicks */}
      {open && (
        <div
          className={cn(
            'flex flex-col rounded-lg border bg-card shadow-lg overflow-hidden flex-shrink-0',
            minimized ? 'w-14 h-14' : 'w-[380px] h-[420px]'
          )}
        >
          {!minimized ? (
            <>
              <div
                className="flex items-center justify-between border-b px-3 py-2 cursor-grab active:cursor-grabbing select-none touch-none"
                onPointerDown={handlePointerDown}
              >
                <div className="flex items-center gap-1.5">
                  <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-medium">Nova</span>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setMinimized(true)}
                    aria-label="Minimize"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setOpen(false); setMinimized(false) }}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <NovaChatErrorBoundary
                  onClose={() => { setOpen(false); setMinimized(false) }}
                  closeLabel="Close"
                >
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center p-4">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    }
                  >
                    <NovaChatPanel userId={userId} variant="popup" className="h-full border-0 shadow-none" />
                  </Suspense>
                </NovaChatErrorBoundary>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-full w-full rounded-lg"
                onClick={() => setMinimized(false)}
                aria-label="Expand chat"
              >
                <Bot className="h-6 w-6 text-primary" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bubble button */}
      <Button
        size="icon"
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none',
          open && !minimized ? 'hidden' : ''
        )}
        style={{ width: BUBBLE_SIZE, height: BUBBLE_SIZE }}
        onClick={handleBubbleClick}
        onPointerDown={(e) => {
          if (open && !minimized) return
          e.stopPropagation()
          handlePointerDown(e)
        }}
        aria-label="Open Nova chat"
      >
        <Bot className="h-7 w-7" />
      </Button>
    </div>
  )
}
