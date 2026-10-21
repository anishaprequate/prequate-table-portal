export default function Loading() {
  return (
    <div className="max-w-2xl" aria-busy="true">
      <div className="skeleton mb-3 h-3 w-24" />
      <div className="skeleton mb-8 h-12 w-2/3" />
      <div className="flex flex-col gap-4">
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-20 w-full" />
      </div>
    </div>
  );
}
