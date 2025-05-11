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
        "w-[45vw] max-w-[180px] sm:w-auto sm:max-w-[200px] md:max-w-[220px]",
        "bg-card rounded-lg shadow-md flex flex-col overflow-hidden animate-pulse", 
        className
      )}
    >
      {/* Image Placeholder */}
      <Skeleton className="relative w-full aspect-[2/3] rounded-t-lg" />
      
      {/* Text Content Placeholder */}
      <div className="p-2.5 space-y-1.5 flex-grow flex flex-col justify-end">
        {/* Title Placeholder */}
        <Skeleton className="h-5 w-3/4 rounded" /> 
        {/* Optional: Badges or secondary info placeholder */}
        <div className="flex items-center justify-between mt-1">
            <Skeleton className="h-3 w-1/4 rounded" /> 
            <Skeleton className="h-3 w-1/4 rounded" /> 
        </div>
      </div>
    </div>
  );
}
