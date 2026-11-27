"use client";

import { AccountSettings } from "@/components/ProfileMenu";

/** Same settings as the account modal, for direct links. */
export default function AccountPage() {
  return (
    <div className="max-w-xl">
      <p className="eyebrow">Account</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Account settings</h1>
      <div className="mt-6 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <AccountSettings />
      </div>
    </div>
  );
}
