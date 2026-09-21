import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant: primary, secondary, outline, ghost, or destructive. */
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  /** Button size: sm, md, or lg. */
  size?: "sm" | "md" | "lg";
  /** When true, shows a spinner and disables the button. */
  loading?: boolean;
}

/**
 * Reusable button component with variant styles, sizes, and loading state.
 * Automatically disabled when loading or the disabled prop is set.
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-sm",
    secondary:
      "bg-secondary text-white hover:bg-secondary/90 focus:ring-secondary",
    outline:
      "border-2 border-border text-foreground hover:bg-muted/10 focus:ring-primary",
    ghost: "text-muted hover:text-foreground hover:bg-muted/10 focus:ring-primary",
    destructive:
      "bg-destructive text-white hover:bg-destructive/90 focus:ring-destructive",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}
