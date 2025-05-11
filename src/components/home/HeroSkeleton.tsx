// src/components/home/HeroSkeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';
import Container from '@/components/layout/container';

export default function HeroSkeleton() {
  return (
    <section className="relative h-[65vh] md:h-[80vh] w-full flex items-end -mt-[calc(var(--header-height,4rem)+1px)] bg-muted/30 animate-pulse">
      <div className="absolute inset-0">
        <Skeleton className="w-full h-full opacity-50" /> {/* Banner Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
      </div>
      <Container className="relative z-10 pb-12 md:pb-20 text-foreground">
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-6 w-28 mb-2 rounded-md bg-muted-foreground/30" /> {/* Badge Placeholder */}
          <Skeleton className="h-12 md:h-16 w-4/5 rounded-md bg-muted-foreground/30" /> {/* Title Placeholder */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-3">
            <Skeleton className="h-5 w-20 rounded-md bg-muted-foreground/20" /> {/* Meta Item Placeholder */}
            <Skeleton className="h-5 w-24 rounded-md bg-muted-foreground/20" /> {/* Meta Item Placeholder */}
            <Skeleton className="h-5 w-16 rounded-md bg-muted-foreground/20" /> {/* Meta Item Placeholder */}
          </div>
          <Skeleton className="h-5 w-full rounded-md bg-muted-foreground/20" /> {/* Synopsis Line 1 Placeholder */}
          <Skeleton className="h-5 w-5/6 rounded-md bg-muted-foreground/20" /> {/* Synopsis Line 2 Placeholder */}
          <Skeleton className="h-5 w-3/4 mb-4 rounded-md bg-muted-foreground/20" /> {/* Synopsis Line 3 Placeholder */}
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <Skeleton className="h-12 w-36 rounded-full bg-primary/30" /> {/* Button Placeholder */}
            <Skeleton className="h-12 w-36 rounded-full bg-muted-foreground/20" /> {/* Button Placeholder */}
          </div>
        </div>
      </Container>
    </section>
  );
}
