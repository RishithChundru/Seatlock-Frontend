"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import jsQR from "jsqr";
import { api, ApiError, CheckInResult, EventItem, useSession, when } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { ArrowLeftIcon, CheckIcon } from "@/components/ui/Icons";

type Outcome = { kind: "ok" | "repeat" | "refused"; title: string; detail: string };

// The native BarcodeDetector exists in Chromium on Android, macOS and ChromeOS. Everywhere else
// (Windows Chrome/Edge, Firefox, Safari) camera frames are decoded with jsQR instead.
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
const noSubscribe = () => () => {};
const Barcode = () => (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
const MAX_FRAME_WIDTH = 640; // decode a downscaled frame: plenty for a QR held up to the camera, and fast

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

      const readFrame = async (): Promise<string | null> => {
        if (detector) return (await detector.detect(v).catch(() => []))[0]?.rawValue ?? null;
        if (!ctx || v.readyState < 2 || !v.videoWidth) return null;
        const scale = Math.min(1, MAX_FRAME_WIDTH / v.videoWidth);
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" })?.data ?? null;
      };

      const tick = async () => {
        if (!stream.current) return; // stopped
        const text = await readFrame();
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
        <Field label="Ticket code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SL-XXXXXXXX" autoComplete="off" spellCheck={false} className="font-mono" />
        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={busy || !code.trim()}>{busy ? "Checking…" : "Check in"}</Button>
          {canScan && (scanning
            ? <Button type="button" variant="secondary" onClick={stopScan}>Stop camera</Button>
            : <Button type="button" variant="secondary" onClick={startScan}>Scan QR</Button>)}
        </div>
        <div className={scanning ? "relative overflow-hidden rounded-md bg-black" : "hidden"}>
          <video ref={video} muted playsInline className="block w-full" aria-label="Camera preview" />
          {/* Viewfinder: where to hold the ticket */}
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="aspect-square w-3/5 max-w-60 rounded-lg border-2 border-white/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]" />
          </div>
          <p className="absolute inset-x-0 bottom-2 text-center text-xs text-white/90" aria-live="polite">Hold the ticket&apos;s QR code inside the square</p>
        </div>
      </form>

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
