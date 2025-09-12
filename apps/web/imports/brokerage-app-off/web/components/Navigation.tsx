import { ChartBarIcon, HomeIcon, CurrencyDollarIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface p-4 md:left-0 md:top-0 md:bottom-0 md:w-64 md:flex md:flex-col">
      <div className="flex justify-between md:flex-col md:h-full">
        <Link href="/" className="flex items-center space-x-2 text-white hover:text-brand">
          <HomeIcon className="h-6 w-6" />
          <span className="hidden md:inline">Dashboard</span>
        </Link>
        
        <Link href="/trading" className="flex items-center space-x-2 text-white hover:text-brand">
          <ChartBarIcon className="h-6 w-6" />
          <span className="hidden md:inline">Trading</span>
        </Link>
        
        <Link href="/portfolio" className="flex items-center space-x-2 text-white hover:text-brand">
          <CurrencyDollarIcon className="h-6 w-6" />
          <span className="hidden md:inline">Portfolio</span>
        </Link>
        
        <Link href="/account" className="flex items-center space-x-2 text-white hover:text-brand">
          <UserCircleIcon className="h-6 w-6" />
          <span className="hidden md:inline">Account</span>
        </Link>
      </div>
    </nav>
  );
}
