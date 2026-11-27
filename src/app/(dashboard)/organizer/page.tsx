"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Organizer, refreshSession, useSession, when } from "@/lib/api";
import HostCard from "@/components/HostCard";
import OrganizerWizard from "@/components/OrganizerWizard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Alert, Skeleton } from "@/components/ui/Feedback";
import { CheckIcon } from "@/components/ui/Icons";

/** An organizer account's application status and public profile (edit / resubmit from here). */
export default function OrganizerPage() {
  const session = useSession();
  const [org, setOrg] = useState<Organizer | null | undefined>(undefined); // undefined = loading
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = session?.user.role;

  useEffect(() => {
    if (role !== "ORGANIZER") return;
    api<Organizer | undefined>("/api/organizer/me").then((o) => setOrg(o ?? null)).catch((e) => setError((e as Error).message));
  }, [role]);

  // Reviewed since this page was loaded: refresh the session so the nav and dashboard unlock (or lock) too.
  const known = session?.user.organizerStatus;
  useEffect(() => {
    if (org && known && org.status !== known) refreshSession();
  }, [org, known]);

  if (!session) return null; // the route guard sends signed-out visitors to sign in
  if (role === "ADMIN") return <Notice title="You're the super admin">Review organizer requests on the <Link className="underline" href="/admin/organizers">Organizers</Link> page.</Notice>;
  if (role === "STAFF") return <Notice title="You're gate staff">Staff accounts only scan tickets for their organizer.</Notice>;
  if (role === "USER") {
    return (
      <Notice title="This is a customer account">
        Organizers use a separate account. Sign out, then <Link className="underline" href="/organizer/signup">create an organizer account</Link>.
      </Notice>
    );
  }
  if (error) return <div className="mx-auto max-w-md pt-24"><Alert>{error}</Alert></div>;
  if (org === undefined) return <div className="mx-auto max-w-2xl pt-16"><Skeleton className="h-96" /></div>;
  if (org === null) return <Notice title="No application found">Contact Seatlock support.</Notice>;

  if (editing) {
    return <OrganizerWizard initial={org} onCancel={() => setEditing(false)}
      onSaved={({ organizer }) => { if (organizer) setOrg(organizer); setEditing(false); }} />;
  }

  const badge = { PENDING: <Badge tone="warning">Pending approval</Badge>, APPROVED: <Badge tone="success">Approved</Badge>,
    REJECTED: <Badge tone="danger">Needs changes</Badge>, SUSPENDED: <Badge tone="danger">Suspended</Badge> }[org.status];
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">Organizer account</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{org.name}</h1>
        {badge}
      </div>

      <div className="mt-6 space-y-4">
        {org.status === "PENDING" && (
          <Alert tone="warning">
            <span className="font-medium">Waiting for approval.</span> We&apos;ll email <span className="font-medium">{org.accountEmail}</span> once
            it&apos;s reviewed (you applied on {when(org.createdAt, { day: "numeric", month: "short" })}). Until then your dashboard is read-only.
          </Alert>
        )}
        {org.status === "REJECTED" && (
          <Alert tone="warning"><span className="font-medium">Your application needs changes.</span> {org.reviewNote} Edit it below and submit again.</Alert>
        )}
        {org.status === "SUSPENDED" && (
          <Alert>Your organizer account is suspended{org.reviewNote ? `: ${org.reviewNote}` : "."} Your dashboard is read-only. Contact Seatlock support to sort it out.</Alert>
        )}
        {org.status === "APPROVED" && (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--card-radius)] border border-success/30 bg-success-subtle px-5 py-4">
            <CheckIcon className="h-5 w-5 text-success" />
            <p className="flex-1 text-sm">You can create events, sell tickets and add gate staff.</p>
          </div>
        )}
        <Button href="/admin" size="sm" variant={org.status === "APPROVED" ? "primary" : "secondary"}>Open dashboard</Button>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">Your public profile</h2>
      <p className="mt-1 text-sm text-muted">This is what customers see on every event you host.</p>
      <HostCard host={org} className="mt-4" />
      {org.status !== "SUSPENDED" && (
        <Button variant="secondary" className="mt-5" onClick={() => setEditing(true)}>{org.status === "REJECTED" ? "Edit and resubmit" : "Edit profile"}</Button>
      )}
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md pt-24 text-center">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">{children}</p>
    </div>
  );
}
