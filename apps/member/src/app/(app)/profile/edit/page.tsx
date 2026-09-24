import { redirect } from "next/navigation";

// Profile editing is folded into Settings — this route stays only for old
// links/bookmarks.
export default function EditProfilePage() {
  redirect("/settings");
}
