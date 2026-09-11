"use client";

import { useEffect, useRef, useState } from "react";

const TAP_TO_CONNECT_WINDOW_MS = 30_000;

type TapResult = {
  ok: boolean;
  message: string;
  memberId?: string | null;
  memberName?: string;
  memberPhotoUrl?: string | null;
};

// Staffed-kiosk check-in, for an Android tablet running Chrome (Web NFC is
// Android-Chrome-only — there's no iOS/Safari fallback here by design, per
// the build note). Falls back to a manual UID field on any browser without
// NDEFReader, so this is still usable for testing without real hardware.
export function CheckInKiosk({ mode, eventId }: { mode: "event" | "hour"; eventId?: string }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [manualUid, setManualUid] = useState("");
  const [result, setResult] = useState<TapResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const lastTap = useRef<{ memberId: string; at: number } | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "NDEFReader" in window);
  }, []);

  async function handleTap(uid: string) {
    const res = await fetch("/api/nfc/tap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, mode, eventId }),
    });
    const data: TapResult = await res.json();
    setResult(data);

    if (data.memberId) {
      const now = Date.now();
      const prev = lastTap.current;
      if (prev && prev.memberId !== data.memberId && now - prev.at <= TAP_TO_CONNECT_WINDOW_MS) {
        await fetch("/api/nfc/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberAId: prev.memberId, memberBId: data.memberId }),
        });
        lastTap.current = null;
      } else {
        lastTap.current = { memberId: data.memberId, at: now };
      }
    }
  }

  async function startScanning() {
    setScanning(true);
    try {
      // @ts-expect-error — NDEFReader isn't in TS's lib.dom.d.ts yet.
      const reader = new window.NDEFReader();
      await reader.scan();
      reader.onreading = (event: { serialNumber: string }) => {
        void handleTap(event.serialNumber);
      };
    } catch {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex h-40 w-40 items-center justify-center rounded-full border border-grey/30 px-6">
        <span className="font-display text-lg italic leading-snug text-ink">Tap a card</span>
      </div>

      {supported && !scanning && (
        <button
          type="button"
          onClick={startScanning}
          className="rounded-md bg-orange px-5 py-3 text-sm font-medium text-ink transition hover:bg-deep-orange hover:text-paper"
        >
          Start scanning
        </button>
      )}
      {scanning && <p className="text-sm text-grey">Listening for a tap…</p>}
      {supported === false && (
        <p className="max-w-xs text-sm text-grey">
          Web NFC isn&apos;t available on this browser (Android Chrome only) — use manual entry below to test.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manualUid.trim()) void handleTap(manualUid.trim());
          setManualUid("");
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={manualUid}
          onChange={(e) => setManualUid(e.target.value)}
          placeholder="Manual UID entry"
          className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
        />
        <button
          type="submit"
          className="rounded-md border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition hover:border-grey/60"
        >
          Submit
        </button>
      </form>

      {result && (
        <div className={`rounded-md px-4 py-3 text-sm ${result.ok ? "bg-orange/10 text-ink" : "text-deep-orange"}`}>
          {result.ok && result.memberPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.memberPhotoUrl}
              alt=""
              className="mx-auto mb-2 h-12 w-12 rounded-full object-cover"
            />
          )}
          <p className="font-medium">{result.memberName ?? ""}</p>
          <p>{result.message}</p>
        </div>
      )}
    </div>
  );
}
