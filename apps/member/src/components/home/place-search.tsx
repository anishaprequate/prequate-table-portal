"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface PickedPlace {
  placeId: string | null;
  name: string;
  address: string;
}

interface Suggestion {
  placeId: string;
  name: string;
  address: string;
}

// "Where would you like to go?" Suggestions appear as the member types, each
// with its name and area, so the exact outlet is chosen and not guessed.
//
// The text input never unmounts, so the phone keyboard stays up while typing.
// When suggestions are unavailable (no key set, a network failure) or the
// member taps "Can't find it", a branch field appears under the same input and
// the member types the place and its branch by hand.
export function PlaceSearch({
  value,
  onChange,
}: {
  value: PickedPlace | null;
  onChange: (place: PickedPlace | null) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [lookup, setLookup] = useState<"unknown" | "on" | "off">("unknown");
  const [manual, setManual] = useState(false);
  // One token per search, so Google bills it as a single session.
  const token = useRef("");
  const newToken = () => (token.current = crypto.randomUUID());

  const picked = Boolean(value?.placeId);
  const typing = manual || lookup === "off"; // hand-typed place and branch

  // Is lookup set up at all? Asked once, so the fallback shows from the start.
  useEffect(() => {
    newToken();
    let alive = true;
    fetch("/api/places")
      .then((r) => r.json())
      .then((d) => alive && setLookup(d.configured ? "on" : "off"))
      .catch(() => alive && setLookup("off"));
    return () => {
      alive = false;
    };
  }, []);

  // Suggestions, after a short pause in typing.
  useEffect(() => {
    if (picked || typing) return;
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}&t=${token.current}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok || data.configured === false || data.unavailable) {
          setLookup("off");
          setResults([]);
        } else {
          setResults(data.suggestions ?? []);
          setActive(-1);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setLookup("off");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 260);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, picked, typing]);

  // Hand-typed place and branch go up as they are typed.
  useEffect(() => {
    if (!typing) return;
    const name = query.trim();
    onChange(name || branch.trim() ? { placeId: null, name, address: branch.trim() } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing, query, branch]);

  function pick(s: Suggestion) {
    onChange({ placeId: s.placeId, name: s.name, address: s.address });
    setResults([]);
    newToken();
  }

  function change() {
    onChange(null);
    setQuery("");
    setBranch("");
    setManual(false);
  }

  // A chosen outlet: name and address, with a way to change it.
  if (picked && value) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-foil/40 bg-foil/5 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink">{value.name}</p>
          <p className="text-xs text-taupe">{value.address}</p>
        </div>
        <button type="button" onClick={change} className="btn-ghost tap flex-shrink-0 !px-2">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <label className="flex flex-col gap-1.5 text-sm">
          {typing ? "Restaurant or hotel" : "Where would you like to go?"}
          <input
            type="text"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (typing || !results.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && active >= 0 && results[active]) {
                e.preventDefault();
                pick(results[active]);
              }
            }}
            placeholder={typing ? "e.g. Taj West End" : "Start typing a restaurant or hotel"}
            className="input-field"
          />
        </label>

        {!typing && results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="mt-2 overflow-hidden rounded-lg border border-taupe/15 bg-bone shadow-md"
          >
            {results.map((s, i) => (
              <li key={s.placeId} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onClick={() => pick(s)}
                  className={`tap flex min-h-[52px] w-full flex-col items-start justify-center px-4 py-2 text-left transition-colors duration-200 ${
                    i === active ? "bg-foil/10" : "hover:bg-foil/5"
                  } ${i > 0 ? "border-t border-taupe/10" : ""}`}
                >
                  <span className="text-sm text-ink">{s.name}</span>
                  <span className="text-xs text-taupe">{s.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {typing ? (
        <label className="flex flex-col gap-1.5 text-sm">
          Which branch or area
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="e.g. Race Course Road, Bengaluru"
            className="input-field"
          />
          {lookup === "off" && (
            <span className="text-xs text-taupe">Suggestions are not available, so type the place and its branch.</span>
          )}
        </label>
      ) : (
        <div className="flex items-center justify-between gap-3 text-xs text-taupe">
          <span aria-live="polite">
            {loading ? "Searching…" : query.trim().length >= 3 && results.length === 0 ? "No match yet." : ""}
          </span>
          <button type="button" onClick={() => setManual(true)} className="btn-ghost tap !px-0">
            Can&apos;t find it? Type it in
          </button>
        </div>
      )}
    </div>
  );
}
