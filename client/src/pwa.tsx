/** Installing the shell as an app (#56). The engine serves the manifest and
 *  the service worker at the root (src/server/app.ts); this module registers
 *  the worker, keeps the browser's install offer, and explains the way to
 *  install where the browser has no button of its own (iPhone, plain http). */
import { useEffect, useState } from "react"
import { ModalDialog, Dialog } from "./ui/dialog"
import { Button } from "./ui/button"
import { tr } from "./i18n/index"

const HTTPS_GUIDE = "https://github.com/MolfarWav/Molfar.Vertep/blob/main/README.md#install-as-an-app"

/** Chromium's install offer (not in the DOM typings). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let offer: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const changed = () => {
  for (const l of listeners) l()
}

/** Register the worker and start listening for the install offer. Called once,
 *  before the shell renders, so an early offer is not missed. */
export function setupPwa(): void {
  if (typeof window === "undefined") return
  window.addEventListener("beforeinstallprompt", (e) => {
    // keep it for the menu's button instead of the browser's mini bar
    e.preventDefault()
    offer = e as InstallPromptEvent
    changed()
  })
  window.addEventListener("appinstalled", () => {
    offer = null
    changed()
  })
  // a worker needs a secure page (https or localhost); the shell works without one
  if (window.isSecureContext && "serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined)
  }
}

/** True when the shell runs as an installed app (its own window, no browser bar). */
export function runningInstalled(): boolean {
  if (typeof window === "undefined") return false
  const standalone = ["standalone", "fullscreen", "minimal-ui"].some((m) => window.matchMedia?.(`(display-mode: ${m})`).matches)
  return standalone || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

const isIos = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

/** How this browser installs the shell: its own offer, the iOS Share sheet,
 *  nothing until the page is on https, or the browser's own menu. */
export type InstallWay = "installed" | "offer" | "ios" | "insecure" | "menu"

export function installWay(): InstallWay {
  if (runningInstalled()) return "installed"
  if (offer) return "offer"
  if (isIos()) return "ios"
  if (!window.isSecureContext) return "insecure"
  return "menu"
}

export function useInstallWay(): InstallWay {
  const [way, setWay] = useState(installWay)
  useEffect(() => {
    const update = () => setWay(installWay())
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])
  return way
}

/** The browser's own install dialog, when it offered one. False when there is
 *  none, so the caller shows the guide instead. */
export async function promptInstall(): Promise<boolean> {
  const e = offer
  if (!e) return false
  // an offer can be used once
  offer = null
  changed()
  await e.prompt().catch(() => undefined)
  return true
}

/** How to install where the browser has no button for it. */
export function InstallDialog(props: { open: boolean; onClose: () => void }) {
  const way = installWay()
  const insecure = !window.isSecureContext
  return (
    <ModalDialog open={props.open} onClose={props.onClose}>
      <Dialog title={tr("Install Molfar Vertep")}>
        <div className="flex min-w-0 flex-col gap-3 p-4 text-13 leading-5 text-ink">
          {way === "ios" ? <p>{tr("In Safari, tap Share, then Add to Home Screen. Molfar Vertep then opens from its icon, full screen, without the browser's bar.")}</p> : null}
          {way === "menu" ? <p>{tr("Open your browser's menu and choose Install app or Add to Home screen. If neither is there, Molfar Vertep is already installed or this browser cannot install apps.")}</p> : null}
          {insecure ? <div className="flex flex-col gap-1.5 rounded-md border border-warning bg-warning-soft p-2.5">
              <p>{tr("Browsers install apps only from a secure address (https). This page is open at {address}, so the browser offers no install.", { address: location.origin })}</p>
              <p className="text-ink-muted">{tr("Open Molfar Vertep at an https address. The guide shows two ways: Tailscale, or a certificate of your own.")}</p>
              <a href={HTTPS_GUIDE} target="_blank" rel="noreferrer noopener" className="self-start text-accent hover:underline">{tr("How to get https")}</a>
            </div> : null}
          <div className="flex justify-end">
            <Button variant="neutral" size="normal" onClick={props.onClose}>{tr("Got it")}</Button>
          </div>
        </div>
      </Dialog>
    </ModalDialog>
  )
}
