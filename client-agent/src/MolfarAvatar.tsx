import { useState, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** The Vertep mark: a 12-point star with rings (same drawing as the shell's brand mark). */
export function VertepMark({ className, style }: { className?: string; style?: CSSProperties }): ReactNode {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className} style={style} fill="currentColor">
      <path d="M47.19 19.13L50 0.5L52.81 19.13Z" />
      <path d="M63 21.86L74.75 7.13L67.87 24.67Z" />
      <path d="M75.33 32.13L92.87 25.25L78.14 37Z" />
      <path d="M80.87 47.19L99.5 50L80.87 52.81Z" />
      <path d="M78.14 63L92.87 74.75L75.33 67.87Z" />
      <path d="M67.87 75.33L74.75 92.87L63 78.14Z" />
      <path d="M52.81 80.87L50 99.5L47.19 80.87Z" />
      <path d="M37 78.14L25.25 92.87L32.13 75.33Z" />
      <path d="M24.67 67.87L7.13 74.75L21.86 63Z" />
      <path d="M19.13 52.81L0.5 50L19.13 47.19Z" />
      <path d="M21.86 37L7.13 25.25L24.67 32.13Z" />
      <path d="M32.13 24.67L25.25 7.13L37 21.86Z" />
      <circle cx="50" cy="50" r="29.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M50 24L76 50L50 76L24 50Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
      <path d="M31 50Q50 33.5 69 50Q50 66.5 31 50Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="50" cy="50" r="3.4" />
    </svg>
  )
}

/** The welcome face: the avatar with the Vertep mark behind it and a brand ring. */
export function MolfarHalo({ size, className }: { size: number; className?: string }): ReactNode {
  const mark = Math.round(size * 1.9)
  return (
    <div className={cn("relative flex shrink-0 items-center justify-center", className)} style={{ width: mark, height: Math.round(size * 1.2) }}>
      <VertepMark className="text-brand/25 vertep:text-brand/45 pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: mark, height: mark }} />
      <MolfarAvatar size={size} className="relative ring-2 ring-brand/60" />
    </div>
  )
}

/** Molfar's face, round. The files are static assets of the shell (the agent
 *  page is served from the same origin): 128 px for the small sizes, 512 px
 *  for the big one on the welcome screen. With the engine offline the image
 *  fails: a plain "M" on the brand color stands in, never the alt text. */
export function MolfarAvatar(props: { size: number; className?: string }): ReactNode {
  const src = props.size > 48 ? "/client/molfar-512.webp" : "/client/molfar-128.webp"
  const [failed, setFailed] = useState(false)
  const style = { width: `${props.size}px`, height: `${props.size}px` }
  if (failed)
    return (
      <span
        role="img"
        aria-label="Molfar"
        style={{ ...style, fontSize: `${Math.round(props.size * 0.5)}px` }}
        className={`bg-brand text-brand-foreground ring-border flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 select-none ${props.className ?? ""}`}
      >
        M
      </span>
    )
  return (
    <img
      src={src}
      alt="Molfar"
      width={props.size}
      height={props.size}
      draggable={false}
      onError={() => setFailed(true)}
      className={cn("ring-border shrink-0 rounded-full object-cover ring-1", props.className)}
      style={style}
    />
  )
}
