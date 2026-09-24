import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { updateSettings } from "@/lib/actions/settings";
import { updateProfile } from "@/lib/actions/profile";
import { PageHero } from "@/components/page-hero";
import { formatSeatDisplay } from "@/lib/format";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [categories, myInterests] = await Promise.all([
    prisma.interestCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.memberInterest.findMany({ where: { memberId: user.id }, select: { categoryId: true } }),
  ]);
  const myInterestIds = new Set(myInterests.map((i) => i.categoryId));

  return (
    <div className="max-w-md">
      <PageHero title="Settings" />

      {searchParams.saved && (
        <p className="mb-6 rounded-md bg-orange/10 px-3 py-2 text-sm text-ink">Saved.</p>
      )}

      <div className="mb-8 rounded-md border border-grey/15 p-4">
        <p className="mb-4 text-xs uppercase tracking-wide text-grey">Profile</p>
        <form action={updateProfile} className="flex flex-col gap-6">
          <p className="-mt-2 text-xs text-grey">Seat {formatSeatDisplay(user.seatNumber)}</p>

          <div className="flex items-center gap-4">
            {user.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoUrl}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange/10 font-display text-xl text-ink">
                {user.name.charAt(0)}
              </div>
            )}
            <label className="flex flex-col gap-1.5 text-sm">
              {user.photoUrl ? "Replace photo" : "Add a photo"}
              <input type="file" name="photo" accept="image/*" className="text-sm" />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            Name
            <input
              type="text"
              name="name"
              defaultValue={user.name}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Seat type
            <input
              type="text"
              name="seatType"
              defaultValue={user.seatType ?? ""}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Email
            <input
              type="email"
              name="email"
              defaultValue={user.email ?? ""}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Bio
            <textarea
              name="bio"
              defaultValue={user.bio ?? ""}
              rows={4}
              className="rounded-md border border-grey/30 bg-paper px-3 py-2 text-ink"
            />
          </label>

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1">Interests</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 rounded-md border border-grey/30 px-3 py-1.5 text-sm text-ink has-[:checked]:border-orange has-[:checked]:bg-orange/10"
                >
                  <input
                    type="checkbox"
                    name="interests"
                    value={category.id}
                    defaultChecked={myInterestIds.has(category.id)}
                    className="h-3.5 w-3.5 accent-orange"
                  />
                  {category.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Save
          </button>
        </form>
      </div>

      <form action={updateSettings} className="flex flex-col gap-8">
        <div className="rounded-md border border-grey/15 p-4">
          <p className="mb-4 text-xs uppercase tracking-wide text-grey">Notifications</p>
          <div className="flex flex-col gap-5">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="emailHourReminders"
                defaultChecked={user.emailHourReminders}
                className="mt-0.5 h-4 w-4 accent-orange"
              />
              <span>
                Email me 24 hours before The Hour
                <span className="block text-xs text-grey">A reminder before each confirmed session.</span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="emailEventBlasts"
                defaultChecked={user.emailEventBlasts}
                className="mt-0.5 h-4 w-4 accent-orange"
              />
              <span>
                Email me event updates and blasts
                <span className="block text-xs text-grey">
                  Messages the team sends to everyone registered for an event.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="emailEventSurveys"
                defaultChecked={user.emailEventSurveys}
                className="mt-0.5 h-4 w-4 accent-orange"
              />
              <span>
                Email me post-event surveys
                <span className="block text-xs text-grey">
                  Sent a day after an event you attended, with one reminder.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="rounded-md border border-grey/15 p-4">
          <p className="mb-4 text-xs uppercase tracking-wide text-grey">Privacy</p>
          <div className="flex flex-col gap-5">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="showInDirectory"
                defaultChecked={!user.directoryOptOut}
                className="mt-0.5 h-4 w-4 accent-orange"
              />
              <span>
                Show me in the member directory
                <span className="block text-xs text-grey">
                  Other members can see your name, seat type, and bio.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="allowPartnerMessages"
                defaultChecked={user.allowPartnerMessages}
                className="mt-0.5 h-4 w-4 accent-orange"
              />
              <span>
                Let partners message me directly
                <span className="block text-xs text-grey">
                  Your relationship manager can always reach you either way.
                </span>
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          Save
        </button>
      </form>
    </div>
  );
}
