"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, ApiError, CheckInResult, EventItem, useSession, when } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { ArrowLeftIcon, CheckIcon } from "@/components/ui/Icons";

type Outcome = { kind: "ok" | "repeat" | "refused"; title: string; detail: string };

// BarcodeDetector is in Chromium on Android, macOS and ChromeOS; elsewhere staff type the code.
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
const noSubscribe = () => () => {};
const Barcode = () => (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;

export default function CheckInPage() {
  const session = useSession();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState("");
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  // Browser capability, read without an effect; false during prerender.
  const canScan = useSyncExternalStore(noSubscribe,
    () => Boolean(Barcode()) && Boolean(navigator.mediaDevices?.getUserMedia), () => false);
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
    const Ctor = Barcode();
    if (!Ctor) return;
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setScanning(true);
      const v = video.current!;
      v.srcObject = stream.current;
      await v.play();
      const detector = new Ctor({ formats: ["qr_code"] });
      const tick = async () => {
        if (!stream.current) return;
        const found = await detector.detect(v).catch(() => []);
        if (found[0]?.rawValue) { stopScan(); checkIn(found[0].rawValue); return; }
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      stopScan();
      setOutcome({ kind: "refused", title: "Camera unavailable", detail: "Allow camera access, or type the code instead." });
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
        <video ref={video} muted playsInline className={scanning ? "w-full rounded-md bg-black" : "hidden"} aria-label="Camera preview" />
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
