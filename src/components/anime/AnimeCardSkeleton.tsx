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
        "group block cursor-pointer",
        "w-[45vw] max-w-[180px] sm:w-auto sm:max-w-[200px] md:max-w-[220px]", 
        className
      )}
    >
      <div
        className={cn(
          "bg-card rounded-lg shadow-lg flex flex-col overflow-hidden h-full animate-pulse" 
        )}
      >
        {/* Image Container */}
        <Skeleton className="relative w-full aspect-[2/3] rounded-t-lg" />
        
        {/* Text Content Area */}
        <div className="p-2.5 mt-auto space-y-2">
          <Skeleton className="h-4 w-3/4 rounded" /> 
          <Skeleton className="h-3 w-1/2 rounded" /> 
        </div>
      </div>
    </div>
  );
}
