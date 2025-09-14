import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    hasCompletedOnboarding: boolean;
  }
  
  interface Session {
    user: User & DefaultSession["user"];
  }
}