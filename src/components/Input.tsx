import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional label displayed above the input. */
  label?: string;
  /** Error message displayed below the input in destructive color. */
  error?: string;
}

/** Form input with optional label and error message display. */
export default function Input({
  label,
  error,
  className,
  ...props
}: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full px-3 py-2 rounded-lg border border-border bg-white text-foreground text-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          "placeholder:text-muted",
          error && "border-destructive focus:ring-destructive/20 focus:border-destructive",
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
