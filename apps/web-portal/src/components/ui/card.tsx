import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "elevated" | "subtle" | "outlined" | "glass" | "gradient"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantClasses = {
    default: "bg-card text-card-foreground shadow-sm border border-border hover:shadow-md transition-all duration-200",
    elevated: "bg-card text-card-foreground shadow-lg border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-200",
    subtle: "bg-muted/50 text-foreground shadow-sm border border-border/50 backdrop-blur-sm",
    outlined: "bg-transparent text-foreground border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200",
    glass: "bg-background/80 text-foreground shadow-lg border border-border/50 backdrop-blur-xl hover:bg-background/90 transition-all duration-200",
    gradient: "bg-gradient-to-br from-primary/10 via-primary/5 to-background text-foreground shadow-md border border-primary/20 hover:shadow-lg hover:shadow-primary/10 transition-all duration-200"
  }

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl transition-all duration-200",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }