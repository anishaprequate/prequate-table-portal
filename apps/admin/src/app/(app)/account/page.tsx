import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";
import { changeOwnPassword } from "@/lib/actions/auth";
import { ChangePasswordForm } from "@/components/password-form";
import { PageHero } from "@/components/page-hero";

export default async function AccountPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  // The shared Associate login is changed only by the owner, on Team logins.
  if (admin.role === "ADMIN_ASSOCIATE" || !admin.username) redirect("/");

  return (
    <div className="max-w-md">
      <PageHero title="Your" accent="password." subtitle={`Signed in as ${admin.username}.`} />
      <ChangePasswordForm username={admin.username} action={changeOwnPassword} />
    </div>
  );
}
