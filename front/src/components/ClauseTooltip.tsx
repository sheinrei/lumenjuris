import { useLayoutEffect, useState } from "react"
import { createPortal } from "react-dom"

interface ClauseTooltipProps {
  anchorRef: React.RefObject<HTMLElement>
  open: boolean
  content: string
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export function ClauseTooltip({
  anchorRef,
  open,
  content,
  onMouseEnter,
  onMouseLeave
}: ClauseTooltipProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return

    const rect = anchorRef.current.getBoundingClientRect()

    const margin = 8
    const tooltipWidth = 320

    let left = rect.left + rect.width / 2 - tooltipWidth / 2
    left = Math.max(8, Math.min(window.innerWidth - tooltipWidth - 8, left))

    const top = rect.top - margin

    setPos({ top, left })
  }, [open, anchorRef])

  if (!open || !anchorRef.current) return null

  return createPortal(
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="
        fixed z-[9999]
        bg-gray-900 text-white text-sm
        px-3 py-2 rounded-md shadow-xl
        max-w-[320px]
        pointer-events-auto
        whitespace-pre-wrap
      "
      style={{
        top: pos.top,
        left: pos.left,
        transform: "translateY(-100%)"
      }}
    >
      {content}
    </div>,
    document.body
  )
}
