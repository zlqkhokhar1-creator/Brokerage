import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-black text-white hover:bg-zinc-800 focus:ring-black"
      : "bg-white text-black border border-zinc-300 hover:bg-zinc-50 focus:ring-zinc-400";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
