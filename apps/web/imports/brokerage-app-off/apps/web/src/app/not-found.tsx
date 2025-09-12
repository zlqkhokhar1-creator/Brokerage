import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">Sorry, we couldn’t find that page.</p>
      <Link className="px-4 py-2 rounded-md bg-primary text-primary-foreground" href="/">Go home</Link>
    </div>
  );
}



