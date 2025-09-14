"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Set a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutReached(true);
    }, 3000); // 3 second timeout

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading && !timeoutReached) return; // Still loading and timeout not reached

    if (!user) {
      router.replace('/login');
    } else if (user.hasCompletedOnboarding === true) {
      router.replace('/dashboard');
    } else {
      router.replace('/onboarding');
    }
  }, [user, loading, router, timeoutReached]);

  // If loading and timeout not reached, show spinner
  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  // If timeout reached, redirect to login
  if (timeoutReached && !user) {
    router.replace('/login');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  // If somehow both conditions false, show loading
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
    </div>
  );
}
