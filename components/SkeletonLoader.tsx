export function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-40 md:w-48">
      <div className="aspect-video skeleton rounded-lg" />
      <div className="mt-2 h-3 skeleton rounded w-3/4" />
      <div className="mt-1.5 h-2.5 skeleton rounded w-1/2" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="mb-10">
      <div className="h-5 skeleton rounded w-36 mb-3 mx-4 md:mx-10" />
      <div className="flex gap-3 px-4 md:px-10 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="h-screen min-h-[580px] max-h-[900px] skeleton flex items-end pb-40 px-16">
      <div className="max-w-lg space-y-4">
        <div className="h-3 bg-gray-700 rounded w-24" />
        <div className="h-16 bg-gray-700 rounded w-80" />
        <div className="h-3 bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-700 rounded w-3/4" />
        <div className="flex gap-3 pt-2">
          <div className="h-11 bg-gray-700 rounded-lg w-28" />
          <div className="h-11 bg-gray-700 rounded-lg w-28" />
        </div>
      </div>
    </div>
  );
}
