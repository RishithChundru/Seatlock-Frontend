"use client";

import { useEffect, useState } from "react";
import { api, Organizer, refreshSession, useSession, when } from "@/lib/api";
import HostCard from "./HostCard";
import OrganizerWizard from "./OrganizerWizard";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { Alert, Skeleton } from "./ui/Feedback";
import { CheckIcon } from "./ui/Icons";

/** Organizer accounts: application status and the public profile customers see (edit / resubmit here). */
export default function OrganizationSettings() {
  const session = useSession();
  const [org, setOrg] = useState<Organizer | null | undefined>(undefined); // undefined = loading
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Organizer | undefined>("/api/organizer/me").then((o) => setOrg(o ?? null)).catch((e) => setError((e as Error).message));
  }, []);

  // Reviewed since this page was loaded: refresh the session so the nav and dashboard unlock (or lock) too.
  const known = session?.user.organizerStatus;
  useEffect(() => {
    if (org && known && org.status !== known) refreshSession();
  }, [org, known]);

  if (error) return <Alert>{error}</Alert>;
  if (org === undefined) return <Skeleton className="h-64" />;
  if (org === null) return <p className="text-sm text-muted">No organizer profile found. Contact Seatlock support.</p>;
  if (editing) {
    return <OrganizerWizard initial={org} onCancel={() => setEditing(false)}
      onSaved={({ organizer }) => { if (organizer) setOrg(organizer); setEditing(false); }} />;
  }

  const badge = { PENDING: <Badge tone="warning">Pending approval</Badge>, APPROVED: <Badge tone="success">Approved</Badge>,
    REJECTED: <Badge tone="danger">Needs changes</Badge>, SUSPENDED: <Badge tone="danger">Suspended</Badge> }[org.status];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{org.name}</p>{badge}</div>
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
        <p className="flex items-center gap-2 rounded-[var(--radius-md)] bg-success-subtle px-4 py-3 text-sm"><CheckIcon className="h-5 w-5 text-success" /> You can create events, sell tickets and add gate staff.</p>
      )}
      <p className="text-sm text-muted">This is what customers see on every event you host:</p>
      <HostCard host={org} />
      {org.status !== "SUSPENDED" && (
        <Button variant="secondary" onClick={() => setEditing(true)}>{org.status === "REJECTED" ? "Edit and resubmit" : "Edit public profile"}</Button>
      )}
    </div>
  );
}
