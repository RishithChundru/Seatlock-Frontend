"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, PendingInvite, refreshSession, when } from "@/lib/api";
import Button from "./ui/Button";
import { UsersIcon } from "./ui/Icons";

/**
 * A customer whose email was invited as gate staff can answer here, no email needed. Accepting turns this
 * account into a staff account for that organizer; declining keeps it a customer account.
 */
export default function InviteBanner() {
  const router = useRouter();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api<PendingInvite[]>("/api/account/invites").then(setInvites).catch(() => setInvites([])); }, []);
  if (invites.length === 0) return null;

  const answer = async (i: PendingInvite, accept: boolean) => {
    setBusy(i.id);
    setError(null);
    try {
      await api(`/api/account/invites/${i.id}/${accept ? "accept" : "decline"}`, { method: "POST" });
      if (accept) {
        await refreshSession(); // new access token with the STAFF role
        router.replace("/admin/checkin");
        return;
      }
      setInvites((list) => list.filter((x) => x.id !== i.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-6 space-y-3">
      {invites.map((i) => (
        <section key={i.id} aria-label={`Invite from ${i.organizerName}`}
          className="flex flex-col gap-4 rounded-[var(--card-radius)] border border-[var(--sl-focus)] bg-[var(--card-bg)] p-5 shadow-[0_0_0_3px_var(--sl-accent-subtle)] sm:flex-row sm:items-center">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sunken text-accent-fg"><UsersIcon width={20} height={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{i.organizerName} invited you to join their gate staff</p>
            <p className="mt-0.5 text-sm text-muted">
              Accepting turns this account into a gate staff account: you&apos;ll scan tickets at their events instead of booking.
              The invite is open until {when(i.expiresAt, { day: "numeric", month: "short" })}.
            </p>
            {error && busy === null && <p className="mt-1 text-sm text-danger">{error}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => answer(i, false)} disabled={busy !== null}>Decline</Button>
            <Button onClick={() => answer(i, true)} disabled={busy !== null}>{busy === i.id ? "Joining…" : "Accept"}</Button>
          </div>
        </section>
      ))}
    </div>
  );
}
