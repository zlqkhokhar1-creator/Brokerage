"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(email, password, rememberMe);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      toast({
        title: "Login failed",
        description: err.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#232526] via-[#414345] to-[#ff512f] flex flex-col items-center px-4 py-8">
      <header className="w-full max-w-md mx-auto text-center py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-2 animate-fade-in">
          Login
        </h1>
        <p className="text-lg md:text-xl text-[#ff512f] font-medium mb-6 animate-fade-in-delay">
          Access your account securely.
        </p>
      </header>
      <main className="w-full max-w-md mx-auto bg-white/20 backdrop-blur-lg rounded-xl p-8 shadow-xl border border-white/30 animate-fade-in-delay">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
              className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526] border border-gray-300 focus:ring-2 focus:ring-[#ff512f] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                className="w-full mb-4 px-4 py-2 rounded bg-white/80 text-[#232526] border border-gray-300 focus:ring-2 focus:ring-[#ff512f] focus:outline-none"
              />
              <button
                type="button"
                className="absolute right-0 top-0 h-full px-3 py-2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 text-[#ff512f] border-gray-300 rounded focus:ring-[#ff512f] focus:outline-none"
              />
              <label htmlFor="remember" className="text-sm text-gray-700">
                Remember me
              </label>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm text-[#ff512f] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-[#ff512f] text-white rounded font-bold hover:bg-[#232526] transition-all"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-700">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-[#ff512f] hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </main>
      <footer className="w-full max-w-md mx-auto text-center py-8 mt-16 text-white/70 animate-fade-in-delay">
        &copy; {new Date().getFullYear()} InvestPro. All rights reserved.
      </footer>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fade-in { animation: fade-in 1s ease-out; }
        .animate-fade-in-delay { animation: fade-in 1.5s ease-out; }
      `}</style>
    </div>
  );
}