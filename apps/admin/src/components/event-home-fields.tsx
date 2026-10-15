// The fields that feed the member Home: the dinner's question, who hosts (and
// is the only one to read replies), and the on-the-day details.
const input = "rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink";
const label = "text-xs uppercase tracking-wide text-grey";

export function EventHomeFields({
  partners,
  defaults,
}: {
  partners: { id: string; name: string }[];
  defaults?: {
    dinnerQuestion: string | null;
    hostPartnerId: string | null;
    mapUrl: string | null;
    dressCode: string | null;
    arrivalNote: string | null;
  };
}) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-md border border-grey/15 p-4">
      <legend className="px-1 text-xs uppercase tracking-wide text-grey">On the member Home</legend>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className={label}>Host partner</span>
        <select name="hostPartnerId" defaultValue={defaults?.hostPartnerId ?? ""} className={`${input} w-fit`}>
          <option value="">No host</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className={label}>The question (optional)</span>
        <textarea
          name="dinnerQuestion"
          rows={2}
          defaultValue={defaults?.dinnerQuestion ?? ""}
          placeholder="Tell us about a moment your business almost broke."
          className={input}
        />
        <span className="text-xs text-grey">
          Members reply privately. Only the host partner reads the replies. The question shows only when a host is set.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className={label}>Map link (optional)</span>
        <input type="url" name="mapUrl" defaultValue={defaults?.mapUrl ?? ""} placeholder="https://maps.google.com/..." className={input} />
        <span className="text-xs text-grey">If empty, members get a map search for the location.</span>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={label}>Dress</span>
          <input type="text" name="dressCode" defaultValue={defaults?.dressCode ?? ""} placeholder="Smart casual" className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={label}>Arrival contact</span>
          <input type="text" name="arrivalNote" defaultValue={defaults?.arrivalNote ?? ""} placeholder="Ask for Anisha, 9150582103" className={input} />
        </label>
      </div>
    </fieldset>
  );
}
