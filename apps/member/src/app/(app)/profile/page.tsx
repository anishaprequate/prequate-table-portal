import { redirect } from "next/navigation";

// Profile is folded into Settings — this route stays only for old
// links/bookmarks.
export default function ProfilePage() {
  redirect("/settings");
}
