"use client";

import { useSession } from "@/lib/api";

/** Who is using the dashboard, and what they may do there. The API enforces the same rules. */
export function useDashboardRole() {
  const session = useSession();
  const role = session?.user.role;
  const status = session?.user.organizerStatus;
  const superAdmin = role === "ADMIN";
  const organizer = role === "ORGANIZER";
  const staff = role === "STAFF";
  const pendingOrganizer = organizer && status !== "APPROVED"; // pending, needs changes or suspended
  return {
    session, role, status, superAdmin, organizer, staff, pendingOrganizer,
    manager: superAdmin || organizer || staff,
    readOnly: staff || pendingOrganizer, // can look, can't change
    canCreate: superAdmin || (organizer && !pendingOrganizer),
    canScan: superAdmin || staff || (organizer && !pendingOrganizer),
  };
}
