"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api, Organizer, refreshSession, useSession, when } from "@/lib/api";
import HostCard from "@/components/HostCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Field, TextareaField } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Feedback";
import { CheckIcon } from "@/components/ui/Icons";

const EMPTY = { name: "", city: "", about: "", contactEmail: "", contactPhone: "", website: "" };
type Form = typeof EMPTY;
const STEPS = ["Organisation", "Contact", "Review"] as const;

/** Become an organizer: a 3-step application, then its status (under review, needs changes, approved, suspended). */
export default function OrganizerPage() {
  const session = useSession();
  const [org, setOrg] = useState<Organizer | null | undefined>(undefined); // undefined = loading, null = never applied
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api<Organizer | undefined>("/api/organizer/me")
      .then((o) => setOrg(o ?? null))
      .catch((e) => setError((e as Error).message));
  }, [session]);

  // Approved (or reinstated) while signed in: swap the access token so the dashboard opens without signing out.
  const role = session?.user.role;
  useEffect(() => {
    if (org?.status === "APPROVED" && role === "USER") refreshSession();
  }, [org?.status, role]);

  if (!session) return null; // the route guard sends signed-out visitors to sign in
  if (role === "ADMIN") return <Notice title="You're the super admin">Create and manage events from the <Link className="underline" href="/admin">dashboard</Link>.</Notice>;
  if (role === "STAFF") return <Notice title="You're gate staff">Staff accounts scan tickets for one organizer. Ask them to remove you if you want to host your own events.</Notice>;
  if (error) return <div className="mx-auto max-w-md pt-24"><Alert>{error}</Alert></div>;
  if (org === undefined) return <div className="mx-auto max-w-2xl pt-16"><Skeleton className="h-96" /></div>;

  if (org === null || editing) {
    return <Wizard initial={org} onSaved={(o) => { setOrg(o); setEditing(false); }} onCancel={org ? () => setEditing(false) : undefined} />;
  }
  return <Status org={org} onEdit={() => setEditing(true)} />;
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md pt-24 text-center">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">{children}</p>
    </div>
  );
}

function Status({ org, onEdit }: { org: Organizer; onEdit: () => void }) {
  const badge = { PENDING: <Badge tone="warning">Under review</Badge>, APPROVED: <Badge tone="success">Approved</Badge>,
    REJECTED: <Badge tone="danger">Needs changes</Badge>, SUSPENDED: <Badge tone="danger">Suspended</Badge> }[org.status];
  return (
    <div className="mx-auto max-w-2xl pt-12">
      <p className="eyebrow">Host events on Seatlock</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{org.name}</h1>
        {badge}
      </div>

      <div className="mt-6 space-y-4">
        {org.status === "PENDING" && (
          <p className="text-muted">Thanks for applying on {when(org.createdAt, { day: "numeric", month: "short" })}. We&apos;ll email <span className="text-fg">{org.accountEmail}</span> once it&apos;s reviewed, usually within a day.</p>
        )}
        {org.status === "REJECTED" && (
          <Alert tone="warning"><span className="font-medium">Your application needs changes.</span> {org.reviewNote} Edit it below and submit again.</Alert>
        )}
        {org.status === "SUSPENDED" && (
          <Alert>Your organizer account is suspended{org.reviewNote ? `: ${org.reviewNote}` : "."} Contact Seatlock support to sort it out.</Alert>
        )}
        {org.status === "APPROVED" && (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--card-radius)] border border-success/30 bg-success-subtle px-5 py-4">
            <CheckIcon className="h-5 w-5 text-success" />
            <p className="flex-1 text-sm">You can create events, sell tickets and add gate staff.</p>
            <Button href="/admin" size="sm">Open dashboard</Button>
          </div>
        )}
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">Your public profile</h2>
      <p className="mt-1 text-sm text-muted">This is what customers see on every event you host.</p>
      <HostCard host={org} className="mt-4" />
      {org.status !== "SUSPENDED" && (
        <Button variant="secondary" className="mt-5" onClick={onEdit}>{org.status === "REJECTED" ? "Edit and resubmit" : "Edit profile"}</Button>
      )}
    </div>
  );
}

function Wizard({ initial, onSaved, onCancel }: { initial: Organizer | null; onSaved: (o: Organizer) => void; onCancel?: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(initial
    ? { name: initial.name, city: initial.city, about: initial.about, contactEmail: initial.contactEmail,
        contactPhone: initial.contactPhone, website: initial.website ?? "" }
    : EMPTY);
  const [agreed, setAgreed] = useState(initial !== null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  // Same rules as the API, so mistakes show up on the step where they happen.
  const problem = (s: number): string | null => {
    if (s === 0) {
      if (form.name.trim().length < 2) return "Add your organisation's name.";
      if (!form.city.trim()) return "Add the city you're based in.";
      if (form.about.trim().length < 20) return "Tell customers a bit more about you (at least 20 characters).";
    }
    if (s === 1) {
      if (!/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) return "Add a valid contact email.";
      if (!/^\+?[0-9 ()-]{7,20}$/.test(form.contactPhone.trim())) return "Add a valid phone number, e.g. +91 98765 43210.";
      if (form.website.trim() && !/^https?:\/\/\S+$/.test(form.website.trim())) return "Websites start with https:// (or leave it empty).";
    }
    return null;
  };

  const next = (e: FormEvent) => {
    e.preventDefault();
    const p = problem(step);
    setError(p);
    if (!p) setStep(step + 1);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError("Please confirm the organizer terms."); return; }
    setBusy(true);
    setError(null);
    try {
      onSaved(await api<Organizer>("/api/organizer/me", { method: "PUT", body: JSON.stringify(form) }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const preview = { id: 0, ...form, website: form.website.trim() || null };

  return (
    <div className="mx-auto max-w-2xl pt-12">
      <p className="eyebrow">Host events on Seatlock</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{initial ? "Edit your organizer profile" : "Become an organizer"}</h1>
      <p className="mt-2 text-muted">Sell tickets with live seat maps, QR check-in and automatic refunds. We review every organizer before their events go on sale.</p>

      <ol className="mt-8 flex gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className="flex flex-1 flex-col gap-1.5">
            <span className={`h-1 rounded-full ${i <= step ? "bg-accent" : "bg-sunken"}`} />
            <span className={`text-xs ${i === step ? "font-medium text-fg" : "text-subtle"}`}>{i + 1}. {label}</span>
          </li>
        ))}
      </ol>

      <form onSubmit={step < 2 ? next : submit} noValidate className="mt-8 space-y-5 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        {error && <Alert>{error}</Alert>}

        {step === 0 && (
          <>
            <Field label="Organisation name" required maxLength={80} value={form.name} onChange={set("name")} autoFocus
              hint="Shown as “Hosted by …” on your events. It must be unique on Seatlock." />
            <Field label="City" required maxLength={60} value={form.city} onChange={set("city")} hint="Where you're based." />
            <TextareaField label="About you" required maxLength={600} rows={5} value={form.about} onChange={set("about")}
              hint={`What kind of events you run and why people come back. ${form.about.trim().length}/600, at least 20.`} />
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-muted">Customers use these to reach you about your events, so they&apos;re shown publicly.</p>
            <Field label="Contact email" type="email" required maxLength={120} value={form.contactEmail} onChange={set("contactEmail")} autoFocus autoComplete="email" />
            <Field label="Contact phone" type="tel" required maxLength={20} value={form.contactPhone} onChange={set("contactPhone")} autoComplete="tel" placeholder="+91 98765 43210" />
            <Field label="Website (optional)" type="url" maxLength={200} value={form.website} onChange={set("website")} placeholder="https://" />
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-muted">This is how customers will see you on your events.</p>
            <HostCard host={preview} />
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--sl-accent)]" />
              <span>I&apos;m allowed to sell tickets for the events I list. If I cancel an event, every ticket holder is refunded in full.</span>
            </label>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div>
            {step > 0 ? <Button type="button" variant="ghost" onClick={() => { setError(null); setStep(step - 1); }}>Back</Button>
              : onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
          </div>
          <Button type="submit" disabled={busy}>
            {step < 2 ? "Continue" : busy ? "Submitting…" : initial?.status === "APPROVED" ? "Save profile" : "Submit application"}
          </Button>
        </div>
      </form>
    </div>
  );
}
