import { useState, type ReactNode } from "react"

/** Molfar's face, round. The files are static assets of the shell (the agent
 *  page is served from the same origin): 128 px for the small sizes, 512 px
 *  for the big one on the welcome screen. With the engine offline the image
 *  fails: a plain "M" on the primary color stands in, never the alt text. */
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
        className={`bg-primary text-primary-foreground ring-border flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 select-none ${props.className ?? ""}`}
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
      className={`shrink-0 rounded-full object-cover ring-1 ring-border ${props.className ?? ""}`}
      style={style}
    />
  )
}
