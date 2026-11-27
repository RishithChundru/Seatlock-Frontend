"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import OrganizerWizard from "@/components/OrganizerWizard";
import { useSession } from "@/lib/api";

/** Public: organizer sign-up, separate from customer sign-up. Creates the account and its application together. */
export default function OrganizerSignupPage() {
  const session = useSession();
  const router = useRouter();

  if (session) {
    return (
      <div className="mx-auto max-w-md pt-24 text-center">
        <h1 className="font-display text-2xl font-semibold">You&apos;re signed in as {session.user.name}</h1>
        <p className="mt-2 text-muted">
          {session.user.role === "ORGANIZER"
            ? <>This is already an organizer account. <Link className="underline" href="/organizer">See its status</Link>.</>
            : "Organizer accounts are separate from customer accounts. Sign out first, then come back here to create one."}
        </p>
      </div>
    );
  }

  return (
    <>
      <OrganizerWizard signup onSaved={() => router.replace("/organizer")} />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an organizer account? <Link href="/login?next=/admin" className="font-medium text-accent-fg underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </>
  );
}
