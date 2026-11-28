"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, PendingInvite, refreshSession, useSession, when } from "@/lib/api";
import { flash } from "./FlashToast";
import Button from "./ui/Button";
import { Skeleton } from "./ui/Feedback";
import { UsersIcon } from "./ui/Icons";

// Checked once per signed-in customer per page load, so moving between pages doesn't re-ask the API.
let cache: { userId: number; invites: PendingInvite[] } | null = null;

/**
 * A customer whose email was invited as gate staff must answer before using the app: Accept turns the account
 * into a staff account for that organizer, Decline keeps it a customer account. No invite: straight through.
 */
export default function InviteGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const userId = session?.user.id ?? 0;
  const [invites, setInvites] = useState<PendingInvite[] | null>(cache?.userId === userId ? cache.invites : null);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache?.userId === userId) return;
    api<PendingInvite[]>("/api/account/invites")
      .catch(() => [] as PendingInvite[]) // can't check: don't lock the customer out
      .then((list) => { cache = { userId, invites: list }; setInvites(list); });
  }, [userId]);

  if (invites === null) return <div className="mx-auto max-w-lg pt-16"><Skeleton className="h-64" /></div>;
  if (invites.length === 0) return <>{children}</>;

  const invite = invites[0];
  const answer = async (accept: boolean) => {
    setBusy(accept ? "accept" : "decline");
    setError(null);
    try {
      await api(`/api/account/invites/${invite.id}/${accept ? "accept" : "decline"}`, { method: "POST" });
      if (accept) {
        cache = null;
        await refreshSession(); // new access token with the STAFF role
        flash(`You joined ${invite.organizerName} as gate staff.`);
        router.replace("/admin/checkin");
        return;
      }
      const rest = invites.slice(1);
      cache = { userId, invites: rest };
      setInvites(rest);
      if (!rest.length) flash("Invite declined. Your customer account is ready to use.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg pt-8 sm:pt-16">
      <section aria-labelledby="invite-h" className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center shadow-[var(--card-shadow)] sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sunken text-accent-fg"><UsersIcon width={26} height={26} /></span>
        <p className="eyebrow mt-5">Before you continue</p>
        <h1 id="invite-h" className="mt-2 font-display text-2xl font-bold tracking-tight">{invite.organizerName} invited you to join their gate staff</h1>
        <p className="mt-3 text-muted">
          <span className="font-medium text-fg">Accept</span> to turn this account into a gate staff account: you&apos;ll scan tickets at their
          events and won&apos;t book seats. <span className="font-medium text-fg">Decline</span> to keep using Seatlock as a customer.
        </p>
        <p className="mt-2 text-sm text-subtle">Invite open until {when(invite.expiresAt, { day: "numeric", month: "short" })}.</p>
        {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" size="lg" onClick={() => answer(false)} disabled={busy !== null}>{busy === "decline" ? "Declining…" : "Decline"}</Button>
          <Button size="lg" onClick={() => answer(true)} disabled={busy !== null}>{busy === "accept" ? "Joining…" : "Accept and join"}</Button>
        </div>
      </section>
    </div>
  );
}
