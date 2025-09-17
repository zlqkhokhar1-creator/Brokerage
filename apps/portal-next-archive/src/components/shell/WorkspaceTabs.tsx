"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Trading', href: '/trading' },
  { label: 'Markets', href: '/markets' },
  { label: 'Risk', href: '/risk-management' },
  { label: 'AI', href: '/ai-insights' },
];

export function WorkspaceTabs() {
  const pathname = usePathname();
  return (
    <div className="border-b border-border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
      <div className="px-3 lg:px-4 h-10 flex items-center gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + '/');
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 h-7 inline-flex items-center rounded-md text-sm whitespace-nowrap border transition-colors ${active ? 'bg-accent/20 text-accent border-accent/30' : 'border-transparent hover:bg-muted/50'}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}


