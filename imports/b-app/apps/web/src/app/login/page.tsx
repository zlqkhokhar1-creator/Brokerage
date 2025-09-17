"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, TrendingUp, Loader2 } from "lucide-react";

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
  const search = useSearchParams();
  const isDialog = search?.get("dialog") === "true";

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
    <div className={`min-h-screen ${isDialog ? 'bg-transparent' : 'bg-gradient-to-br from-background via-background to-accent/20'} flex flex-col items-center px-4 py-8`}>
      <header className="w-full max-w-md mx-auto text-center py-6">
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mt-3">Welcome Back</h1>
        <p className="text-muted-foreground mt-1">Sign in to your InvestPro account</p>
      </header>
      <main className={`w-full max-w-md mx-auto ${isDialog ? 'bg-card' : 'bg-card/50'} backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-xl border border-border/50`}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={isLoading} className="pl-10 h-11" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required disabled={isLoading} className="pl-10 pr-10 h-11" />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-11 px-3" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
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

          <Button type="submit" disabled={isLoading} className="w-full h-11 text-base font-medium">
            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...</>) : 'Sign In'}
          </Button>
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
    </div>
  );
}