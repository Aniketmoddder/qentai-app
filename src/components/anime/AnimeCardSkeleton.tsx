// src/components/anime/AnimeCardSkeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AnimeCardSkeletonProps {
  className?: string;
}

export default function AnimeCardSkeleton({ className }: AnimeCardSkeletonProps) {
  return (
    <div
      className={cn(
        "w-[45vw] max-w-[180px] sm:w-auto sm:max-w-[200px] md:max-w-[220px]", // Responsive width matching AnimeCard
        "bg-card rounded-lg shadow-lg flex flex-col overflow-hidden animate-pulse", // Added animate-pulse here
        className
      )}
    >
      {/* Image Placeholder */}
      <Skeleton className="relative w-full aspect-[2/3] rounded-t-lg" />
      
      {/* Text Content Placeholder */}
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center">
          <Skeleton className="w-2 h-2 rounded-full mr-2 shrink-0" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
        {/* Optional: Small line for year or type below title if needed */}
        {/* <Skeleton className="h-3 w-1/2 rounded" /> */}
      </div>
    </div>
  );
}
