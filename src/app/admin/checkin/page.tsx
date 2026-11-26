"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import jsQR from "jsqr";
import { makeConfirmer, viewfinderCrop } from "@/lib/scan";
import { api, ApiError, CheckInResult, EventItem, useSession, when } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { ArrowLeftIcon, CheckIcon, XIcon } from "@/components/ui/Icons";

type Outcome = { kind: "ok" | "repeat" | "refused"; title: string; detail: string };

// The native BarcodeDetector exists in Chromium on Android, macOS and ChromeOS. Everywhere else
// (Windows Chrome/Edge, Firefox, Safari) camera frames are decoded with jsQR instead.
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
const noSubscribe = () => () => {};
const Barcode = () => (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
const MAX_CROP = 480; // decode the viewfinder crop at most this wide: plenty for a QR filling the square, and fast

export default function CheckInPage() {
  const session = useSession();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState("");
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  // Any browser with a camera API on HTTPS/localhost can scan now; false during prerender.
  const canScan = useSyncExternalStore(noSubscribe,
    () => window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia), () => false);
  const video = useRef<HTMLVideoElement>(null);
  const square = useRef<HTMLDivElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (session?.user.role !== "ADMIN") return;
    api<EventItem[]>("/api/events").then(setEvents).catch(() => setEvents([]));
  }, [session]);

  const checkIn = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setBusy(true);
    try {
      const r = await api<CheckInResult>("/api/admin/checkin", {
        method: "POST", body: JSON.stringify({ code: value, eventId: eventId ? Number(eventId) : null }),
      });
      const who = `${r.holder} · seats ${r.seats.join(", ")} · ${r.eventTitle}`;
      setOutcome(r.result === "ADMITTED"
        ? { kind: "ok", title: "Admit", detail: who }
        : { kind: "repeat", title: `Already used at ${when(r.checkedInAt, { hour: "numeric", minute: "2-digit" })}`, detail: who });
      setCode("");
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setOutcome({ kind: "refused", title: status === 404 ? "Unknown ticket" : "Don't admit", detail: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }, [eventId]);

  const stopScan = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setScanning(false);
  };

  const startScan = async () => {
    setOutcome(null);
    try {
      // Back camera on phones; laptops fall back to their only camera.
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      setScanning(true);
      const v = video.current!;
      v.srcObject = stream.current;
      await v.play();

      const Native = Barcode();
      const detector = Native ? new Native({ formats: ["qr_code"] }) : null;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const confirm = makeConfirmer(2);

      // Decode only what's inside the on-screen square: a QR code elsewhere in view is ignored.
      const readFrame = async (): Promise<string | null> => {
        const box = square.current;
        if (!ctx || !box || v.readyState < 2 || !v.videoWidth) return null;
        const { sx, sy, sw, sh } = viewfinderCrop(v.getBoundingClientRect(), box.getBoundingClientRect(), v.videoWidth, v.videoHeight);
        if (sw < 40 || sh < 40) return null;
        const scale = Math.min(1, MAX_CROP / sw);
        canvas.width = Math.round(sw * scale);
        canvas.height = Math.round(sh * scale);
        ctx.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        if (detector) return (await detector.detect(canvas).catch(() => []))[0]?.rawValue ?? null;
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" })?.data ?? null;
      };

      const tick = async () => {
        if (!stream.current) return; // stopped
        // Submit only after two consecutive frames agree: no accidental reads of a code passing by.
        const text = confirm(await readFrame());
        if (text) { stopScan(); checkIn(text); return; }
        requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      stopScan();
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setOutcome({
        kind: "refused", title: denied ? "Camera blocked" : "No camera found",
        detail: denied ? "Allow camera access for this site in the browser's address bar, then press Scan QR again." : "Type the ticket code instead.",
      });
    }
  };

  useEffect(() => stopScan, []);

  if (session?.user.role !== "ADMIN") {
    return <div className="mx-auto max-w-md pt-24"><Alert tone="warning">This page is for admins.</Alert></div>;
  }

  const submit = (e: FormEvent) => { e.preventDefault(); checkIn(code); };
  const tone = outcome?.kind === "ok" ? "border-success/40 bg-success-subtle text-success"
    : outcome?.kind === "repeat" ? "border-warning/40 bg-warning-subtle text-warning" : "border-danger/40 bg-danger-subtle text-danger";

  return (
    <div className="mx-auto max-w-lg pt-10">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeftIcon /> Manage events</Link>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Check in</h1>
      <p className="mt-2 text-muted">Scan the QR on a ticket or type its code. Each ticket gets in once.</p>

      <form onSubmit={submit} className="mt-8 space-y-4 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <SelectField label="Event" value={eventId} onChange={(e) => setEventId(e.target.value)} hint="Optional: also rejects tickets for other events.">
          <option value="">Any event</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
        </SelectField>
        <Field label="Ticket code" name="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SL-XXXXXXXX" autoComplete="off" spellCheck={false} className="font-mono" />
        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={busy || !code.trim()}>{busy ? "Checking…" : "Check in"}</Button>
          {canScan && (scanning
            ? <Button type="button" variant="secondary" onClick={stopScan}>Stop camera</Button>
            : <Button type="button" variant="secondary" onClick={startScan}>Scan QR</Button>)}
        </div>
      </form>

      {/* Full-screen scanner: the camera fills the screen, like a phone's camera app. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scan a ticket QR code"
        className={scanning ? "fixed inset-0 z-[60] bg-black" : "hidden"}
        onKeyDown={(e) => { if (e.key === "Escape") stopScan(); }}
      >
        <video ref={video} muted playsInline className="h-full w-full object-cover" aria-label="Camera preview" />

        {/* Viewfinder: everything outside the square is darkened; corner brackets mark the read area */}
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          <div ref={square} className="relative aspect-square w-[68vmin] max-w-80 rounded-2xl shadow-[0_0_0_9999px_rgb(0_0_0/0.6)]">
            {["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl",
              "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl"].map((c) => (
              <span key={c} className={`absolute h-10 w-10 border-white ${c}`} />
            ))}
            <span className="scan-line absolute inset-x-4 h-0.5 rounded-full bg-[var(--vermilion-400)] shadow-[0_0_12px_var(--vermilion-400)]" />
          </div>
        </div>

        {/* Top bar: solid, so the title and close button stay readable on any camera image */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-black/75 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white backdrop-blur-sm">
          <div>
            <p className="font-display text-lg font-semibold leading-tight">Scan ticket</p>
            <p className="text-xs text-white/70">{eventId ? events.find((e) => String(e.id) === eventId)?.title : "Any event"}</p>
          </div>
          <button
            type="button"
            onClick={stopScan}
            autoFocus
            aria-label="Close scanner"
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-neutral-900 shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <XIcon className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Bottom panel: instruction plus explicit ways out */}
        <div className="absolute inset-x-0 bottom-0 bg-black/75 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-white backdrop-blur-sm">
          <p className="text-[15px] font-medium" aria-live="polite">Fit the QR code inside the square</p>
          <p className="mt-1 text-xs text-white/70">Codes outside the square are ignored.</p>
          <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { stopScan(); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[name="code"]')?.focus()); }}
              className="h-11 rounded-[var(--button-radius)] border border-white/40 text-sm font-medium transition-colors hover:bg-white/10"
            >
              Type code instead
            </button>
            <button
              type="button"
              onClick={stopScan}
              className="h-11 rounded-[var(--button-radius)] bg-white text-sm font-semibold text-neutral-900 transition-colors hover:bg-white/90"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {outcome && (
        <div role="status" aria-live="assertive" className={`mt-6 flex items-start gap-3 rounded-[var(--card-radius)] border p-5 ${tone}`}>
          {outcome.kind === "ok" && <CheckIcon className="mt-1 h-6 w-6 shrink-0" />}
          <div>
            <p className="font-display text-2xl font-semibold">{outcome.title}</p>
            <p className="mt-1 text-sm">{outcome.detail}</p>
          </div>
        </div>
      )}
    </div>
  );
}
