"use client";

import { useState } from "react";

export interface SlotOption {
  startTime: string;
  endTime: string;
  day: string;
  label: string;
}

export function SlotPicker({ slots }: { slots: SlotOption[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const days = Array.from(new Set(slots.map((s) => s.day)));
  const selectedSlot = slots.find((s) => s.startTime === selected);

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <div key={day}>
          <p className="mb-2 text-xs text-taupe">{day}</p>
          <div className="flex flex-wrap gap-2">
            {slots
              .filter((s) => s.day === day)
              .map((slot) => (
                <button
                  type="button"
                  key={slot.startTime}
                  onClick={() => setSelected(slot.startTime)}
                  className={`tap min-h-[44px] rounded-md border px-3 py-2 text-sm shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${
                    selected === slot.startTime
                      ? "border-foil bg-foil/10 shadow-md"
                      : "border-taupe/25 hover:border-foil/50"
                  }`}
                >
                  {slot.label}
                </button>
              ))}
          </div>
        </div>
      ))}
      <input type="hidden" name="startTime" value={selectedSlot?.startTime ?? ""} readOnly />
      <input type="hidden" name="endTime" value={selectedSlot?.endTime ?? ""} readOnly />
    </div>
  );
}
