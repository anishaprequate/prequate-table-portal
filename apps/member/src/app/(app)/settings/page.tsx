import { redirect } from "next/navigation";
import { prisma } from "@prequate/db";
import { getCurrentUser } from "@/lib/session";
import { updateSettings } from "@/lib/actions/settings";
import { updateProfile } from "@/lib/actions/profile";
import { PageHero } from "@/components/page-hero";
import { formatSeatDisplay } from "@/lib/format";
import { PhotoPicker } from "@/components/photo-picker";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [categories, myInterests, appSettings] = await Promise.all([
    prisma.interestCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.memberInterest.findMany({ where: { memberId: user.id }, select: { categoryId: true } }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  const crisisText =
    appSettings?.crisisAccessText?.trim() ||
    "If something is pressing and cannot wait for the usual route, call or message Anisha directly. You will reach a person, not a queue.";
  const crisisContact = appSettings?.crisisAccessContact?.trim() || "Anisha, 9150582103";
  // Make the first phone number in the contact line tappable.
  const phoneMatch = crisisContact.match(/(?:\+?91[\s-]?)?(\d[\d\s-]{8,13}\d)/);
  const phoneDigits = phoneMatch ? phoneMatch[0].replace(/\D/g, "") : null;
  const telHref = phoneDigits ? `tel:${phoneDigits.length === 10 ? "+91" : "+"}${phoneDigits}` : null;
  const myInterestIds = new Set(myInterests.map((i) => i.categoryId));

  return (
    <div className="max-w-md">
      <PageHero title="Settings" />

      {searchParams.saved && (
        <p className="card mb-6 animate-fade-up bg-foil/5 px-3 py-2 text-sm text-ink">Saved.</p>
      )}

      <div className="card mb-8 p-5">
        <p className="mb-4 text-xs uppercase tracking-[0.28em] text-taupe">Profile</p>
        <form action={updateProfile} className="flex flex-col gap-6">
          <p className="-mt-2 text-xs text-taupe">Seat {formatSeatDisplay(user.seatNumber)}</p>

          <PhotoPicker photoUrl={user.photoUrl} initial={user.name.charAt(0)} />

          <label className="flex flex-col gap-1.5 text-sm">
            Name
            <input type="text" name="name" defaultValue={user.name} className="input-field" />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Seat type
            <input type="text" name="seatType" defaultValue={user.seatType ?? ""} className="input-field" />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Email
            <input type="email" name="email" defaultValue={user.email ?? ""} className="input-field" />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Bio
            <textarea name="bio" defaultValue={user.bio ?? ""} rows={4} className="input-field" />
          </label>

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1">Interests</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 rounded-md border border-taupe/25 px-3 py-1.5 text-sm text-ink transition-all duration-300 has-[:checked]:border-foil has-[:checked]:bg-foil/10"
                >
                  <input
                    type="checkbox"
                    name="interests"
                    value={category.id}
                    defaultChecked={myInterestIds.has(category.id)}
                    className="h-5 w-5 flex-shrink-0 accent-foil"
                  />
                  {category.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="btn-primary w-fit">
            Save
          </button>
        </form>
      </div>

      <form action={updateSettings} className="flex flex-col gap-8">
        <div className="card p-5">
          <p className="mb-4 text-xs uppercase tracking-[0.28em] text-taupe">Notifications</p>
          <div className="flex flex-col gap-5">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="emailHourReminders"
                defaultChecked={user.emailHourReminders}
                className="mt-0.5 h-5 w-5 flex-shrink-0 accent-foil"
              />
              <span>
                Email me 24 hours before The Hour
                <span className="block text-xs text-taupe">A reminder before each confirmed session.</span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="emailEventBlasts"
                defaultChecked={user.emailEventBlasts}
                className="mt-0.5 h-5 w-5 flex-shrink-0 accent-foil"
              />
              <span>
                Email me event updates and blasts
                <span className="block text-xs text-taupe">
                  Messages the team sends to everyone registered for an event.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="emailEventSurveys"
                defaultChecked={user.emailEventSurveys}
                className="mt-0.5 h-5 w-5 flex-shrink-0 accent-foil"
              />
              <span>
                Email me post-event surveys
                <span className="block text-xs text-taupe">
                  Sent a day after an event you attended, with one reminder.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="card p-5">
          <p className="mb-4 text-xs uppercase tracking-[0.28em] text-taupe">Privacy</p>
          <div className="flex flex-col gap-5">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="showInDirectory"
                defaultChecked={!user.directoryOptOut}
                className="mt-0.5 h-5 w-5 flex-shrink-0 accent-foil"
              />
              <span>
                Show me in the member directory
                <span className="block text-xs text-taupe">
                  Other members can see your name, seat type, and bio.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="allowPartnerMessages"
                defaultChecked={user.allowPartnerMessages}
                className="mt-0.5 h-5 w-5 flex-shrink-0 accent-foil"
              />
              <span>
                Let partners message me directly
                <span className="block text-xs text-taupe">
                  Your relationship manager can always reach you either way.
                </span>
              </span>
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary w-fit">
          Save
        </button>
      </form>

      <section className="mt-12 border-t border-taupe/12 pt-5" aria-labelledby="crisis-access">
        <p id="crisis-access" className="mb-1.5 text-[11px] uppercase tracking-[0.22em] text-taupe">
          Crisis access
        </p>
        <p className="text-xs leading-relaxed text-taupe">{crisisText}</p>
        <p className="mt-1.5 text-sm text-ink">
          {telHref ? (
            <a href={telHref} className="underline decoration-taupe/40 underline-offset-2">
              {crisisContact}
            </a>
          ) : (
            crisisContact
          )}
        </p>
      </section>
    </div>
  );
}
