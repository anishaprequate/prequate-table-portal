import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { updateProfile } from "@/lib/actions/profile";
import { BackLink } from "@/components/back-link";
import { formatSeatDisplay } from "@/lib/format";

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-md">
      <h1 className="mb-1 font-display text-4xl italic leading-tight text-ink sm:text-5xl">
        Edit profile
      </h1>
      <p className="mb-10 text-sm text-grey">Seat {formatSeatDisplay(user.seatNumber)}</p>

      <form action={updateProfile} className="flex flex-col gap-6">
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

        <button
          type="submit"
          className="w-fit rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          Save
        </button>
      </form>

      <BackLink href="/profile" />
    </div>
  );
}
