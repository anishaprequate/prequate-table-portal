"use client";

import { useState } from "react";
import { ConciergeIcon } from "@/components/concierge-icon";

type Category = { id: string; category: string; group: string; examples: string };

// Categories are genuinely multi-select (submitConciergeRequest creates one
// request per checked category), so this can't become radio buttons. What
// it fixes instead: only one category's "which of these sound right?"
// panel stays visually expanded at a time — checking a different category
// (or "Something else") collapses the previous panel without unchecking it.
export function ConciergeCategoryPicker({ groups, categories }: { groups: string[]; categories: Category[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleToggle(id: string, checked: boolean) {
    if (checked) {
      setExpandedId(id);
    } else if (expandedId === id) {
      setExpandedId(null);
    }
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group}>
          <p className="mb-3 text-xs uppercase tracking-wide text-grey">{group}</p>
          <div className="flex flex-col gap-3">
            {categories
              .filter((c) => c.group === group)
              .map((category) => {
                const examples = JSON.parse(category.examples) as string[];
                return (
                  <div key={category.id}>
                    <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition has-[:checked]:border-transparent has-[:checked]:bg-ink has-[:checked]:text-paper">
                      <input
                        type="checkbox"
                        name="categoryId"
                        value={category.id}
                        className="hidden"
                        onChange={(e) => handleToggle(category.id, e.target.checked)}
                      />
                      <ConciergeIcon category={category.category} className="h-3.5 w-3.5 flex-shrink-0" />
                      {category.category}
                    </label>
                    {expandedId === category.id && (
                      <div className="mt-3">
                        <div className="rounded-md border border-grey/15 bg-paper p-4">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-deep-orange">
                            {category.category}
                          </p>
                          <p className="mb-3 font-display text-lg italic leading-tight text-ink">
                            Which of these sound right?
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {examples.map((example) => (
                              <label
                                key={example}
                                className="cursor-pointer rounded-full border border-grey/30 px-3 py-1.5 text-xs text-ink transition has-[:checked]:border-orange has-[:checked]:bg-orange/10 has-[:checked]:font-medium has-[:checked]:text-deep-orange"
                              >
                                <input
                                  type="checkbox"
                                  name={`subitems.${category.id}`}
                                  value={example}
                                  className="hidden"
                                />
                                {example}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      <div>
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-grey/30 px-4 py-2 text-sm font-medium text-ink transition has-[:checked]:border-transparent has-[:checked]:bg-ink has-[:checked]:text-paper">
          <input
            type="checkbox"
            name="categoryId"
            value="other"
            className="hidden"
            onChange={(e) => handleToggle("other", e.target.checked)}
          />
          Something else
        </label>
        {expandedId === "other" && (
          <div className="mt-3">
            <div className="rounded-md border border-grey/15 bg-paper p-4">
              <p className="mb-3 font-display text-lg italic leading-tight text-ink">Tell us more</p>
              <textarea
                name="customText"
                rows={2}
                placeholder="Describe what you need."
                className="w-full rounded-md border border-grey/30 bg-paper px-3 py-2 text-sm text-ink"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
