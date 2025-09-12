import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:shadow-lg hover:-translate-y-0.5",
        outline:
          "border border-input bg-background/50 shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md hover:border-primary/50 backdrop-blur-sm",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md hover:-translate-y-0.5",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-sm transition-all duration-200",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        gradient: "gradient-primary text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        trading: "gradient-trading text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        success: "bg-verdant-green text-white shadow-md hover:bg-verdant-green/90 hover:shadow-lg hover:-translate-y-0.5",
        warning: "bg-neon-yellow text-deep-ocean shadow-md hover:bg-neon-yellow/90 hover:shadow-lg hover:-translate-y-0.5",
        coral: "bg-coral text-white shadow-md hover:bg-coral/90 hover:shadow-lg hover:-translate-y-0.5",
        professional: "bg-deep-ocean text-soft-cream shadow-md hover:bg-deep-ocean/90 hover:shadow-lg hover:-translate-y-0.5",
        glass: "bg-white/10 text-foreground backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20 hover:shadow-xl hover:-translate-y-0.5",
        glow: "bg-white text-primary shadow-lg hover:shadow-xl hover:-translate-y-0.5 animate-pulse hover:animate-none focus:ring-2 focus:ring-white/50",
        pulse: "bg-transparent text-white border-2 border-white hover:bg-white hover:text-primary hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 hover:scale-105",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base font-semibold",
        xl: "h-14 rounded-xl px-10 text-lg font-semibold",
        icon: "h-9 w-9 rounded-lg",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-11 w-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
