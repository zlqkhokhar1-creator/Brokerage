"use client";
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error?.message || "Unknown error"}</p>
    </div>
  );
}



