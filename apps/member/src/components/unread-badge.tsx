export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex h-5 min-w-[1.25rem] flex-shrink-0 items-center justify-center rounded-full bg-deep-orange px-1 text-[10px] font-medium text-paper">
      {count}
    </span>
  );
}
