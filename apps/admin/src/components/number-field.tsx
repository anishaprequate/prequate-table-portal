"use client";

export function NumberField({
  name,
  defaultValue,
  placeholder,
  className,
}: {
  name: string;
  defaultValue?: number | string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={className}
      onInput={(e) => {
        e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "");
      }}
    />
  );
}
