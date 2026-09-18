import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:px-8" aria-label="Loading issues">
    <Skeleton className="h-9 w-40" /><Skeleton className="h-10 w-full" />
    <Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
  </main>;
}
