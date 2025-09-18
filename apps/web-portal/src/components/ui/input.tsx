import * as React from "react"
import { useId } from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  success?: boolean
  variant?: "default" | "filled" | "outlined" | "minimal"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, variant = "default", ...props }, ref) => {
    const variantClasses = {
      default: "border-input bg-background hover:bg-muted/50",
      filled: "border-transparent bg-muted hover:bg-muted/80 focus-visible:bg-background",
      outlined: "border-2 border-border bg-transparent hover:border-primary/50",
      minimal: "border-0 bg-transparent border-b-2 border-transparent hover:border-border focus-visible:border-primary"
    }

    // Use React's useId hook for deterministic ID generation
    const generatedId = useId()
    const inputId = props.id || `input-${generatedId}`

    return (
      <input
        id={inputId}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border bg-background px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:shadow-sm",
          variantClasses[variant],
          error && "border-destructive focus-visible:ring-destructive hover:border-destructive",
          success && "border-success focus-visible:ring-success hover:border-success",
          className
        )}
        ref={ref}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${inputId}-error` : success ? `${inputId}-success` : undefined}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }