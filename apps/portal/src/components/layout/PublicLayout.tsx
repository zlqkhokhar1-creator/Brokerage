import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface PublicLayoutProps {
  children: ReactNode;
}

const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 flex justify-between items-center bg-white dark:bg-gray-800 shadow-md">
        <NavLink to="/" className="text-2xl font-bold text-gray-800 dark:text-white">
          InvestPro
        </NavLink>
        <nav className="space-x-4">
          <NavLink to="/login" className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-500">
            Login
          </NavLink>
          <NavLink to="/signup" className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600">
            Sign Up
          </NavLink>
        </nav>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default PublicLayout;
