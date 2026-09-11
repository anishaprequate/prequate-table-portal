import { redirect } from "next/navigation";
import { getCurrentAdmin, canView } from "@/lib/session";
import { BackLink } from "@/components/back-link";
import { CheckInKiosk } from "@/components/checkin-kiosk";

export default async function HourCheckInPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canView(admin.role)) redirect("/bookings");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-center font-display text-3xl italic leading-tight text-ink">The Hour</h1>
      <p className="mb-4 text-center text-sm text-grey">Session check-in</p>

      <CheckInKiosk mode="hour" />

      <div className="flex justify-center">
        <BackLink href="/bookings" />
      </div>
    </div>
  );
}
