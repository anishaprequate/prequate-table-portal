export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl" aria-busy="true">
      <div className="skeleton mb-8 h-4 w-40" />
      <div className="skeleton mx-auto mb-8 h-[18rem] w-[18rem] max-w-full !rounded-full" />
      <div className="skeleton mb-3 h-4 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  );
}
