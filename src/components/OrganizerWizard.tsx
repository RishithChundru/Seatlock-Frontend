"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, Organizer, setSession, User } from "@/lib/api";
import HostCard, { initialsOf } from "@/components/HostCard";
import Button, { buttonClass } from "@/components/ui/Button";
import { UploadIcon } from "@/components/ui/Icons";
import { controlClass, Field, PasswordField, TextareaField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";

const EMPTY = { name: "", city: "", about: "", contactEmail: "", phone: "", website: "" };
const ACCOUNT = { accountName: "", email: "", password: "" };
type Form = typeof EMPTY & typeof ACCOUNT;
const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_LOGO_BYTES = 1024 * 1024;

/** "+91 98765 43210" -> "9876543210" (the national part the input edits). */
const national = (p: string) => p.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");

/**
 * Organizer application. signup: creates the organizer account too (separate from customer accounts).
 * Otherwise edits an existing organizer's profile, or fixes a rejected application.
 */
export default function OrganizerWizard({ signup = false, initial = null, onSaved, onCancel }: {
  signup?: boolean;
  initial?: Organizer | null;
  onSaved: (o: { organizer?: Organizer; user?: User }) => void;
  onCancel?: () => void;
}) {
  const steps = signup ? ["Account", "Organisation", "Contact", "Review"] : ["Organisation", "Contact", "Review"];
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    ...ACCOUNT,
    ...(initial ? { name: initial.name, city: initial.city, about: initial.about, contactEmail: initial.contactEmail,
      phone: national(initial.contactPhone), website: initial.website ?? "" } : EMPTY),
  });
  // Logo (optional): a picked file (uploaded after the profile is saved), or removal of the current one.
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logoUrl ?? null);
  const [agreed, setAgreed] = useState(initial !== null);
  useEffect(() => () => { if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) { setError("Logos must be JPEG, PNG or WebP."); return; }
    if (file.size > MAX_LOGO_BYTES) { setError("That logo is over 1 MB. Try a smaller one."); return; }
    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };
  const clearLogo = () => { setLogoFile(null); setLogoPreview(null); };

  /** After the profile is saved: send the new logo, or remove the old one. Returns the latest profile, if any. */
  const saveLogo = async (): Promise<Organizer | undefined> => {
    if (logoFile) {
      const body = new FormData();
      body.append("file", logoFile);
      return api<Organizer>("/api/organizer/me/logo", { method: "POST", body });
    }
    if (!logoPreview && initial?.logoUrl) return api<Organizer>("/api/organizer/me/logo", { method: "DELETE" });
  };
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const section = steps[step];
  const last = step === steps.length - 1;

  // Same rules as the API, so mistakes show up on the step where they happen.
  const problem = (): string | null => {
    if (section === "Account") {
      if (!form.accountName.trim()) return "Add your name.";
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Add a valid email to sign in with.";
      if (form.password.length < 8) return "Use a password of at least 8 characters.";
    }
    if (section === "Organisation") {
      if (form.name.trim().length < 2) return "Add your organisation's name.";
      if (!form.city.trim()) return "Add the city you're based in.";
      if (form.about.trim().length < 20) return "Tell customers a bit more about you (at least 20 characters).";
    }
    if (section === "Contact") {
      if (!/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) return "Add a valid contact email.";
      if (!/^[6-9]\d{9}$/.test(form.phone)) return "Enter a 10-digit Indian mobile number (starts with 6, 7, 8 or 9).";
      if (form.website.trim() && !/^https?:\/\/\S+$/.test(form.website.trim())) return "Websites start with https:// (or leave it empty).";
    }
    return null;
  };

  const organizer = () => ({
    name: form.name, city: form.city, about: form.about, contactEmail: form.contactEmail,
    contactPhone: `+91 ${form.phone.slice(0, 5)} ${form.phone.slice(5)}`, website: form.website,
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!last) {
      const p = problem();
      setError(p);
      if (!p) setStep(step + 1);
      return;
    }
    if (!agreed) { setError("Please confirm the organizer terms."); return; }
    setBusy(true);
    setError(null);
    try {
      if (signup) {
        const res = await api<{ user: User }>("/api/auth/register-organizer", {
          method: "POST",
          body: JSON.stringify({ account: { name: form.accountName, email: form.email, password: form.password }, organizer: organizer() }),
        });
        setSession({ user: res.user });
        setForm({ ...form, password: "" }); // don't leave it in memory on a kept-alive page
        // The account exists now; a failed logo upload shouldn't undo that. It can be added later from Edit profile.
        await saveLogo().catch(() => undefined);
        onSaved({ user: res.user });
      } else {
        const saved = await api<Organizer>("/api/organizer/me", { method: "PUT", body: JSON.stringify(organizer()) });
        onSaved({ organizer: (await saveLogo()) ?? saved });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const preview = { id: 0, ...organizer(), website: form.website.trim() || null, logoUrl: logoPreview };

  return (
    <div className="mx-auto max-w-2xl pt-12">
      <p className="eyebrow">For event organizers</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        {signup ? "Create an organizer account" : initial?.status === "APPROVED" ? "Edit your organizer profile" : "Edit your application"}
      </h1>
      {signup && (
        <p className="mt-2 text-muted">
          Sell tickets with live seat maps, QR check-in and automatic refunds. This is a separate account from a customer
          account; we review every organizer before they can sell.
        </p>
      )}

      <ol className="mt-8 flex gap-2" aria-label="Steps">
        {steps.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className="flex flex-1 flex-col gap-1.5">
            <span className={`h-1 rounded-full ${i <= step ? "bg-accent" : "bg-sunken"}`} />
            <span className={`text-xs ${i === step ? "font-medium text-fg" : "text-subtle"}`}>{i + 1}. {label}</span>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        {error && <Alert>{error}</Alert>}

        {section === "Account" && (
          <>
            <p className="text-sm text-muted">You&apos;ll sign in with these. They aren&apos;t shown to customers.</p>
            <Field label="Your name" required maxLength={60} value={form.accountName} onChange={set("accountName")} autoFocus autoComplete="name" />
            <Field label="Email" type="email" required maxLength={254} value={form.email} onChange={set("email")} autoComplete="email" />
            <PasswordField label="Password" required minLength={8} maxLength={72} value={form.password} onChange={set("password")}
              autoComplete="new-password" hint="At least 8 characters." />
          </>
        )}

        {section === "Organisation" && (
          <>
            <Field label="Organisation name" required maxLength={80} value={form.name} onChange={set("name")} autoFocus
              hint="Shown as “Hosted by …” on your events. It must be unique on Seatlock." />
            <div>
              <p className="mb-1.5 text-sm font-medium text-fg">Logo <span className="font-normal text-subtle">(optional)</span></p>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview (blob URL) or the current logo
                  <img src={logoPreview} alt="Logo preview" width={64} height={64} className="h-16 w-16 rounded-full border border-line bg-white object-cover" />
                ) : (
                  // Fallback: the same initials customers see when there's no logo; follows the name as it's typed.
                  <span aria-hidden className={`grid h-16 w-16 place-items-center rounded-full font-display text-xl font-semibold ${
                    initialsOf(form.name) ? "bg-accent-subtle text-accent-fg" : "border border-dashed border-line-strong text-xs font-normal text-subtle"}`}>
                    {initialsOf(form.name) || "Logo"}
                  </span>
                )}
                <div className="flex flex-wrap gap-2">
                  <label className={buttonClass("secondary", "sm", "cursor-pointer")}>
                    <UploadIcon /> {logoPreview ? "Change" : "Upload logo"}
                    <input type="file" accept={LOGO_TYPES.join(",")} className="sr-only" aria-label="Upload organisation logo"
                      onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {logoPreview && <Button type="button" variant="ghost" size="sm" onClick={clearLogo}>Remove</Button>}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-subtle">Square JPEG, PNG or WebP, up to 1 MB. Shown in a circle next to your name.</p>
            </div>
            <Field label="City" required maxLength={60} value={form.city} onChange={set("city")} hint="Where you're based." />
            <TextareaField label="About you" required maxLength={600} rows={5} value={form.about} onChange={set("about")}
              hint={`What kind of events you run and why people come back. ${form.about.trim().length}/600, at least 20.`} />
          </>
        )}

        {section === "Contact" && (
          <>
            <p className="text-sm text-muted">Customers use these to reach you about your events, so they&apos;re shown publicly.</p>
            <Field label="Contact email" type="email" required maxLength={120} value={form.contactEmail} onChange={set("contactEmail")} autoFocus autoComplete="email" />
            <div>
              <label htmlFor="org-phone" className="mb-1.5 block text-sm font-medium text-fg">Contact phone</label>
              <div className="flex gap-2">
                {/* Fixed-width wrapper: controlClass is w-full, which would otherwise stretch the code over the number box.
                    India only for now; more countries can be added to this list later. */}
                <div className="w-28 shrink-0">
                  <select aria-label="Country code" className={`${controlClass} h-11`} value="+91" onChange={() => undefined}>
                    <option value="+91">IN +91</option>
                  </select>
                </div>
                <div className="min-w-0 flex-1">
                  <input id="org-phone" type="tel" inputMode="numeric" autoComplete="tel-national" required maxLength={10}
                    placeholder="98765 43210" aria-describedby="org-phone-hint" className={`${controlClass} h-11 tabular`}
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
                </div>
              </div>
              <p id="org-phone-hint" className="mt-1.5 text-xs text-subtle">10-digit Indian mobile number. Only Indian numbers for now.</p>
            </div>
            <Field label="Website (optional)" type="url" maxLength={200} value={form.website} onChange={set("website")} placeholder="https://" />
          </>
        )}

        {section === "Review" && (
          <>
            <p className="text-sm text-muted">This is how customers will see you on your events.</p>
            <HostCard host={preview} />
            {signup && <p className="text-sm text-muted">Signing in as <span className="text-fg">{form.email}</span>. Until we approve you, your dashboard is read-only.</p>}
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
            {!last ? "Continue" : busy ? "Submitting…" : signup ? "Create account and apply" : initial?.status === "APPROVED" ? "Save profile" : "Submit again"}
          </Button>
        </div>
      </form>
    </div>
  );
}
