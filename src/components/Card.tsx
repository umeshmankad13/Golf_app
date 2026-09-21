import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** When true, applies hover shadow and border transition effects. */
  hover?: boolean;
}

/** Card container with optional hover animation effect. */
export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border shadow-sm",
        hover && "hover:shadow-md hover:border-primary/20 transition-all duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Card header section with bottom border separator. */
export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-4 border-b border-border", className)}>
      {children}
    </div>
  );
}

/** Card body section for main content. */
export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}

/** Card footer section with top border separator. */
export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-4 border-t border-border", className)}>
      {children}
    </div>
  );
}
