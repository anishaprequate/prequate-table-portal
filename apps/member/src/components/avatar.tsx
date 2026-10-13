const SIZES = {
  sm: { box: "h-8 w-8", text: "text-xs" },
  md: { box: "h-12 w-12", text: "text-base" },
  lg: { box: "h-16 w-16", text: "text-xl" },
} as const;

export function Avatar({
  name,
  photoUrl,
  size = "md",
  className = "",
}: {
  name: string;
  photoUrl: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { box, text } = SIZES[size];
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt=""
      className={`${box} flex-shrink-0 rounded-full object-cover ring-1 ring-taupe/10 transition-all duration-300 ease-out hover:ring-2 hover:ring-foil/50 ${className}`}
      draggable={false}
    />
  ) : (
    <div
      className={`flex ${box} flex-shrink-0 items-center justify-center rounded-full bg-foil/10 font-display ${text} text-ink ring-1 ring-taupe/10 transition-all duration-300 ease-out hover:ring-2 hover:ring-foil/50 ${className}`}
    >
      {name.charAt(0)}
    </div>
  );
}
