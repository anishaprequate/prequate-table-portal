"use client";

import { useCallback, useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { useToast } from "@/components/toast";
import { savePushSubscription, removePushSubscription } from "@/lib/actions/push";

// States of notifications on this device:
//   checking     not known yet
//   unsupported  this browser cannot receive them
//   install      iPhone, in Safari: only an app added to the home screen can
//   blocked      the member said no in the phone's settings
//   ready        can be turned on with one tap
//   on           turned on
type State = "checking" | "unsupported" | "install" | "blocked" | "ready" | "on";

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function keyToBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function usePush() {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    try {
      if (isIOS() && !isStandalone()) return setState("install");
      if (!pushSupported()) return setState("unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "on" : "ready");
    } catch {
      setState("unsupported");
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // Must run from a tap: iPhone refuses the permission prompt otherwise.
  async function enable(): Promise<boolean> {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "ready");
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key.trim()) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
      setState(res.ok ? "on" : "ready");
      return res.ok;
    } catch {
      setState("ready");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("ready");
    } finally {
      setBusy(false);
    }
  }

  return { state, busy, enable, disable };
}

// The three steps, in the words an iPhone uses.
export function InstallSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet open onClose={onClose} title="Add The Table to your home screen">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-taupe">
          Do this once, and The Table opens like an app. It is also what lets your iPhone send you the few notifications that matter.
        </p>
        <ol className="flex flex-col gap-4 text-sm text-ink">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-foil/15 text-xs">1</span>
            <span>
              In Safari, tap the <strong className="font-medium">Share</strong> button, the square with an arrow, at the bottom of the screen.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-foil/15 text-xs">2</span>
            <span>
              Scroll down and tap <strong className="font-medium">Add to Home Screen</strong>, then <strong className="font-medium">Add</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-foil/15 text-xs">3</span>
            <span>
              Open <strong className="font-medium">The Table</strong> from your home screen. You will be asked once if you want notifications.
            </span>
          </li>
        </ol>
        <button type="button" onClick={onClose} className="btn-primary tap w-full">
          Got it
        </button>
      </div>
    </Sheet>
  );
}

// Settings: notifications on this device.
export function NotificationControls() {
  const { state, busy, enable, disable } = usePush();
  const toast = useToast();
  const [guide, setGuide] = useState(false);

  const line: Record<State, string> = {
    checking: "Checking this device…",
    unsupported: "This browser cannot receive notifications.",
    install: "On iPhone, notifications need The Table on your home screen first.",
    blocked: "Notifications are blocked. Turn them on for The Table in your phone's Settings.",
    ready: "Off on this device.",
    on: "On for this device.",
  };

  return (
    <div className="card mb-8 p-5">
      <p className="mb-2 text-xs uppercase tracking-[0.28em] text-taupe">Notifications on this device</p>
      <p className="mb-4 text-sm text-taupe" aria-live="polite">
        {line[state]}
      </p>
      {state === "install" && (
        <button type="button" onClick={() => setGuide(true)} className="btn-secondary tap w-full">
          Show me how
        </button>
      )}
      {state === "ready" && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => toast((await enable()) ? "Notifications are on." : "Notifications stayed off.")}
          className="btn-primary tap w-full disabled:opacity-60"
        >
          {busy ? "Turning on…" : "Allow notifications"}
        </button>
      )}
      {state === "on" && (
        <button type="button" disabled={busy} onClick={async () => { await disable(); toast("Notifications are off on this device."); }} className="btn-secondary tap w-full">
          Turn off on this device
        </button>
      )}
      <p className="mt-4 text-xs text-taupe">
        A few, well timed: invitations, changes to your Hour, a partner&apos;s note, and the day before an event.
      </p>
      {guide && <InstallSheet onClose={() => setGuide(false)} />}
    </div>
  );
}

const seenKey = "pq-install-guide";
const laterKey = "pq-notify-later";

// Home: after first login, an iPhone in Safari is shown how to add the app, up to
// twice. Once it is installed (or on a browser that can already do push), a quiet
// card offers to turn notifications on.
export function HomeNudge() {
  const { state, busy, enable } = usePush();
  const toast = useToast();
  const [guide, setGuide] = useState(false);
  const [hideCard, setHideCard] = useState(true);

  useEffect(() => {
    try {
      if (state === "install") {
        const seen = Number(localStorage.getItem(seenKey) ?? 0);
        if (seen < 2) {
          localStorage.setItem(seenKey, String(seen + 1));
          setGuide(true);
        }
      }
      if (state === "ready") {
        const later = Number(localStorage.getItem(laterKey) ?? 0);
        setHideCard(Date.now() - later < 14 * 24 * 3_600_000);
      }
    } catch {
      /* storage can be blocked; the Settings card still works */
    }
  }, [state]);

  return (
    <>
      {guide && <InstallSheet onClose={() => setGuide(false)} />}
      {state === "ready" && !hideCard && (
        <div className="card mb-8 flex flex-col gap-3 p-5">
          <p className="text-sm text-ink">Would you like a nudge for the things that matter: invitations, changes to your Hour, a partner&apos;s note?</p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const ok = await enable();
                toast(ok ? "Notifications are on." : "Notifications stayed off.");
              }}
              className="btn-primary tap flex-1 disabled:opacity-60"
            >
              Turn on
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(laterKey, String(Date.now()));
                } catch {
                  /* ignore */
                }
                setHideCard(true);
              }}
              className="btn-ghost tap flex-1"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
