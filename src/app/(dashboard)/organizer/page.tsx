import { redirect } from "next/navigation";

/** The organizer profile now lives in account settings; old links (emails, bookmarks) land there. */
export default function OrganizerPage() {
  redirect("/account#organization");
}
