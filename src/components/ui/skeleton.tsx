import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50", className)} // Changed from bg-muted to bg-muted/50
      {...props}
    />
  )
}

export { Skeleton }

